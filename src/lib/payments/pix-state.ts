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
