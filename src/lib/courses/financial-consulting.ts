import outline from "../../../content/courses/consultoria-financeira/outline.json";

export const FINANCIAL_COURSE = outline;
export const FINANCIAL_COURSE_PATH = `/cursos/${outline.segment.slug}/${outline.slug}`;
export const FINANCIAL_COURSE_SOURCE = "drap-consultoria-financeira-v1";
export const FINANCIAL_DOWNLOAD_PATH = "/api/courses/consultoria-financeira/materiais";
export const FINANCIAL_TRACKS = [
  { title: "Fundamentos, dados e economia", numbers: [1, 2, 3, 4] },
  { title: "Empresa, capital e valuation", numbers: [5, 6, 7, 8] },
  { title: "Mercados, patrimônio e crédito", numbers: [9, 10, 11, 12] },
  { title: "Governança, ética e relacionamento", numbers: [13, 14, 15] },
  { title: "Modelagem, implementação e laboratório", numbers: [16, 17, 18] },
];
export function isFinancialCourse(course: { slug: string; level: { slug: string }; segment: { slug: string } }) {
  return course.level.slug === "cursos" && course.segment.slug === outline.segment.slug && course.slug === outline.slug;
}
export function financialModuleNumber(slug: string) {
  const topic = outline.topics.find((item) => item.slug === slug);
  return topic && "moduleNumber" in topic ? topic.moduleNumber : null;
}
