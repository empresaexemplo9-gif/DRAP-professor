import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { syncPixCheckout } from "@/lib/payments/asaas";

function validToken(received: string | null, expected: string | undefined) {
  if (!received || !expected) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (!validToken(request.headers.get("asaas-access-token"), process.env.ASAAS_WEBHOOK_TOKEN)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  let body: { event?: unknown; payment?: { id?: unknown; externalReference?: unknown } };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }
  if (body.event !== "PAYMENT_RECEIVED" && body.event !== "PAYMENT_CONFIRMED") {
    return NextResponse.json({ received: true });
  }
  const checkoutId = typeof body.payment?.externalReference === "string" ? body.payment.externalReference : "";
  const paymentId = typeof body.payment?.id === "string" ? body.payment.id : "";
  if (!checkoutId || !paymentId) return NextResponse.json({ received: true });

  try {
    const tenant = await prisma.tenant.findUnique({ where: { slug: process.env.DEFAULT_TENANT_SLUG ?? "drap" }, select: { id: true } });
    if (!tenant) return NextResponse.json({ received: true });
    await syncPixCheckout(tenant.id, checkoutId, paymentId);
    return NextResponse.json({ received: true });
  } catch {
    // Retorno não-2xx pede ao Asaas para repetir o webhook.
    return NextResponse.json({ error: "processing_failed" }, { status: 503 });
  }
}
