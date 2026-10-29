import { describe, expect, it } from "vitest";
import { parsePriceToCents, summarizePixCheckouts } from "@/lib/payments/pix-state";
import { activeEnrollmentWhere, isPastEnd, parseEndDate, toDateInput } from "@/lib/enrollments";

describe("painel Financeiro", () => {
  it("soma receita confirmada, recente e pendente", () => {
    const since = new Date("2026-10-01T00:00:00Z");
    const summary = summarizePixCheckouts(
      [
        { status: "PAID", amountCents: 10000, paidAt: new Date("2026-09-15T12:00:00Z") },
        { status: "PAID", amountCents: 25000, paidAt: new Date("2026-10-10T12:00:00Z") },
        { status: "PENDING", amountCents: 5000, paidAt: null },
        { status: "CANCELED", amountCents: 9900, paidAt: null },
        { status: "EXPIRED", amountCents: 9900, paidAt: null },
      ],
      since,
    );
    expect(summary).toEqual({ paidCents: 35000, paidCount: 2, recentPaidCents: 25000, pendingCents: 5000, pendingCount: 1 });
  });

  it("converte o preço digitado em centavos", () => {
    expect(parsePriceToCents("125,50")).toBe(12550);
    expect(parsePriceToCents("99.9")).toBe(9990);
    expect(parsePriceToCents("  ")).toBeNull();
    expect(parsePriceToCents("abc")).toBeNaN();
  });
});

describe("painel Matrículas", () => {
  it("interpreta a data de término no fim do dia de Brasília", () => {
    const d = parseEndDate("2026-12-31");
    expect(d?.toISOString()).toBe("2027-01-01T02:59:59.000Z");
    expect(toDateInput(d)).toBe("2026-12-31");
    expect(parseEndDate("")).toBeNull();
    expect(parseEndDate("31/12/2026")).toBeUndefined();
  });

  it("matrícula ativa com prazo vencido deixa de liberar acesso", () => {
    const now = new Date("2026-10-21T12:00:00Z");
    expect(isPastEnd({ status: "ATIVA", endsAt: new Date("2026-10-20T00:00:00Z") }, now)).toBe(true);
    expect(isPastEnd({ status: "ATIVA", endsAt: null }, now)).toBe(false);
    expect(isPastEnd({ status: "ATIVA", endsAt: new Date("2026-11-01T00:00:00Z") }, now)).toBe(false);
    expect(activeEnrollmentWhere(now)).toEqual({ status: "ATIVA", OR: [{ endsAt: null }, { endsAt: { gt: now } }] });
  });
});
