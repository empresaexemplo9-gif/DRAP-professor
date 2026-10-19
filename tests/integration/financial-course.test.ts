import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { seedFinancialCourse } from "../../prisma/courses/financial-consulting";
import { readFinancialNotebook, saveFinancialNotebook } from "@/lib/courses/financial-practice";
const run = process.env.DATABASE_URL ? describe : describe.skip;
run("publicação e caderno de Consultoria Financeira", () => {
  const db = new PrismaClient();
  afterAll(() => db.$disconnect());
  it("publica uma vez e isola respostas por aluno, matrícula e tenant", async () => {
    const rollback = new Error("ROLLBACK_FINANCIAL_COURSE");
    let tenantId = "";
    let topicId = "";
    try {
      await db.$transaction(
        async (tx) => {
          const suffix = Date.now().toString(36);
          const tenant = await tx.tenant.create({ data: { name: "Financial test", slug: `financial-${suffix}` } });
          tenantId = tenant.id;
          await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenant.id}, true)`;
          await tx.level.create({
            data: { tenantId: tenant.id, kind: "CURSO", label: "Cursos", slug: "cursos", order: 0 },
          });
          const course = await seedFinancialCourse(tx, tenant.id, "financial-course-test");
          expect(course.status).toBe("PUBLICADO");
          expect(course.workloadMinutes).toBe(24000);
          const topics = await tx.topic.findMany({
            where: { moduleId: course.id },
            include: { publishedVersion: true },
            orderBy: { order: "asc" },
          });
          expect(topics).toHaveLength(21);
          expect(topics.every((t) => t.publishedVersion && t.status === "PUBLICADO")).toBe(true);
          const topic = topics[1]!;
          topicId = topic.id;
          const a = await tx.user.create({
            data: { id: randomUUID(), name: "A", email: `financial-a-${suffix}@example.invalid` },
          });
          const b = await tx.user.create({
            data: { id: randomUUID(), name: "B", email: `financial-b-${suffix}@example.invalid` },
          });
          const ea = await tx.enrollment.create({ data: { tenantId: tenant.id, userId: a.id, moduleId: course.id } });
          expect(
            await saveFinancialNotebook(tx, tenant.id, b.id, topic.id, { "cf-01-base-1": "Intrusão" }),
          ).toMatchObject({ ok: false });
          expect(await readFinancialNotebook(tx, tenant.id, b.id, topic.id)).toBeNull();
          expect(
            await saveFinancialNotebook(tx, tenant.id, a.id, topic.id, { "cf-02-base-1": "Questão de outro módulo" }),
          ).toMatchObject({ ok: false });
          expect(
            await saveFinancialNotebook(tx, tenant.id, a.id, topic.id, { "cf-01-base-1": "a".repeat(6001) }),
          ).toMatchObject({ ok: false });
          expect(
            await saveFinancialNotebook(tx, tenant.id, a.id, topic.id, { "cf-01-base-1": "Resposta privada A" }),
          ).toMatchObject({ ok: true });
          await tx.enrollment.create({ data: { tenantId: tenant.id, userId: b.id, moduleId: course.id } });
          expect(await readFinancialNotebook(tx, tenant.id, b.id, topic.id)).toEqual({});
          expect(
            await saveFinancialNotebook(tx, tenant.id, b.id, topic.id, { "cf-01-base-1": "Resposta B" }),
          ).toMatchObject({ ok: true });
          expect(await readFinancialNotebook(tx, tenant.id, a.id, topic.id)).toEqual({
            "cf-01-base-1": "Resposta privada A",
          });
          await tx.enrollment.update({ where: { id: ea.id }, data: { status: "CANCELADA" } });
          expect(await readFinancialNotebook(tx, tenant.id, a.id, topic.id)).toBeNull();
          expect(await saveFinancialNotebook(tx, tenant.id, a.id, topic.id, {})).toMatchObject({ ok: false });
          await tx.module.update({
            where: { id: course.id },
            data: { title: "Edição pedagógica preservada", levelConfig: {}, slug: "personalizado" },
          });
          expect((await seedFinancialCourse(tx, tenant.id, "financial-course-test")).id).toBe(course.id);
          expect(await tx.topicVersion.count({ where: { topic: { moduleId: course.id } } })).toBe(21);
          const other = await tx.tenant.create({ data: { name: "Other tenant", slug: `financial-other-${suffix}` } });
          await tx.$executeRaw`SELECT set_config('app.tenant_id', ${other.id}, true)`;
          expect(await tx.studyNotebook.findMany()).toHaveLength(0);
          await expect(
            tx.studyNotebook.create({
              data: { tenantId: other.id, enrollmentId: ea.id, topicId: topic.id, answers: {} },
            }),
          ).rejects.toThrow();
          // A falha RLS aborta a transação: tudo permanece somente como teste.
          throw rollback;
        },
        { timeout: 25000 },
      );
    } catch (error) {
      if (error !== rollback) throw error;
    }
    expect(await db.tenant.findUnique({ where: { id: tenantId } })).toBeNull();
    expect(await db.studyNotebook.findMany({ where: { topicId } })).toHaveLength(0);
  });
});
