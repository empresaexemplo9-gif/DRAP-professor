import "server-only";
import questions from "../../../content/courses/gestao-de-empresas/questions.json";
import { businessModuleNumber } from "./business-management";

/** Chamado somente após verificar acesso ao capítulo; são exercícios de fixação. */
export function businessQuestions(topicSlug: string) {
  if (topicSlug === "banco-de-questoes") return questions;
  const number = businessModuleNumber(topicSlug);
  return number ? questions.filter((question) => question.moduleNumber === number) : [];
}
