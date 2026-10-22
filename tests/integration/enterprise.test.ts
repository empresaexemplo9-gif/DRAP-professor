import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { withTenant } from "@/lib/db";
import { assignSeats, claimLicenseInvites, organizationReport, syncPoolEnrollments } from "@/lib/enterprise-server";

const run = process.env.DATABASE_URL ? describe : describe.skip;

run("Enterprise: vagas de empresa viram matrículas", () => {
  const db = new PrismaClient();
  const suffix = Date.now().toString(36);
  const existingEmail = `colab-${suffix}@empresa.test`;
  const invitedEmail = `novo-${suffix}@empresa.test`;
  const extraEmail = `extra-${suffix}@empresa.test`;
  let tenantId = "";
  let moduleId = "";
  let poolId = "";
  let orgId = "";
  const userIds: string[] = [];

  async function createUser(email: string) {
    const user = await db.user.create({ data: { id: `ent-${email}`, name: email.split("@")[0]!, email } });
    userIds.push(user.id);
    return user;
  }

  beforeAll(async () => {
    tenantId = (await db.tenant.create({ data: { name: "Enterprise teste", slug: `ent-${suffix}` } })).id;
    await createUser(existingEmail);
    await withTenant(tenantId, async (tx) => {
      const level = await tx.level.create({ data: { tenantId, kind: "TREINAMENTO", label: "Treinamentos", slug: "treinamentos", order: 0 } });
      const segment = await tx.segment.create({ data: { tenantId, name: "Vendas", slug: "vendas" } });
      const mod = await tx.module.create({ data: { tenantId, levelId: level.id, segmentId: segment.id, title: "Prospecção", slug: "prospeccao", status: "PUBLICADO" } });
      moduleId = mod.id;
      const org = await tx.organization.create({ data: { tenantId, name: "Cliente SA" } });
      orgId = org.id;
      poolId = (await tx.licensePool.create({ data: { tenantId, organizationId: org.id, moduleId, seats: 2 } })).id;
    });
  });

  afterAll(async () => {
    await db.tenant.deleteMany({ where: { id: tenantId } });
    await db.user.deleteMany({ where: { id: { in: userIds } } });
    await db.$disconnect();
  });

  it("ativa quem já tem conta, convida quem não tem e respeita o número de vagas", async () => {
    const result = await assignSeats({ tenantId, poolId, emails: [existingEmail, invitedEmail, extraEmail], team: "Comercial", actorId: "admin", ip: null });
    expect(result).toEqual({ activated: [existingEmail], invited: [invitedEmail], skipped: [{ email: extraEmail, reason: "sem vagas disponíveis" }] });
    const enrollment = await withTenant(tenantId, (tx) => tx.enrollment.findFirst({ where: { moduleId, user: { email: existingEmail } } }));
    expect(enrollment).toMatchObject({ origin: "LICENCA", status: "ATIVA" });
    const again = await assignSeats({ tenantId, poolId, emails: [existingEmail], team: null, actorId: "admin", ip: null });
    expect(again).toMatchObject({ skipped: [{ email: existingEmail, reason: "já tem vaga" }] });
  });

  it("convite vira matrícula no primeiro acesso, com a equipe informada pelo gestor", async () => {
    const user = await createUser(invitedEmail);
    expect(await claimLicenseInvites(tenantId, user)).toBe(1);
    const report = await organizationReport(tenantId, orgId);
    const learner = report!.pools[0]!.learners.find((l) => l.email === invitedEmail);
    expect(learner).toMatchObject({ status: "ATIVO", team: "Comercial" });
    expect(await claimLicenseInvites(tenantId, user)).toBe(0);
  });

  it("cancelar o contrato encerra os acessos por licença", async () => {
    await withTenant(tenantId, async (tx) => {
      await tx.licensePool.update({ where: { id: poolId }, data: { status: "CANCELED" } });
      await syncPoolEnrollments(tx, poolId);
    });
    const enrollments = await withTenant(tenantId, (tx) => tx.enrollment.findMany({ where: { moduleId } }));
    expect(enrollments).toHaveLength(2);
    expect(enrollments.every((e) => e.status === "CANCELADA")).toBe(true);
  });
});
