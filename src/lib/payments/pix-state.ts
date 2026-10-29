export type VerifiedPixPayment = {
  id: string;
  status: string;
  value: number;
  externalReference?: string | null;
};

export function confirmsPixCheckout(
  payment: VerifiedPixPayment,
  checkout: { id: string; providerPaymentId: string; amountCents: number },
) {
  return payment.id === checkout.providerPaymentId
    && payment.externalReference === checkout.id
    && Math.round(payment.value * 100) === checkout.amountCents
    && (payment.status === "RECEIVED" || payment.status === "CONFIRMED");
}

export type PixStatus = "PENDING" | "PAID" | "EXPIRED" | "FAILED" | "CANCELED";

export const PIX_STATUS_LABEL = {
  PENDING: { label: "Aguardando", tone: "warning" },
  PAID: { label: "Pago", tone: "success" },
  EXPIRED: { label: "Expirado", tone: "neutral" },
  FAILED: { label: "Falhou", tone: "danger" },
  CANCELED: { label: "Cancelado", tone: "danger" },
} as const satisfies Record<PixStatus, { label: string; tone: "neutral" | "success" | "warning" | "danger" }>;

/** Totais do painel Financeiro; "recentes" conta pagamentos com paidAt a partir de `since`. */
export function summarizePixCheckouts(
  checkouts: { status: PixStatus; amountCents: number; paidAt: Date | null }[],
  since: Date,
) {
  const summary = { paidCents: 0, paidCount: 0, recentPaidCents: 0, pendingCents: 0, pendingCount: 0 };
  for (const c of checkouts) {
    if (c.status === "PAID") {
      summary.paidCents += c.amountCents;
      summary.paidCount += 1;
      if (c.paidAt && c.paidAt >= since) summary.recentPaidCents += c.amountCents;
    } else if (c.status === "PENDING") {
      summary.pendingCents += c.amountCents;
      summary.pendingCount += 1;
    }
  }
  return summary;
}

export function formatBRL(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

/** Converte "125,50" ou "125.50" em centavos; vazio vira null (curso sem checkout Pix). */
export function parsePriceToCents(value: unknown): number | null {
  if (value == null || String(value).trim() === "") return null;
  const amount = Number(String(value).trim().replace(",", "."));
  return Number.isFinite(amount) ? Math.round(amount * 100) : Number.NaN;
}
