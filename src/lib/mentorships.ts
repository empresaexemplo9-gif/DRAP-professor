/** Mentorias financeiras por porte de empresa (substituem a antiga "Mentoria em Finanças para Pequenas Empresas"). */
export const MENTORSHIP_LEVEL = "mentorias";
export const MENTORSHIP_SEGMENT = { name: "Finanças", slug: "financas" };
export const MENTORSHIP_SOURCE = "drap-mentorias-financeiras-v1";
/** Módulo de exemplo antigo, arquivado (não excluído) na substituição. */
export const LEGACY_MENTORSHIP_SLUG = "financas-pequenas-empresas";

export type FinancialMentorship = {
  key: "pequenas" | "medias" | "grandes";
  tab: string;
  porte: string;
  slug: string;
  title: string;
  subtitle: string;
  summary: string;
  /** Banner fornecido pelo cliente (public/images/mentorias); null até o arquivo ser enviado. */
  banner: string | null;
};

export const FINANCIAL_MENTORSHIPS: FinancialMentorship[] = [
  {
    key: "pequenas",
    tab: "Pequenas empresas",
    porte: "Pequeno porte",
    slug: "mentoria-financeira-pequenas-empresas",
    title: "Mentoria financeira para pequenas empresas",
    subtitle: "para pequenas empresas",
    summary: "Organize o caixa, fortaleça a gestão e prepare o negócio para crescer.",
    banner: null,
  },
  {
    key: "medias",
    tab: "Médias empresas",
    porte: "Médio porte",
    slug: "mentoria-financeira-medias-empresas",
    title: "Mentoria financeira para médias empresas",
    subtitle: "para médias empresas",
    summary: "Aprimore previsões, margens e decisões de investimento com visão integrada.",
    banner: null,
  },
  {
    key: "grandes",
    tab: "Grandes empresas",
    porte: "Grande porte",
    slug: "mentoria-financeira-grandes-empresas",
    title: "Mentoria financeira para grandes empresas",
    subtitle: "para grandes empresas",
    summary: "Conecte planejamento, desempenho e decisões financeiras à estratégia.",
    banner: null,
  },
];

export const mentorshipPath = (m: { slug: string }) => `/${MENTORSHIP_LEVEL}/${MENTORSHIP_SEGMENT.slug}/${m.slug}`;

export function findFinancialMentorship(course: { slug: string; level: { slug: string }; segment: { slug: string } }) {
  if (course.level.slug !== MENTORSHIP_LEVEL || course.segment.slug !== MENTORSHIP_SEGMENT.slug) return null;
  return FINANCIAL_MENTORSHIPS.find((m) => m.slug === course.slug) ?? null;
}
