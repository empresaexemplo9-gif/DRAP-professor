import { FINANCIAL_MENTORSHIPS } from "@/lib/mentorships";
import { TEAM_COURSE, TEAM_COURSE_BANNER } from "@/lib/courses/team-schedules";

/** Imagens editoriais ilustrativas; não representam instalações ou docentes da instituição. */
export function academicImage(segment: string) {
  if (segment === "agronegocio") return "/images/agriculture.jpg";
  if (segment === "arquitetura") return "/images/architecture.jpg";
  if (segment === "financas") return "/images/library.jpg";
  return "/images/classroom.jpg";
}

/** Banners enviados pelo cliente (1600 × 600), usados inteiros, sem corte nem reprocessamento. */
const COURSE_BANNERS: Record<string, string> = {
  [TEAM_COURSE.slug]: TEAM_COURSE_BANNER,
  ...Object.fromEntries(FINANCIAL_MENTORSHIPS.flatMap((m) => (m.banner ? [[m.slug, m.banner]] : []))),
};

export function courseBanner(slug: string): string | null {
  return COURSE_BANNERS[slug] ?? null;
}
