"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { withTenant } from "@/lib/db";
import { assertPermission, clientIp } from "@/lib/session";
import { audit } from "@/lib/audit";
import { cancelAsaasPayment, syncPixCheckout } from "@/lib/payments/asaas";
import { formatBRL, parsePriceToCents } from "@/lib/payments/pix-state";

export type FinanceState = { error?: string; ok?: boolean; message?: string };

const asaasConfigured = () => Boolean(process.env.ASAAS_API_KEY);

function refresh() {
  revalidatePath("/painel/financeiro");
  revalidatePath("/painel/matriculas");
}

export async function syncCheckoutAction(_: FinanceState, fd: FormData): Promise<FinanceState> {
  const viewer = await assertPermission("finance:manage");
  const id = z.string().uuid().safeParse(fd.get("checkoutId"));
  if (!id.success) return { error: "Cobrança inválida." };
  if (!asaasConfigured()) return { error: "O Asaas não está configurado." };
  let status: string | null;
  try {
    status = await syncPixCheckout(viewer.tenant.id, id.data);
  } catch {
    return { error: "Não foi possível consultar o Asaas agora." };
  }
  if (!status) return { error: "Cobrança não encontrada." };
  refresh();
  return { ok: true, message: status === "PAID" ? "Pagamento confirmado; matrícula liberada." : status === "EXPIRED" ? "O Pix expirou sem pagamento." : "Ainda sem pagamento no Asaas." };
}

export async function confirmCheckoutAction(_: FinanceState, fd: FormData): Promise<FinanceState> {
  const viewer = await assertPermission("finance:manage");
  const id = z.string().uuid().safeParse(fd.get("checkoutId"));
  if (!id.success) return { error: "Cobrança inválida." };
  const note = z.string().trim().min(5, "Descreva como o pagamento foi recebido.").max(500).safeParse(fd.get("note"));
  if (!note.success) return { error: note.error.issues[0]?.message ?? "Informe uma justificativa." };
  const tenantId = viewer.tenant.id;

  // Se o Asaas já recebeu, a confirmação automática basta.
  if (asaasConfigured()) {
    try {
      if ((await syncPixCheckout(tenantId, id.data)) === "PAID") {
        refresh();
        return { ok: true, message: "O Asaas já havia recebido este Pix; matrícula liberada." };
      }
    } catch {
      // Segue com a baixa manual: o administrador atesta o recebimento.
    }
  }

  const ip = await clientIp();
  type Result = FinanceState & { providerPaymentId?: string | null; wasPending?: boolean };
  const result = await withTenant(tenantId, async (tx): Promise<Result> => {
    const checkout = await tx.pixCheckout.findFirst({ where: { id: id.data, tenantId } });
    if (!checkout) return { error: "Cobrança não encontrada." };
    const claimed = await tx.pixCheckout.updateMany({
      where: { id: checkout.id, status: { not: "PAID" } },
      data: { status: "PAID", paidAt: new Date(), manualConfirmedById: viewer.user.id, adminNote: note.data },
    });
    if (claimed.count === 0) return { error: "Esta cobrança já está paga." };
    await tx.enrollment.upsert({
      where: { userId_moduleId: { userId: checkout.userId, moduleId: checkout.moduleId } },
      create: { tenantId, userId: checkout.userId, moduleId: checkout.moduleId, origin: "COMPRA", status: "ATIVA" },
      update: { origin: "COMPRA", status: "ATIVA", endsAt: null },
    });
    await audit(tx, {
      tenantId,
      actorId: viewer.user.id,
      action: "pix.baixa_manual",
      entity: "PixCheckout",
      entityId: checkout.id,
      data: { before: checkout.status, amountCents: checkout.amountCents, note: note.data },
      ip,
    });
    return { ok: true, message: "Pagamento confirmado manualmente; matrícula liberada.", providerPaymentId: checkout.providerPaymentId, wasPending: checkout.status === "PENDING" };
  });
  // Evita um segundo pagamento pelo QR Code ainda aberto.
  if (result.wasPending && result.providerPaymentId && asaasConfigured()) {
    await cancelAsaasPayment(result.providerPaymentId).catch(() => undefined);
  }
  if (result.ok) refresh();
  return { ok: result.ok, error: result.error, message: result.message };
}

