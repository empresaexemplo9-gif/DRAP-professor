import "server-only";
import type { LicenseAssignment, LicensePool } from "@prisma/client";
import { withTenant, type Tx } from "./db";
import { audit } from "./audit";
import { can } from "./rbac";
import { getViewer, type Viewer } from "./session";

/** Enterprise: vagas de empresas clientes viram matrículas com origem LICENCA. */

export async function managedOrganizations(viewer: Viewer) {
  return withTenant(viewer.tenant.id, (tx) =>
    tx.organization.findMany({
      where: { tenantId: viewer.tenant.id, status: "ACTIVE", members: { some: { userId: viewer.user.id, role: "GESTOR" } } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  );
}

/** Administrador da plataforma ou gestor da empresa (ativa). Lança erro para Server Actions e rotas. */
export async function assertOrgManager(organizationId: string) {
  const viewer = await getViewer();
  if (!viewer || viewer.disabled) throw new Error("Não autenticado");
  if (can(viewer.roles, "enterprise:manage")) return viewer;
  const member = await withTenant(viewer.tenant.id, (tx) =>
    tx.organizationMember.findFirst({
      where: { tenantId: viewer.tenant.id, organizationId, userId: viewer.user.id, role: "GESTOR", organization: { status: "ACTIVE" } },
      select: { id: true },
    }),
  );
  if (!member) throw new Error("Sem permissão");
  return viewer;
}

async function ensureLearner(tx: Tx, tenantId: string, organizationId: string, userId: string, team: string | null) {
  const membership = await tx.membership.findUnique({ where: { tenantId_userId: { tenantId, userId } } });
  if (!membership) await tx.membership.create({ data: { tenantId, userId, roles: ["ALUNO"] } });
  await tx.organizationMember.upsert({
    where: { organizationId_userId: { organizationId, userId } },
    create: { tenantId, organizationId, userId, role: "COLABORADOR", team },
    update: team ? { team } : {},
  });
}

/** Liga a vaga à matrícula. Matrícula ativa de outra origem (ex.: compra própria) é preservada. */
async function enrollFromSeat(tx: Tx, tenantId: string, pool: LicensePool, userId: string) {
  const existing = await tx.enrollment.findUnique({ where: { userId_moduleId: { userId, moduleId: pool.moduleId } } });
  if (existing && existing.status === "ATIVA" && existing.origin !== "LICENCA") return;
  if (existing?.status === "CONCLUIDA") return;
  await tx.enrollment.upsert({
    where: { userId_moduleId: { userId, moduleId: pool.moduleId } },
    create: { tenantId, userId, moduleId: pool.moduleId, origin: "LICENCA", status: "ATIVA", endsAt: pool.endsAt },
    update: { origin: "LICENCA", status: "ATIVA", endsAt: pool.endsAt, startsAt: existing?.status === "ATIVA" ? undefined : new Date() },
  });
}

async function activate(tx: Tx, tenantId: string, pool: LicensePool, assignment: LicenseAssignment, userId: string) {
  await ensureLearner(tx, tenantId, pool.organizationId, userId, assignment.team);
  await enrollFromSeat(tx, tenantId, pool, userId);
  await tx.licenseAssignment.update({ where: { id: assignment.id }, data: { status: "ATIVO", userId, activatedAt: new Date(), revokedAt: null } });
}

export type AssignResult = { activated: string[]; invited: string[]; skipped: { email: string; reason: string }[] };

export async function assignSeats(input: { tenantId: string; poolId: string; emails: string[]; team: string | null; actorId: string; ip: string | null }) {
  const { tenantId, poolId, emails, team, actorId, ip } = input;
  return withTenant(tenantId, async (tx): Promise<AssignResult | { error: string }> => {
    // Serializa atribuições do mesmo contrato para nunca passar do número de vagas.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`license-pool:${poolId}`}, 0))`;
    const pool = await tx.licensePool.findFirst({
      where: { id: poolId, tenantId },
      include: { organization: { select: { status: true } }, assignments: { select: { id: true, email: true, status: true } } },
    });
    if (!pool) return { error: "Contrato não encontrado." };
    if (pool.status !== "ACTIVE" || pool.organization.status !== "ACTIVE") return { error: "Este contrato não está ativo." };
    if (pool.endsAt && pool.endsAt <= new Date()) return { error: "A vigência deste contrato terminou." };

    const result: AssignResult = { activated: [], invited: [], skipped: [] };
    let free = pool.seats - pool.assignments.filter((a) => a.status !== "REVOGADO").length;
    const users = await tx.user.findMany({ where: { email: { in: emails } }, select: { id: true, email: true } });
    for (const email of emails) {
      const current = pool.assignments.find((a) => a.email === email);
      if (current && current.status !== "REVOGADO") {
        result.skipped.push({ email, reason: "já tem vaga" });
        continue;
      }
      if (free <= 0) {
        result.skipped.push({ email, reason: "sem vagas disponíveis" });
        continue;
      }
      const assignment = current
        ? await tx.licenseAssignment.update({ where: { id: current.id }, data: { status: "CONVIDADO", userId: null, team, assignedById: actorId, revokedAt: null, activatedAt: null } })
        : await tx.licenseAssignment.create({ data: { tenantId, poolId, email, team, assignedById: actorId } });
      free -= 1;
      const user = users.find((u) => u.email === email);
      if (user) {
        const membership = await tx.membership.findUnique({ where: { tenantId_userId: { tenantId, userId: user.id } }, select: { status: true } });
        if (membership?.status === "DISABLED") {
          // A vaga fica reservada como convite; a equipe da plataforma decide sobre a conta desativada.
          result.invited.push(email);
          continue;
        }
        await activate(tx, tenantId, pool, assignment, user.id);
        result.activated.push(email);
      } else {
        result.invited.push(email);
      }
    }
    await audit(tx, {
      tenantId,
      actorId,
      action: "licenca.vagas_atribuidas",
      entity: "LicensePool",
      entityId: poolId,
      data: { activated: result.activated.length, invited: result.invited.length, skipped: result.skipped.length, team },
      ip,
    });
    return result;
  });
}

/** Ativa convites pendentes do e-mail da pessoa (chamado ao entrar no painel). */
export async function claimLicenseInvites(tenantId: string, user: { id: string; email: string }) {
  return withTenant(tenantId, async (tx) => {
    const pending = await tx.licenseAssignment.findMany({
      where: { tenantId, email: user.email.toLowerCase(), status: "CONVIDADO", pool: { status: "ACTIVE", organization: { status: "ACTIVE" } } },
      include: { pool: true },
    });
    let claimed = 0;
    for (const a of pending) {
      if (a.pool.endsAt && a.pool.endsAt <= new Date()) continue;
      await activate(tx, tenantId, a.pool, a, user.id);
      await audit(tx, { tenantId, actorId: user.id, action: "licenca.convite_aceito", entity: "LicenseAssignment", entityId: a.id });
      claimed += 1;
    }
    return claimed;
  });
}

/** Mantém as matrículas LICENCA coerentes com o contrato e a empresa (status, vigência). */
export async function syncPoolEnrollments(tx: Tx, poolId: string) {
  const pool = await tx.licensePool.findUnique({
    where: { id: poolId },
    include: { organization: { select: { status: true } }, assignments: { where: { status: "ATIVO", userId: { not: null } }, select: { userId: true } } },
  });
  if (!pool) return;
  const live = pool.status === "ACTIVE" && pool.organization.status === "ACTIVE";
  const userIds = pool.assignments.map((a) => a.userId!).filter(Boolean);
  if (!userIds.length) return;
  await tx.enrollment.updateMany({
    where: { moduleId: pool.moduleId, userId: { in: userIds }, origin: "LICENCA", status: { in: ["ATIVA", "CANCELADA", "EXPIRADA"] } },
    data: live ? { status: "ATIVA", endsAt: pool.endsAt } : { status: "CANCELADA" },
  });
}

export async function syncOrganizationEnrollments(tx: Tx, organizationId: string) {
  const pools = await tx.licensePool.findMany({ where: { organizationId }, select: { id: true } });
  for (const p of pools) await syncPoolEnrollments(tx, p.id);
}

/** Progresso por colaborador: assuntos publicados concluídos no curso do contrato. */
export async function organizationReport(tenantId: string, organizationId: string) {
  return withTenant(tenantId, async (tx) => {
    const org = await tx.organization.findFirst({
      where: { id: organizationId, tenantId },
      include: {
        members: { include: { user: { select: { name: true, email: true } } } },
        pools: {
          orderBy: { createdAt: "desc" },
          include: {
            module: {
              select: {
                id: true, title: true, slug: true,
                level: { select: { label: true, slug: true } },
                segment: { select: { name: true, slug: true } },
                _count: { select: { topics: { where: { status: "PUBLICADO" } } } },
              },
            },
            assignments: { orderBy: { createdAt: "asc" }, include: { user: { select: { name: true } } } },
          },
        },
      },
    });
    if (!org) return null;
    const pools = [];
    for (const pool of org.pools) {
      const userIds = pool.assignments.map((a) => a.userId).filter((x): x is string => Boolean(x));
      const enrollments = userIds.length
        ? await tx.enrollment.findMany({
            where: { moduleId: pool.moduleId, userId: { in: userIds } },
            select: {
              userId: true, status: true,
              progress: { where: { status: "CONCLUIDO", topic: { status: "PUBLICADO" } }, select: { completedAt: true } },
            },
          })
        : [];
      const total = pool.module._count.topics;
      const learners = pool.assignments.map((a) => {
        const e = enrollments.find((x) => x.userId === a.userId);
        const done = e?.status === "CONCLUIDA" ? total : Math.min(e?.progress.length ?? 0, total);
        const last = e?.progress.reduce<Date | null>((d, p) => (p.completedAt && (!d || p.completedAt > d) ? p.completedAt : d), null) ?? null;
        const member = org.members.find((m) => m.userId === a.userId);
        const team = member?.team ?? a.team;
        return {
          id: a.id,
          email: a.email,
          name: a.user?.name ?? null,
          team,
          status: a.status,
          completedTopics: done,
          totalTopics: total,
          lastActivity: last,
          activatedAt: a.activatedAt,
        };
      });
      pools.push({ ...pool, learners });
    }
    return { ...org, pools };
  });
}

export type OrganizationReport = NonNullable<Awaited<ReturnType<typeof organizationReport>>>;
