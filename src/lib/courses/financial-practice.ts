import "server-only";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import practice from "../../../content/courses/consultoria-financeira/practice.json";
import { FINANCIAL_COURSE, financialModuleNumber } from "./financial-consulting";

export type StudyQuestion = { id: string; kind: string; prompt: string; guidance: string };
export function financialQuestions(slug: string): StudyQuestion[] {
  return practice.find((item) => item.moduleNumber === financialModuleNumber(slug))?.questions ?? [];
}
const answersSchema = z.record(z.string().max(80), z.string().max(6000)).refine((v) => Object.keys(v).length <= 9);

async function context(tx: Prisma.TransactionClient, tenantId: string, userId: string, topicId: string) {
  if (!z.string().uuid().safeParse(topicId).success) return null;
  const topic = await tx.topic.findFirst({
    where: {
      id: topicId,
      tenantId,
      status: "PUBLICADO",
      module: {
        status: "PUBLICADO",
        slug: FINANCIAL_COURSE.slug,
        level: { slug: "cursos", active: true },
        segment: { slug: FINANCIAL_COURSE.segment.slug },
      },
    },
    select: { id: true, moduleId: true, slug: true },
  });
  if (!topic || !financialQuestions(topic.slug).length) return null;
  const enrollment = await tx.enrollment.findFirst({
    where: { tenantId, userId, moduleId: topic.moduleId, status: "ATIVA" },
    select: { id: true },
  });
  return enrollment ? { topic, enrollment } : null;
}
export async function readFinancialNotebook(
  tx: Prisma.TransactionClient,
  tenantId: string,
  userId: string,
  topicId: string,
) {
  const access = await context(tx, tenantId, userId, topicId);
  if (!access) return null;
  const notebook = await tx.studyNotebook.findUnique({
    where: { enrollmentId_topicId: { enrollmentId: access.enrollment.id, topicId } },
  });
  return notebook ? answersSchema.parse(notebook.answers) : {};
}
export async function saveFinancialNotebook(
  tx: Prisma.TransactionClient,
  tenantId: string,
  userId: string,
  topicId: string,
  raw: unknown,
) {
  const access = await context(tx, tenantId, userId, topicId);
  if (!access)
    return { ok: false as const, error: "A matrícula ativa neste curso é necessária para salvar respostas." };
  const parsed = answersSchema.safeParse(raw);
  const allowed = new Set(financialQuestions(access.topic.slug).map((q) => q.id));
  if (!parsed.success || Object.keys(parsed.data).some((id) => !allowed.has(id)))
    return {
      ok: false as const,
      error: "Revise as respostas: use apenas as questões deste módulo, com até 6.000 caracteres por resposta.",
    };
  await tx.studyNotebook.upsert({
    where: { enrollmentId_topicId: { enrollmentId: access.enrollment.id, topicId } },
    create: { tenantId, enrollmentId: access.enrollment.id, topicId, answers: parsed.data },
    update: { answers: parsed.data },
  });
  return { ok: true as const };
}
