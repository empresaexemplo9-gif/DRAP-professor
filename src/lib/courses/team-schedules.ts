import outline from "../../../content/courses/gestao-justa-de-equipes/outline.json";

/** Treinamento para empresas "Gestão justa de equipes e escalas" (apostila do cliente). */
export const TEAM_COURSE = outline;
export const TEAM_COURSE_LEVEL = "treinamentos";
export const TEAM_COURSE_PATH = `/${TEAM_COURSE_LEVEL}/${outline.segment.slug}/${outline.slug}`;
export const TEAM_COURSE_DOWNLOAD = "/api/courses/gestao-justa-de-equipes/apostila";
export const TEAM_COURSE_SOURCE = "drap-gestao-justa-de-equipes-v1";
export const TEAM_COURSE_BANNER = "/images/courses/gestao-justa-de-equipes-banner.webp";

export function isTeamCourse(course: { slug: string; level: { slug: string }; segment: { slug: string } }) {
  return course.level.slug === TEAM_COURSE_LEVEL && course.segment.slug === outline.segment.slug && course.slug === outline.slug;
}
