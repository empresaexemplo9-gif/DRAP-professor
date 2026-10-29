import type { Prisma } from "@prisma/client";
import data from "../../content/courses/gestao-justa-de-equipes/lessons.json";
import { documentSchema } from "../../src/content-blocks/schema";
import { TEAM_COURSE, TEAM_COURSE_SOURCE } from "../../src/lib/courses/team-schedules";

/** Importa uma vez; repetições preservam rascunhos, versões, contratos e matrículas. */
export async function seedTeamCourse(tx: Prisma.TransactionClient, tenantId: string, authorId: string) {
  const lessons = data.topics.map((topic) => ({ ...topic, document: documentSchema.parse(topic.document) }));
  const imported = await tx.auditLog.findFirst({
    where: { tenantId, action: "curso.importado", entity: "Module", data: { path: ["source"], equals: TEAM_COURSE_SOURCE } },
    orderBy: { createdAt: "desc" },
    select: { entityId: true },
  });
  if (imported?.entityId) {
    const course = await tx.module.findFirst({ where: { id: imported.entityId, tenantId } });
    if (course) return course;
  }
  const level = await tx.level.findUniqueOrThrow({ where: { tenantId_kind: { tenantId, kind: "TREINAMENTO" } } });
  const segment = await tx.segment.upsert({
    where: { tenantId_slug: { tenantId, slug: TEAM_COURSE.segment.slug } },
    create: {
      tenantId,
      ...TEAM_COURSE.segment,
      description: "Liderança, organização do trabalho e cuidado com as pessoas para equipes que entregam melhor.",
      order: 5,
    },
    update: {},
  });
  const existing = await tx.module.findUnique({
    where: { levelId_segmentId_slug: { levelId: level.id, segmentId: segment.id, slug: TEAM_COURSE.slug } },
  });
  if (existing) {
    const config = existing.levelConfig as Record<string, unknown>;
    if (config.sourceKey !== TEAM_COURSE_SOURCE)
      throw new Error("Já existe um treinamento neste endereço; preserve o conteúdo existente antes de importar.");
    return existing;
  }
  const course = await tx.module.create({
    data: {
      tenantId,
      levelId: level.id,
      segmentId: segment.id,
      title: TEAM_COURSE.title,
      slug: TEAM_COURSE.slug,
      summary:
        "Curso livre de 12 horas para gestores, encarregados, supervisores e líderes de turno: papel gerencial, escalas claras e previsíveis, comunicação justa, feedback, saúde mental e riscos psicossociais, conflitos e um plano de aplicação de 30 dias.",
      workloadMinutes: TEAM_COURSE.hours * 60,
      certificateType: "LIVRE",
      audience: "EMPRESA",
      status: "PUBLICADO",
      order: 0,
      levelConfig: {
        targetAudience: "Gestores, encarregados, supervisores e líderes de turno",
        deadlineDays: 30,
        teamGoalPercent: 90,
        sourceKey: TEAM_COURSE_SOURCE,
        sourceSha256: data.source.sha256,
      },
    },
  });
  for (const [index, lesson] of lessons.entries()) {
    const document = lesson.document as unknown as Prisma.InputJsonValue;
    const topic = await tx.topic.create({
      data: { tenantId, moduleId: course.id, title: lesson.title, slug: lesson.slug, order: index + 1, durationMinutes: lesson.durationMinutes, status: "PUBLICADO", draft: document },
    });
    const version = await tx.topicVersion.create({
      data: { tenantId, topicId: topic.id, number: 1, document, authorId, changeNote: `Apostila fornecida pelo cliente; SHA-256 ${data.source.sha256}` },
    });
    await tx.topic.update({ where: { id: topic.id }, data: { publishedVersionId: version.id } });
  }
  await tx.auditLog.create({
    data: {
      tenantId,
      actorId: authorId,
      action: "curso.importado",
      entity: "Module",
      entityId: course.id,
      data: { source: TEAM_COURSE_SOURCE, sha256: data.source.sha256, topics: lessons.length, hours: TEAM_COURSE.hours },
    },
  });
  return course;
}
