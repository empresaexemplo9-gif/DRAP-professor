import { describe, expect, it } from "vitest";
import { buildProposalItems, proposalCode, proposalStage, proposalTotals, proposalValidUntil, readProposalItems, type ProposalModule } from "@/lib/proposals";

const mod = (id: string, price: number | null, minutes = 120): ProposalModule => ({
  id, title: `Curso ${id}`, summary: null, workloadMinutes: minutes, enterprisePriceCents: price, level: { label: "Cursos" }, segment: { name: "Gestão" },
});
const catalog = [mod("a", 10_000), mod("b", null, 60), mod("c", 25_050)];

describe("Propostas", () => {
  it("monta os itens só com o que o cliente marcou, na ordem do catálogo e sem repetir", () => {
    const items = buildProposalItems(["c", "a", "a", "inexistente"], catalog);
    expect(items.map((i) => i.moduleId)).toEqual(["a", "c"]);
    expect(items[1]).toMatchObject({ title: "Curso c", level: "Cursos", segment: "Gestão", unitCents: 25_050 });
  });

  it("soma por pessoa e pelo tamanho da equipe, deixando fora o que está sob consulta", () => {
    const items = buildProposalItems(["a", "b", "c"], catalog);
    expect(proposalTotals(items, 40)).toEqual({ pricedCount: 2, unpricedCount: 1, perPersonCents: 35_050, totalCents: 1_402_000, workloadMinutes: 300 });
    expect(proposalTotals(items, null).totalCents).toBeNull();
    expect(proposalTotals(items, null).perPersonCents).toBe(35_050);
  });

  it("sem nenhum preço cadastrado a proposta fica sob consulta", () => {
    const totals = proposalTotals(buildProposalItems(["b"], catalog), 10);
    expect(totals.perPersonCents).toBeNull();
    expect(totals.totalCents).toBeNull();
  });

  it("numera, define a validade e classifica o andamento", () => {
    const created = new Date("2026-11-11T12:00:00Z");
    expect(proposalCode(7, created)).toBe("P-2026-0007");
    const validUntil = proposalValidUntil(created);
    expect(validUntil.toISOString()).toBe("2026-11-26T12:00:00.000Z");
    const base = { acceptedAt: null, validUntil, viewedAt: null, sentAt: null };
    expect(proposalStage(base, created)).toBe("GERADA");
    expect(proposalStage({ ...base, sentAt: created }, created)).toBe("ENVIADA");
    expect(proposalStage({ ...base, sentAt: created, viewedAt: created }, created)).toBe("VISUALIZADA");
    expect(proposalStage({ ...base, sentAt: created }, new Date("2026-12-01T00:00:00Z"))).toBe("EXPIRADA");
    expect(proposalStage({ ...base, acceptedAt: created }, new Date("2026-12-01T00:00:00Z"))).toBe("ACEITA");
  });

  it("ignora itens gravados fora do formato", () => {
    expect(readProposalItems([{ moduleId: "a", title: "ok" }, { foo: 1 }, null])).toHaveLength(1);
    expect(readProposalItems("x")).toEqual([]);
  });
});
