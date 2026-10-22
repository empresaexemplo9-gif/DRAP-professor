import { FINANCIAL_MENTORSHIPS } from "@/lib/mentorships";
import { TEAM_COURSE, TEAM_COURSE_BANNER } from "@/lib/courses/team-schedules";
import { BUSINESS_COURSE } from "@/lib/courses/business-management";

/** Imagens editoriais ilustrativas; não representam instalações ou docentes da instituição. */
export function academicImage(segment: string) {
  if (segment === "agronegocio") return "/images/agriculture.jpg";
  if (segment === "arquitetura") return "/images/architecture.jpg";
  if (segment === "financas") return "/images/library.jpg";
  return "/images/classroom.jpg";
}

export type CourseBanner = { src: string; width: number; height: number };

/** Banners enviados pelo cliente, usados inteiros no tamanho real (sem corte nem reprocessamento). */
const COURSE_BANNERS: Record<string, CourseBanner> = {
  [TEAM_COURSE.slug]: { src: TEAM_COURSE_BANNER, width: 1600, height: 600 },
  [BUSINESS_COURSE.slug]: { src: "/images/courses/gestao-de-empresas-banner.webp", width: 2000, height: 668 },
  "prospeccao-b2b": { src: "/images/courses/prospeccao-b2b-banner.webp", width: 2000, height: 668 },
  ...Object.fromEntries(FINANCIAL_MENTORSHIPS.flatMap((m) => (m.banner ? [[m.slug, { src: m.banner, width: 1600, height: 600 }]] : []))),
};

export function courseBanner(slug: string): CourseBanner | null {
  return COURSE_BANNERS[slug] ?? null;
}
