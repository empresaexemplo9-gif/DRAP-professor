/** Regras puras das propostas comerciais (sem banco), testadas em tests/unit/proposals.test.ts. */

export type ProposalItem = {
  moduleId: string;
  title: string;
  level: string;
  segment: string;
  workloadMinutes: number;
  summary: string | null;
  /** Preço por pessoa para empresas no momento da geração; null = sob consulta. */
  unitCents: number | null;
};

export type ProposalModule = {
  id: string;
  title: string;
  summary: string | null;
  workloadMinutes: number;
  enterprisePriceCents: number | null;
  level: { label: string };
  segment: { name: string };
};

export const PROPOSAL_VALID_DAYS = 15;

/** Fotografia dos cursos marcados pelo cliente, na ordem do catálogo e sem repetição. */
export function buildProposalItems(selectedIds: readonly string[], catalog: readonly ProposalModule[]): ProposalItem[] {
  const wanted = new Set(selectedIds);
  return catalog
    .filter((m) => wanted.has(m.id))
    .map((m) => ({
      moduleId: m.id,
      title: m.title,
      level: m.level.label,
      segment: m.segment.name,
      workloadMinutes: m.workloadMinutes,
      summary: m.summary,
      unitCents: m.enterprisePriceCents,
    }));
}

/** Lê os itens gravados em JSON, descartando o que não tiver o formato esperado. */
export function readProposalItems(raw: unknown): ProposalItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (i): i is ProposalItem =>
      Boolean(i) && typeof i === "object" && typeof (i as ProposalItem).moduleId === "string" && typeof (i as ProposalItem).title === "string",
  );
}

/** Totais para `seats` participantes; itens sem preço ficam fora da soma ("sob consulta"). */
export function proposalTotals(items: readonly ProposalItem[], seats: number | null | undefined) {
  const priced = items.filter((i) => i.unitCents != null);
  const perPersonCents = priced.reduce((n, i) => n + i.unitCents!, 0);
  const people = seats && seats > 0 ? seats : null;
  return {
    pricedCount: priced.length,
    unpricedCount: items.length - priced.length,
    perPersonCents: priced.length ? perPersonCents : null,
    totalCents: priced.length && people ? perPersonCents * people : null,
    workloadMinutes: items.reduce((n, i) => n + i.workloadMinutes, 0),
  };
}

export function proposalCode(number: number, createdAt: Date) {
  return `P-${createdAt.getUTCFullYear()}-${String(number).padStart(4, "0")}`;
}

export function proposalValidUntil(from: Date) {
  return new Date(from.getTime() + PROPOSAL_VALID_DAYS * 24 * 60 * 60 * 1000);
}

export type ProposalStage = "ACEITA" | "EXPIRADA" | "VISUALIZADA" | "ENVIADA" | "GERADA";

export function proposalStage(p: { acceptedAt: Date | null; validUntil: Date; viewedAt: Date | null; sentAt: Date | null }, now = new Date()): ProposalStage {
  if (p.acceptedAt) return "ACEITA";
  if (p.validUntil <= now) return "EXPIRADA";
  if (p.viewedAt) return "VISUALIZADA";
  return p.sentAt ? "ENVIADA" : "GERADA";
}

export const PROPOSAL_STAGE_LABEL = {
  ACEITA: { label: "Aceita", tone: "success" },
  EXPIRADA: { label: "Expirada", tone: "neutral" },
  VISUALIZADA: { label: "Visualizada", tone: "primary" },
  ENVIADA: { label: "Enviada", tone: "warning" },
  GERADA: { label: "Gerada", tone: "neutral" },
} as const satisfies Record<ProposalStage, { label: string; tone: "neutral" | "primary" | "success" | "warning" }>;
