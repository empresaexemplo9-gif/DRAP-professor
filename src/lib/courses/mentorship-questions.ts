import "server-only";
import pequenas from "../../../content/courses/mentoria-financeira-pequenas/questions.json";
import mediasGuide from "../../../content/courses/mentoria-financeira-medias/teacher-guide.json";
import { parseDocument } from "@/content-blocks/schema";
import type { FinancialMentorship } from "@/lib/mentorships";

const moduleNumber = (topicSlug: string) => Number(/^modulo-(\d+)-/.exec(topicSlug)?.[1] ?? 0);

/** Avaliação do módulo (apostila do participante, com gabarito publicado). Chamar só após verificar acesso. */
export function mentorshipQuestions(m: Pick<FinancialMentorship, "key">, topicSlug: string) {
  const number = moduleNumber(topicSlug);
  return m.key === "pequenas" && number ? pequenas.filter((q) => q.moduleNumber === number) : [];
}

/** Apêndice A da mentoria para médias empresas: gabaritos e critérios, somente para a equipe pedagógica. */
export function mentorshipTeacherGuide(m: Pick<FinancialMentorship, "key">, topicSlug: string, isStaff: boolean) {
  if (!isStaff || m.key !== "medias" || !moduleNumber(topicSlug)) return null;
  return parseDocument(mediasGuide, mediasGuide.title);
}
