import outline from "../../../content/courses/gestao-de-empresas/outline.json";

export const BUSINESS_COURSE = outline;
export const BUSINESS_COURSE_PATH = `/cursos/${outline.segment.slug}/${outline.slug}`;
export const BUSINESS_COURSE_DOWNLOAD = "/api/courses/gestao-de-empresas/apostila";
export const BUSINESS_COURSE_SOURCE = "drap-gestao-de-empresas-v1";

export const BUSINESS_TRACKS = [
  { title: "Fundação e estratégia", numbers: [1, 2, 3, 4], hours: 40 },
  { title: "Mercado e clientes", numbers: [5, 6], hours: 22 },
  { title: "Pessoas e operação", numbers: [7, 8, 9], hours: 34 },
  { title: "Dinheiro e desempenho", numbers: [10, 11, 12], hours: 32 },
  { title: "Futuro, regras e proteção", numbers: [13, 14, 15, 16], hours: 34 },
  { title: "Decisão e crescimento", numbers: [17, 18], hours: 16 },
] as const;

export function isBusinessCourse(course: { slug: string; level: { slug: string }; segment: { slug: string } }) {
  return course.level.slug === "cursos" && course.segment.slug === outline.segment.slug && course.slug === outline.slug;
}

export function businessModuleNumber(slug: string): number | null {
  const topic = outline.topics.find((item) => item.slug === slug);
  return topic && "moduleNumber" in topic && typeof topic.moduleNumber === "number" ? topic.moduleNumber : null;
}
