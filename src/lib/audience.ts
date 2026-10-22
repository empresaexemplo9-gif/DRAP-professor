import type { ModuleAudience } from "@prisma/client";

/** Público-alvo do módulo: define como ele é vendido e entregue. */
export const AUDIENCE = {
  INDIVIDUAL: {
    label: "Capacitação individual",
    short: "Individual",
    description: "Vendida por pessoa, com matrícula e pagamento (Pix).",
  },
  EMPRESA: {
    label: "Treinamento para empresas",
    short: "Para empresas",
    description: "Vendido por contrato à empresa e liberado aos colaboradores pelas vagas, sem matrícula individual.",
  },
} as const satisfies Record<ModuleAudience, { label: string; short: string; description: string }>;

export const isCompanyOnly = (m: { audience: ModuleAudience }) => m.audience === "EMPRESA";
