import type { Prisma } from "@prisma/client";
import { DEFAULT_QUIZ } from "../lib/quiz";
import { documentHash, questionHash, type CourseSpec } from "./course";

type Tx = Prisma.TransactionClient;

export type SyncReport = { course: string; created: boolean; versionsPublished: number; questionsCreated: number; questionsUpdated: number; questionsRetired: number };

/**
 * Publica (ou atualiza) um curso do catálogo de forma idempotente:
 *  - módulo = curso; assuntos = módulos do curso (M1…Mn), na ordem;
 *  - nova versão do assunto só quando o conteúdo muda (o aluno sempre lê uma versão congelada);
 *  - questões por código; conteúdo alterado → versão + 1 (tentativas antigas guardam o snapshot);
 *  - questões removidas do arquivo ficam inativas (nunca apagadas: preservam o histórico).
 */
export async function syncCourse(
  tx: Tx,
  opts: { tenantId: string; levelId: string; authorId: string; order: number; spec: CourseSpec },
): Promise<SyncReport> {
  const { tenantId, levelId, authorId, spec } = opts;
  const report: SyncReport = { course: spec.code, created: false, versionsPublished: 0, questionsCreated: 0, questionsUpdated: 0, questionsRetired: 0 };

  const segment = await tx.segment.upsert({
    where: { tenantId_slug: { tenantId, slug: spec.segment.slug } },
    create: { tenantId, name: spec.segment.name, slug: spec.segment.slug, description: spec.segment.description },
    update: { name: spec.segment.name, ...(spec.segment.description ? { description: spec.segment.description } : {}) },
  });

  const courseSheet = {
    ...spec.sheet,
    intro: spec.intro,
    quiz: { ...DEFAULT_QUIZ, questionsPerQuiz: spec.questionsPerQuiz },
    modules: spec.modules.map((m) => ({ number: m.number, title: m.title, slug: m.slug, objectives: m.objectives, minutes: m.minutes })),
    computedMinutes: spec.computedMinutes,
    sourceHash: spec.hash,
  } as Prisma.InputJsonValue;

  const data = {
    title: spec.title,
    summary: spec.sheet.resumo ?? spec.sheet.objetivo_geral ?? null,
    workloadMinutes: spec.hours * 60,
    certificateType: "LIVRE" as const,
    status: "PUBLICADO" as const,
    levelConfig: { sequential: true, finalExam: false, minScore: DEFAULT_QUIZ.passPercent } as Prisma.InputJsonValue,
    courseSheet,
    order: opts.order,
  };
  let mod = await tx.module.findUnique({ where: { levelId_segmentId_slug: { levelId, segmentId: segment.id, slug: spec.slug } } });
  if (mod) mod = await tx.module.update({ where: { id: mod.id }, data });
  else {
    mod = await tx.module.create({ data: { ...data, tenantId, levelId, segmentId: segment.id, slug: spec.slug } });
    report.created = true;
  }

  const existingTopics = await tx.topic.findMany({ where: { moduleId: mod.id }, include: { publishedVersion: true } });
  for (const m of spec.modules) {
    const docJson = m.document as unknown as Prisma.InputJsonValue;
    const hash = documentHash(m.document);
    let topic = existingTopics.find((t) => t.slug === m.slug);
    if (!topic) {
      const created = await tx.topic.create({
        data: { tenantId, moduleId: mod.id, title: m.title, slug: m.slug, order: m.number, durationMinutes: m.minutes, status: "PUBLICADO", draft: docJson },
      });
      topic = { ...created, publishedVersion: null };
    } else {
      await tx.topic.update({ where: { id: topic.id }, data: { title: m.title, order: m.number, durationMinutes: m.minutes, status: "PUBLICADO", draft: docJson } });
    }
    const currentHash = topic.publishedVersion ? documentHash(topic.publishedVersion.document) : null;
    if (currentHash !== hash) {
      const last = await tx.topicVersion.aggregate({ where: { topicId: topic.id }, _max: { number: true } });
      const v = await tx.topicVersion.create({
        data: { tenantId, topicId: topic.id, number: (last._max.number ?? 0) + 1, document: docJson, authorId, changeNote: `Catálogo ${spec.code} v${spec.sheet.versao ?? "1.0"}` },
      });
      await tx.topic.update({ where: { id: topic.id }, data: { publishedVersionId: v.id } });
      report.versionsPublished++;
    }

    const existingQs = await tx.question.findMany({ where: { topicId: topic.id } });
    for (const q of m.questions) {
      const found = existingQs.find((e) => e.code === q.code);
      const payload = {
        objective: q.objective,
        bloom: q.bloom,
        kind: q.kind,
        isCase: q.isCase,
        stem: q.stem,
        options: q.options as unknown as Prisma.InputJsonValue,
        correct: q.correct,
        commentary: q.commentary,
        active: true,
      };
      if (!found) {
        await tx.question.create({ data: { ...payload, tenantId, topicId: topic.id, code: q.code } });
        report.questionsCreated++;
      } else {
        const storedHash = questionHash({
          code: found.code,
          objective: found.objective,
          bloom: found.bloom,
          kind: found.kind,
          isCase: found.isCase,
          stem: found.stem,
          options: found.options as { key: string; text: string }[],
          correct: found.correct,
          commentary: found.commentary,
        });
        if (storedHash !== questionHash(q) || !found.active) {
          await tx.question.update({ where: { id: found.id }, data: { ...payload, version: found.version + (storedHash !== questionHash(q) ? 1 : 0) } });
          report.questionsUpdated++;
        }
      }
    }
    const codes = new Set(m.questions.map((q) => q.code));
    const retired = existingQs.filter((e) => e.active && !codes.has(e.code));
    if (retired.length) {
      await tx.question.updateMany({ where: { id: { in: retired.map((r) => r.id) } }, data: { active: false } });
      report.questionsRetired += retired.length;
    }
  }
  // Módulos do curso que saíram do arquivo deixam de ser publicados (histórico preservado).
  const slugs = new Set(spec.modules.map((m) => m.slug));
  const orphan = existingTopics.filter((t) => !slugs.has(t.slug) && t.status === "PUBLICADO");
  if (orphan.length) await tx.topic.updateMany({ where: { id: { in: orphan.map((t) => t.id) } }, data: { status: "ARQUIVADO" } });
  return report;
}
