import "server-only";
import { withTenant } from "@/lib/db";
import { confirmsPixCheckout } from "./pix-state";

type AsaasCustomer = { id: string };
type AsaasPayment = {
  id: string;
  status: string;
  value: number;
  externalReference?: string | null;
};
type AsaasList<T> = { data?: T[] };

function apiBase() {
  return process.env.ASAAS_ENVIRONMENT === "production"
    ? "https://api.asaas.com/v3"
    : "https://api-sandbox.asaas.com/v3";
}

function apiKey() {
  const key = process.env.ASAAS_API_KEY;
  if (!key) throw new Error("Pagamentos Pix ainda não estão configurados.");
  return key;
}

async function asaas<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiBase()}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      access_token: apiKey(),
      "Content-Type": "application/json",
      ...init.headers,
    },
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error("Não foi possível comunicar com o provedor Pix.");
  return (await response.json()) as T;
}

export async function createPixCharge(input: {
  checkoutId: string;
  userId: string;
  name: string;
  email: string;
  moduleTitle: string;
  amountCents: number;
}) {
  const matches = await asaas<AsaasList<AsaasCustomer>>(`/customers?email=${encodeURIComponent(input.email)}&limit=1`);
  const customer = matches.data?.[0] ?? await asaas<AsaasCustomer>("/customers", {
    method: "POST",
    body: JSON.stringify({ name: input.name, email: input.email, externalReference: input.userId }),
  });
  const dueDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const payment = await asaas<AsaasPayment>("/payments", {
    method: "POST",
    body: JSON.stringify({
      customer: customer.id,
      billingType: "PIX",
      value: input.amountCents / 100,
      dueDate,
      description: `Matrícula: ${input.moduleTitle}`.slice(0, 255),
      externalReference: input.checkoutId,
    }),
  });
  const pix = await asaas<{ payload?: string; encodedImage?: string; expirationDate?: string }>(`/payments/${encodeURIComponent(payment.id)}/pixQrCode`);
  if (!pix.payload || !pix.encodedImage) throw new Error("O provedor não retornou o QR Code Pix.");
  return {
    providerPaymentId: payment.id,
    payload: pix.payload,
    imageDataUrl: `data:image/png;base64,${pix.encodedImage}`,
    expiresAt: pix.expirationDate ? new Date(pix.expirationDate) : new Date(Date.now() + 30 * 60 * 1000),
  };
}

export function getAsaasPayment(id: string) {
  return asaas<AsaasPayment>(`/payments/${encodeURIComponent(id)}`);
}

/** Confirma pela API do Asaas; o payload do webhook/navegador nunca libera acesso sozinho. */
export async function syncPixCheckout(tenantId: string, checkoutId: string, expectedPaymentId?: string) {
  const checkout = await withTenant(tenantId, (tx) => tx.pixCheckout.findFirst({ where: { id: checkoutId } }));
  if (!checkout || checkout.status === "PAID" || checkout.status === "FAILED") return checkout?.status ?? null;
  const providerPaymentId = checkout.providerPaymentId;
  if (!providerPaymentId) return checkout.status;
  if (expectedPaymentId && expectedPaymentId !== providerPaymentId) return checkout.status;

  const payment = await getAsaasPayment(providerPaymentId);
  if (confirmsPixCheckout(payment, { id: checkout.id, providerPaymentId, amountCents: checkout.amountCents })) {
    await withTenant(tenantId, async (tx) => {
      const claimed = await tx.pixCheckout.updateMany({
        where: { id: checkout.id, status: { in: ["PENDING", "EXPIRED"] } },
        data: { status: "PAID", paidAt: new Date() },
      });
      if (claimed.count === 0) return;
      await tx.enrollment.upsert({
        where: { userId_moduleId: { userId: checkout.userId, moduleId: checkout.moduleId } },
        create: { tenantId, userId: checkout.userId, moduleId: checkout.moduleId, origin: "COMPRA", status: "ATIVA" },
        update: { tenantId, origin: "COMPRA", status: "ATIVA", endsAt: null },
      });
    });
    return "PAID";
  }

  if (checkout.status === "PENDING" && checkout.expiresAt && checkout.expiresAt <= new Date()) {
    await withTenant(tenantId, (tx) => tx.pixCheckout.updateMany({ where: { id: checkout.id, status: "PENDING" }, data: { status: "EXPIRED" } }));
    return "EXPIRED";
  }
  return "PENDING";
}
