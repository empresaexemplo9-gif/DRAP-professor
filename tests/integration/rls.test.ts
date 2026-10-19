import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";

/**
 * Isolamento entre tenants pelo banco (Row-Level Security), conectando com o papel da
 * aplicação (DATABASE_URL = drap_app). Executa só quando há banco disponível.
 */
const url = process.env.DATABASE_URL;
const run = url ? describe : describe.skip;

run("Row-Level Security", () => {
  const db = new PrismaClient();
  let a = "";
  let b = "";

  async function inTenant<T>(tenantId: string, fn: (tx: Parameters<Parameters<typeof db.$transaction>[0]>[0]) => Promise<T>) {
    return db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
      return fn(tx);
    });
  }

  beforeAll(async () => {
    const suffix = Date.now().toString(36);
    a = (await db.tenant.create({ data: { name: "RLS A", slug: `rls-a-${suffix}` } })).id;
    b = (await db.tenant.create({ data: { name: "RLS B", slug: `rls-b-${suffix}` } })).id;
    await inTenant(a, (tx) => tx.segment.create({ data: { tenantId: a, name: "Segredo de A", slug: "segredo" } }));
  });

  afterAll(async () => {
    await inTenant(a, (tx) => tx.segment.deleteMany({ where: { tenantId: a } }));
    await db.tenant.deleteMany({ where: { id: { in: [a, b] } } });
    await db.$disconnect();
  });

  it("o tenant dono enxerga os próprios dados", async () => {
    const rows = await inTenant(a, (tx) => tx.segment.findMany({ where: { slug: "segredo", tenantId: a } }));
    expect(rows).toHaveLength(1);
  });

  it("outro tenant não enxerga, mesmo com consulta sem filtro", async () => {
    const rows = await inTenant(b, (tx) => tx.segment.findMany({ where: { name: "Segredo de A" } }));
    expect(rows).toHaveLength(0);
  });

  it("sem tenant definido, nada é visível (falha fechada)", async () => {
    const rows = await db.segment.findMany({ where: { name: "Segredo de A" } });
    expect(rows).toHaveLength(0);
  });

  it("não é possível gravar dados em nome de outro tenant", async () => {
    await expect(inTenant(b, (tx) => tx.segment.create({ data: { tenantId: a, name: "Invasão", slug: "invasao" } }))).rejects.toThrow();
  });

  it("auditoria é somente inserção", async () => {
    await inTenant(a, (tx) => tx.auditLog.create({ data: { tenantId: a, action: "teste", entity: "Teste" } }));
    await expect(inTenant(a, (tx) => tx.auditLog.deleteMany({ where: { tenantId: a } }))).rejects.toThrow();
  });
});
