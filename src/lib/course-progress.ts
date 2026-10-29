import "server-only";
import type { Tx } from "./db";
import { DEFAULT_QUIZ, type QuizConfig } from "./quiz";
import { parseDocument } from "@/content-blocks/schema";

export type CourseSheet = {
  codigo?: string;
  titulo?: string;
  instrutor?: string;
  revisor?: string;
  carga_horaria?: string;
  publico?: string;
  pre_requisitos?: string;
  objetivo_geral?: string;
  versao?: string;
  revisao?: string;
  proxima_revisao?: string;
  aviso?: string;
  area?: string;
  intro?: { title: string; markdown: string }[];
  quiz?: Partial<QuizConfig>;
  modules?: { number: number; title: string; slug: string; objectives: { code: string; bloom: string; text: string }[]; minutes: number }[];
  computedMinutes?: number;
};

export function readSheet(raw: unknown): CourseSheet {
  return raw && typeof raw === "object" ? (raw as CourseSheet) : {};
}

export function quizConfig(sheet: CourseSheet): QuizConfig {
  return { ...DEFAULT_QUIZ, ...(sheet.quiz ?? {}) };
}

/** Ids das aulas (seções do tipo "section") de um documento publicado. */
export function lessonIds(document: unknown): string[] {
  return parseDocument(document).sections.filter((s) => s.kind === "section").map((s) => s.id);
}

/** Garante a linha de progresso do aluno no assunto. */
export async function ensureProgress(tx: Tx, tenantId: string, enrollmentId: string, topicId: string) {
  return tx.topicProgress.upsert({
    where: { enrollmentId_topicId: { enrollmentId, topicId } },
    create: { tenantId, enrollmentId, topicId, status: "EM_ANDAMENTO", percent: 0 },
    update: {},
  });
}

/** Recalcula a situação da matrícula: concluída quando todos os módulos com prova estão aprovados. */
export async function refreshEnrollment(tx: Tx, enrollmentId: string, moduleId: string) {
  const topics = await tx.topic.findMany({ where: { moduleId, status: "PUBLICADO" }, select: { id: true, _count: { select: { questions: { where: { active: true } } } } } });
  const progress = await tx.topicProgress.findMany({ where: { enrollmentId } });
  const done = topics.every((t) => {
    const p = progress.find((x) => x.topicId === t.id);
    return t._count.questions > 0 ? p?.quizPassed : p?.status === "CONCLUIDO";
  });
  const enrollment = await tx.enrollment.findUnique({ where: { id: enrollmentId } });
  if (!enrollment) return;
  if (done && topics.length && enrollment.status === "ATIVA") await tx.enrollment.update({ where: { id: enrollmentId }, data: { status: "CONCLUIDA" } });
}