export async function cancelCheckoutAction(_: FinanceState, fd: FormData): Promise<FinanceState> {
  const viewer = await assertPermission("finance:manage");
  const id = z.string().uuid().safeParse(fd.get("checkoutId"));
  if (!id.success) return { error: "Cobrança inválida." };
  const tenantId = viewer.tenant.id;
  const checkout = await withTenant(tenantId, (tx) => tx.pixCheckout.findFirst({ where: { id: id.data, tenantId } }));
  if (!checkout) return { error: "Cobrança não encontrada." };
  if (checkout.status !== "PENDING") return { error: "Só cobranças aguardando pagamento podem ser canceladas." };

  if (checkout.providerPaymentId) {
    if (!asaasConfigured()) return { error: "O Asaas não está configurado; não é possível cancelar a cobrança no provedor." };
    try {
      if ((await syncPixCheckout(tenantId, checkout.id)) === "PAID") {
        refresh();
        return { error: "Este Pix acabou de ser pago; a matrícula foi liberada e a cobrança não foi cancelada." };
      }
      await cancelAsaasPayment(checkout.providerPaymentId);
    } catch {
      return { error: "Não foi possível cancelar a cobrança no Asaas. Tente novamente." };
    }
  }

  const ip = await clientIp();
  await withTenant(tenantId, async (tx) => {
    const updated = await tx.pixCheckout.updateMany({ where: { id: checkout.id, status: { in: ["PENDING", "EXPIRED"] } }, data: { status: "CANCELED" } });
    if (updated.count === 0) return;
    await audit(tx, { tenantId, actorId: viewer.user.id, action: "pix.cancelado", entity: "PixCheckout", entityId: checkout.id, data: { amountCents: checkout.amountCents }, ip });
  });
  refresh();
  return { ok: true, message: "Cobrança cancelada." };
}

export async function updatePriceAction(_: FinanceState, fd: FormData): Promise<FinanceState> {
  const viewer = await assertPermission("finance:manage");
  const id = z.string().uuid().safeParse(fd.get("moduleId"));
  if (!id.success) return { error: "Curso inválido." };
  const price = z
    .number({ invalid_type_error: "Valor inválido." })
    .int()
    .min(100, "O valor mínimo é R$ 1,00")
    .max(10_000_000, "O valor máximo é R$ 100.000,00")
    .nullable()
    .safeParse(parsePriceToCents(fd.get("price")));
  if (!price.success) return { error: price.error.issues[0]?.message ?? "Valor inválido." };
  const tenantId = viewer.tenant.id;
  const ip = await clientIp();
  const result = await withTenant(tenantId, async (tx) => {
    const mod = await tx.module.findFirst({ where: { id: id.data, tenantId }, select: { id: true, priceCents: true, audience: true } });
    if (!mod) return { error: "Curso não encontrado." };
    if (mod.audience === "EMPRESA") return { error: "Treinamentos para empresas são vendidos por contrato em Empresas." };
    if (mod.priceCents === price.data) return { ok: true, message: "Nenhuma alteração." };
    await tx.module.update({ where: { id: mod.id }, data: { priceCents: price.data } });
    await audit(tx, { tenantId, actorId: viewer.user.id, action: "curso.preco_alterado", entity: "Module", entityId: mod.id, data: { before: mod.priceCents, after: price.data }, ip });
    return { ok: true, message: price.data == null ? "Checkout Pix desativado para este curso." : `Preço atualizado para ${formatBRL(price.data)}.` };
  });
  if (result.ok) {
    revalidatePath("/painel/financeiro");
    revalidatePath("/", "layout");
  }
  return result;
}
