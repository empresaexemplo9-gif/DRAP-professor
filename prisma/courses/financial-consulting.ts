import type { Prisma } from "@prisma/client";
import data from "../../content/courses/consultoria-financeira/lessons.json";
import { documentSchema } from "../../src/content-blocks/schema";
import { FINANCIAL_COURSE, FINANCIAL_COURSE_SOURCE } from "../../src/lib/courses/financial-consulting";

/** Importa uma vez; repetições preservam rascunhos, versões e matrículas da equipe. */
export async function seedFinancialCourse(tx: Prisma.TransactionClient, tenantId: string, authorId: string) {
  const lessons = data.topics.map((topic) => ({ ...topic, document: documentSchema.parse(topic.document) }));
  const level = await tx.level.findUniqueOrThrow({ where: { tenantId_kind: { tenantId, kind: "CURSO" } } });
  // A identidade da importação vive também na auditoria: o editor pode substituir
  // levelConfig ou renomear o endereço sem provocar uma nova importação.
  const imported = await tx.auditLog.findFirst({
    where: {
      tenantId,
      action: "curso.importado",
      entity: "Module",
      data: { path: ["source"], equals: FINANCIAL_COURSE_SOURCE },
    },
    orderBy: { createdAt: "desc" },
    select: { entityId: true },
  });
  if (imported?.entityId) {
    const course = await tx.module.findFirst({ where: { id: imported.entityId, tenantId } });
    if (course) return course;
  }
  const segment = await tx.segment.upsert({
    where: { tenantId_slug: { tenantId, slug: FINANCIAL_COURSE.segment.slug } },
    create: {
      tenantId,
      ...FINANCIAL_COURSE.segment,
      description: "Formação em finanças, planejamento e análise de negócios.",
      order: 1,
    },
    update: {},
  });
  const existing = await tx.module.findUnique({
    where: { levelId_segmentId_slug: { levelId: level.id, segmentId: segment.id, slug: FINANCIAL_COURSE.slug } },
  });
  if (existing) {
    const config = existing.levelConfig as Record<string, unknown>;
    if (config.sourceKey !== FINANCIAL_COURSE_SOURCE)
      throw new Error(
        "Já existe um curso de Consultoria Financeira neste endereço; preserve o conteúdo existente antes de importar.",
      );
    // Uma nova edição da apostila deve ser publicada como nova versão pela equipe.
    return existing;
  }
  const course = await tx.module.create({
    data: {
      tenantId,
      levelId: level.id,
      segmentId: segment.id,
      title: FINANCIAL_COURSE.title,
      slug: FINANCIAL_COURSE.slug,
      summary:
        "Formação profissional de 400 horas em 18 módulos: diagnóstico, finanças corporativas, valuation, investimentos, planejamento patrimonial e consultoria. Inclui casos, 18 exercícios resolvidos e projeto final.",
      workloadMinutes: 400 * 60,
      certificateType: "LIVRE",
      status: "PUBLICADO",
      order: 0,
      levelConfig: {
        sequential: false,
        finalExam: true,
        minScore: 80,
        sourceKey: FINANCIAL_COURSE_SOURCE,
        sourceManifest: data.sources,
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
        changeNote: `Apostila fornecida pelo usuário; SHA-256 ${data.sources[0]!.sha256}`,
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
      data: { source: FINANCIAL_COURSE_SOURCE, sources: data.sources, topics: lessons.length, hours: 400 },
    },
  });
  return course;
}
