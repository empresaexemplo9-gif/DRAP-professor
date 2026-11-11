/** Módulo do catálogo que dá acesso ao preparatório CPA (matrícula, preço e Pix seguem o fluxo comum). */
export const CPA_MODULE = {
  slug: "preparatorio-cpa-anbima",
  title: "Preparatório CPA ANBIMA",
  summary:
    "Preparação autoral e completa para a certificação CPA (Certificado Profissional Anbima): aulas, apostila, exercícios, simulados cronometrados e casos de atendimento, rastreados ao Programa Detalhado oficial vigente. Não emite certificado: a certificação CPA só é obtida na prova oficial da ANBIMA. Material independente, sem vínculo com a ANBIMA.",
  workloadMinutes: 80 * 60,
  /** Preparatório para a prova oficial: a plataforma não emite certificado deste módulo. */
  issuesCertificate: false,
  segment: { name: "Mercado Financeiro", slug: "mercado-financeiro", description: "Certificações e capacitação para o mercado financeiro." },
} as const;
