import type { Prisma } from "@prisma/client";
import pequenas from "../../content/courses/mentoria-financeira-pequenas/lessons.json";
import medias from "../../content/courses/mentoria-financeira-medias/lessons.json";
import { documentSchema } from "../../src/content-blocks/schema";
import { FINANCIAL_MENTORSHIPS, MENTORSHIP_SEGMENT } from "../../src/lib/mentorships";
import { MENTORSHIP_CONTENT } from "../../src/lib/courses/mentorship-content";

const LESSONS = { pequenas, medias } as const;

/**
 * Publica as apostilas das mentorias financeiras como capítulos das mentorias já existentes.
 * Executa uma vez por apostila e tenant; edições posteriores da equipe pedagógica são preservadas.
 */
export async function seedMentorshipContent(tx: Prisma.TransactionClient, tenantId: string, authorId: string) {
  const level = await tx.level.findUniqueOrThrow({ where: { tenantId_kind: { tenantId, kind: "MENTORIA" } } });
  for (const key of ["pequenas", "medias"] as const) {
    const content = MENTORSHIP_CONTENT[key]!;
    const data = LESSONS[key];
    const done = await tx.auditLog.findFirst({
      where: { tenantId, action: "curso.importado", entity: "Module", data: { path: ["source"], equals: content.source } },
      select: { id: true },
    });
    if (done) continue;
    const m = FINANCIAL_MENTORSHIPS.find((x) => x.key === key)!;
    const mod = await tx.module.findFirst({ where: { tenantId, levelId: level.id, slug: m.slug, segment: { slug: MENTORSHIP_SEGMENT.slug } } });
    if (!mod) continue;
    const lessons = data.topics.map((topic) => ({ ...topic, document: documentSchema.parse(topic.document) }));
    const existing = await tx.topic.findMany({ where: { tenantId, moduleId: mod.id }, select: { slug: true, order: true } });
    const clash = existing.find((t) => lessons.some((l) => l.slug === t.slug));
    if (clash) throw new Error(`A mentoria ${m.slug} já tem o assunto "${clash.slug}"; preserve o conteúdo existente antes de importar.`);
    const start = Math.max(0, ...existing.map((t) => t.order));
    for (const [index, lesson] of lessons.entries()) {
      const document = lesson.document as unknown as Prisma.InputJsonValue;
      const topic = await tx.topic.create({
        data: { tenantId, moduleId: mod.id, title: lesson.title, slug: lesson.slug, order: start + index + 1, durationMinutes: lesson.durationMinutes, status: "PUBLICADO", draft: document },
      });
      const version = await tx.topicVersion.create({
        data: { tenantId, topicId: topic.id, number: 1, document, authorId, changeNote: `Apostila fornecida pelo cliente; SHA-256 ${data.source.sha256}` },
      });
      await tx.topic.update({ where: { id: topic.id }, data: { publishedVersionId: version.id } });
    }
    const config = (mod.levelConfig ?? {}) as Record<string, unknown>;
    await tx.module.update({
      where: { id: mod.id },
      data: { workloadMinutes: content.hours * 60, levelConfig: { ...config, sourceKey: content.source, sourceSha256: data.source.sha256 } as Prisma.InputJsonValue },
    });
    await tx.auditLog.create({
      data: {
        tenantId,
        actorId: authorId,
        action: "curso.importado",
        entity: "Module",
        entityId: mod.id,
        data: { source: content.source, sha256: data.source.sha256, topics: lessons.length, hours: content.hours },
      },
    });
  }
}
