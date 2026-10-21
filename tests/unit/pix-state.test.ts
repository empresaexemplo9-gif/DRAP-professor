import { describe, expect, it } from "vitest";
import { confirmsPixCheckout } from "@/lib/payments/pix-state";

const checkout = { id: "checkout-1", providerPaymentId: "pay-1", amountCents: 12500 };

describe("Pix payment confirmation", () => {
  it("confirms only a settled payment that matches id, reference and exact amount", () => {
    expect(confirmsPixCheckout({ id: "pay-1", externalReference: "checkout-1", value: 125, status: "RECEIVED" }, checkout)).toBe(true);
    expect(confirmsPixCheckout({ id: "pay-1", externalReference: "checkout-1", value: 125, status: "CONFIRMED" }, checkout)).toBe(true);
  });

  it.each([
    { id: "pay-1", externalReference: "checkout-1", value: 125, status: "PENDING" },
    { id: "other", externalReference: "checkout-1", value: 125, status: "RECEIVED" },
    { id: "pay-1", externalReference: "other-checkout", value: 125, status: "RECEIVED" },
    { id: "pay-1", externalReference: "checkout-1", value: 124.99, status: "RECEIVED" },
  ])("does not confirm an untrusted or unpaid payment", (payment) => {
    expect(confirmsPixCheckout(payment, checkout)).toBe(false);
  });
});
