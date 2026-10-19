import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { seedBusinessCourse } from "../../prisma/courses/business-management";
import { BUSINESS_COURSE } from "@/lib/courses/business-management";

const run = process.env.DATABASE_URL ? describe : describe.skip;

run("publicação idempotente da apostila", () => {
  const db = new PrismaClient();
  afterAll(() => db.$disconnect());

  it("publica todos os capítulos e preserva edições e versões ao repetir a instalação", async () => {
    const rollback = new Error("ROLLBACK_COURSE_TEST");
    let tenantId = "";
    try {
      await db.$transaction(
        async (tx) => {
          const tenant = await tx.tenant.create({
            data: { name: "Verificação de importação", slug: `import-${Date.now()}` },
          });
          tenantId = tenant.id;
          await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenant.id}, true)`;
          await tx.level.create({
            data: { tenantId: tenant.id, kind: "CURSO", label: "Cursos", slug: "cursos", order: 0 },
          });
          const course = await seedBusinessCourse(tx, tenant.id, "course-import-test");
          expect(course.status).toBe("PUBLICADO");
          expect(course.workloadMinutes).toBe(12000);
          const topics = await tx.topic.findMany({
            where: { moduleId: course.id },
            orderBy: { order: "asc" },
            include: { publishedVersion: true },
          });
          expect(topics).toHaveLength(25);
          expect(topics.every((topic) => topic.status === "PUBLICADO" && topic.publishedVersion)).toBe(true);
          const first = topics[0]!;
          await tx.topic.update({
            where: { id: first.id },
            data: {
              title: "Título revisado pela equipe",
              draft: { schemaVersion: 2, title: "Rascunho revisado", sections: [] },
            },
          });
          await tx.module.update({
            where: { id: course.id },
            data: { title: "Curso com apresentação personalizada", levelConfig: {}, slug: "gestao-personalizada" },
          });
          await seedBusinessCourse(tx, tenant.id, "course-import-test");
          expect(await tx.topic.count({ where: { moduleId: course.id } })).toBe(25);
          expect(await tx.topicVersion.count({ where: { topic: { moduleId: course.id } } })).toBe(25);
          expect((await tx.topic.findUniqueOrThrow({ where: { id: first.id } })).title).toBe(
            "Título revisado pela equipe",
          );
          expect((await tx.module.findUniqueOrThrow({ where: { id: course.id } })).title).toBe(
            "Curso com apresentação personalizada",
          );
          throw rollback;
        },
        { timeout: 25000 },
      );
    } catch (error) {
      if (error !== rollback) throw error;
    }
    expect(await db.tenant.findUnique({ where: { id: tenantId } })).toBeNull();
  });

  it("não substitui um curso já existente que não pertence a esta importação", async () => {
    const rollback = new Error("ROLLBACK_CONFLICT_TEST");
    try {
      await db.$transaction(
        async (tx) => {
          const tenant = await tx.tenant.create({
            data: { name: "Verificação de conflito", slug: `conflict-${Date.now()}` },
          });
          await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenant.id}, true)`;
          const level = await tx.level.create({
            data: { tenantId: tenant.id, kind: "CURSO", label: "Cursos", slug: "cursos", order: 0 },
          });
          const segment = await tx.segment.create({ data: { tenantId: tenant.id, ...BUSINESS_COURSE.segment } });
          const existing = await tx.module.create({
            data: {
              tenantId: tenant.id,
              levelId: level.id,
              segmentId: segment.id,
              slug: BUSINESS_COURSE.slug,
              title: "Conteúdo anterior",
            },
          });
          await expect(seedBusinessCourse(tx, tenant.id, "course-import-test")).rejects.toThrow(/Já existe um curso/);
          expect((await tx.module.findUniqueOrThrow({ where: { id: existing.id } })).title).toBe("Conteúdo anterior");
          throw rollback;
        },
        { timeout: 25000 },
      );
    } catch (error) {
      if (error !== rollback) throw error;
    }
  });
});
