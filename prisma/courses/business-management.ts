import type { Prisma } from "@prisma/client";
import data from "../../content/courses/gestao-de-empresas/lessons.json";
import { documentSchema } from "../../src/content-blocks/schema";
import { BUSINESS_COURSE, BUSINESS_COURSE_SOURCE } from "../../src/lib/courses/business-management";

/** Importa uma vez; repetições preservam rascunhos, versões e matrículas da equipe. */
export async function seedBusinessCourse(tx: Prisma.TransactionClient, tenantId: string, authorId: string) {
  const lessons = data.topics.map((topic) => ({ ...topic, document: documentSchema.parse(topic.document) }));
  const level = await tx.level.findUniqueOrThrow({ where: { tenantId_kind: { tenantId, kind: "CURSO" } } });
  // A identidade da importação vive também na auditoria: o editor pode substituir
  // levelConfig ou renomear o endereço sem provocar uma nova importação.
  const imported = await tx.auditLog.findFirst({
    where: {
      tenantId,
      action: "curso.importado",
      entity: "Module",
      data: { path: ["source"], equals: BUSINESS_COURSE_SOURCE },
    },
    orderBy: { createdAt: "desc" },
    select: { entityId: true },
  });
  if (imported?.entityId) {
    const course = await tx.module.findFirst({ where: { id: imported.entityId, tenantId } });
    if (course) return course;
  }
  const segment = await tx.segment.upsert({
    where: { tenantId_slug: { tenantId, slug: BUSINESS_COURSE.segment.slug } },
    create: {
      tenantId,
      ...BUSINESS_COURSE.segment,
      description:
        "Administração, estratégia e desenvolvimento de negócios. Conhecimento para planejar, gerir e fazer empresas evoluírem.",
      order: 4,
    },
    update: {},
  });
  const existing = await tx.module.findUnique({
    where: { levelId_segmentId_slug: { levelId: level.id, segmentId: segment.id, slug: BUSINESS_COURSE.slug } },
  });
  if (existing) {
    const config = existing.levelConfig as Record<string, unknown>;
    if (config.sourceKey !== BUSINESS_COURSE_SOURCE)
      throw new Error(
        "Já existe um curso de Gestão de Empresas neste endereço; preserve o conteúdo existente antes de importar.",
      );
    // Uma nova edição da apostila deve ser publicada como nova versão pela equipe.
    return existing;
  }
  const course = await tx.module.create({
    data: {
      tenantId,
      levelId: level.id,
      segmentId: segment.id,
      title: BUSINESS_COURSE.title,
      slug: BUSINESS_COURSE.slug,
      summary:
        "Uma formação de 200 horas para compreender, planejar e gerir empresas. São 18 módulos, estudos de caso, atividades práticas, 36 questões de fixação e um projeto integrador de Plano de Gestão.",
      workloadMinutes: 200 * 60,
      certificateType: "LIVRE",
      status: "PUBLICADO",
      order: 0,
      levelConfig: {
        sequential: false,
        finalExam: true,
        minScore: 70,
        sourceKey: BUSINESS_COURSE_SOURCE,
        sourceSha256: data.source.sha256,
      },
    },
  });
  for (const [index, lesson] of lessons.entries()) {
    const document = lesson.document as unknown as Prisma.InputJsonValue;
    const topic = await tx.topic.create({
      data: {
        tenantId,
        moduleId: course.id,
        title: lesson.title,
        slug: lesson.slug,
        order: index + 1,
        durationMinutes: lesson.durationMinutes,
        status: "PUBLICADO",
        draft: document,
      },
    });
    const version = await tx.topicVersion.create({
      data: {
        tenantId,
        topicId: topic.id,
        number: 1,
        document,
        authorId,
        changeNote: `Apostila fornecida pelo usuário; SHA-256 ${data.source.sha256}`,
      },
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
      data: { source: BUSINESS_COURSE_SOURCE, sha256: data.source.sha256, topics: lessons.length, hours: 200 },
    },
  });
  return course;
}
