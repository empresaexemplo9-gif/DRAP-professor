"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma, withTenant } from "@/lib/db";
import { assertPermission, clientIp } from "@/lib/session";
import { audit } from "@/lib/audit";
import { isValidCnpj, onlyDigits } from "@/lib/cpf";
import { parseEndDate } from "@/lib/enrollments";
import { parsePriceToCents } from "@/lib/payments/pix-state";
import { syncOrganizationEnrollments, syncPoolEnrollments } from "@/lib/enterprise-server";

export type EnterpriseState = { error?: string; ok?: boolean; message?: string; fieldErrors?: Record<string, string> };

const optionalText = (max: number) => z.string().trim().max(max).optional().transform((v) => v || null);

const orgSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da empresa").max(120),
  legalName: optionalText(160),
  cnpj: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? onlyDigits(v) : null))
    .refine((v) => v == null || isValidCnpj(v), "CNPJ inválido"),
  contactName: optionalText(120),
  contactEmail: z.string().trim().toLowerCase().email("E-mail inválido").optional().or(z.literal("").transform(() => undefined)).transform((v) => v || null),
  contactPhone: optionalText(30),
  notes: optionalText(1000),
});

function parseOrg(fd: FormData) {
  const raw = Object.fromEntries(["name", "legalName", "cnpj", "contactName", "contactEmail", "contactPhone", "notes"].map((k) => [k, fd.get(k) ?? undefined]));
  const parsed = orgSchema.safeParse(raw);
  if (parsed.success) return { data: parsed.data };
  const fieldErrors: Record<string, string> = {};
  for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
  return { fieldErrors };
}

function refresh(id?: string) {
  revalidatePath("/painel/empresas");
  if (id) revalidatePath(`/painel/empresas/${id}`);
  revalidatePath("/painel/empresa");
}

export async function createOrganizationAction(_: EnterpriseState, fd: FormData): Promise<EnterpriseState> {
  const viewer = await assertPermission("enterprise:manage");
  const parsed = parseOrg(fd);
  if (!parsed.data) return { error: "Revise os campos destacados.", fieldErrors: parsed.fieldErrors };
  const tenantId = viewer.tenant.id;
  const ip = await clientIp();
  const created = await withTenant(tenantId, async (tx) => {
    if (parsed.data.cnpj && (await tx.organization.findFirst({ where: { tenantId, cnpj: parsed.data.cnpj }, select: { id: true } }))) return null;
    const org = await tx.organization.create({ data: { tenantId, ...parsed.data } });
    await audit(tx, { tenantId, actorId: viewer.user.id, action: "empresa.criada", entity: "Organization", entityId: org.id, data: { name: org.name }, ip });
    return org;
  });
  if (!created) return { error: "Já existe uma empresa com este CNPJ.", fieldErrors: { cnpj: "CNPJ já cadastrado" } };
  refresh();
  redirect(`/painel/empresas/${created.id}`);
}

export async function updateOrganizationAction(_: EnterpriseState, fd: FormData): Promise<EnterpriseState> {
  const viewer = await assertPermission("enterprise:manage");
  const id = z.string().uuid().safeParse(fd.get("organizationId"));
  const status = z.enum(["ACTIVE", "SUSPENDED"]).safeParse(fd.get("status"));
  if (!id.success || !status.success) return { error: "Dados inválidos." };
  const parsed = parseOrg(fd);
  if (!parsed.data) return { error: "Revise os campos destacados.", fieldErrors: parsed.fieldErrors };
  const tenantId = viewer.tenant.id;
  const ip = await clientIp();
  const result = await withTenant(tenantId, async (tx): Promise<EnterpriseState> => {
    const before = await tx.organization.findFirst({ where: { id: id.data, tenantId } });
    if (!before) return { error: "Empresa não encontrada." };
    if (parsed.data.cnpj && (await tx.organization.findFirst({ where: { tenantId, cnpj: parsed.data.cnpj, id: { not: before.id } }, select: { id: true } }))) {
      return { error: "Já existe uma empresa com este CNPJ.", fieldErrors: { cnpj: "CNPJ já cadastrado" } };
    }
    await tx.organization.update({ where: { id: before.id }, data: { ...parsed.data, status: status.data } });
    if (before.status !== status.data) await syncOrganizationEnrollments(tx, before.id);
    await audit(tx, { tenantId, actorId: viewer.user.id, action: before.status !== status.data ? (status.data === "SUSPENDED" ? "empresa.suspensa" : "empresa.reativada") : "empresa.alterada", entity: "Organization", entityId: before.id, ip });
    return { ok: true, message: status.data === "SUSPENDED" && before.status !== status.data ? "Empresa suspensa: os acessos por licença foram pausados." : "Dados da empresa salvos." };
  });
  if (result.ok) refresh(id.data);
  return result;
}

export async function addManagerAction(_: EnterpriseState, fd: FormData): Promise<EnterpriseState> {
  const viewer = await assertPermission("enterprise:manage");
  const id = z.string().uuid().safeParse(fd.get("organizationId"));
  const email = z.string().trim().toLowerCase().email().safeParse(fd.get("email"));
  if (!id.success) return { error: "Empresa inválida." };
  if (!email.success) return { error: "Informe um e-mail válido." };
  const user = await prisma.user.findUnique({ where: { email: email.data }, select: { id: true, name: true } });
  if (!user) return { error: "Esta pessoa ainda não tem conta. Peça que se cadastre com este e-mail (ou convide em Usuários) e tente novamente." };
  const tenantId = viewer.tenant.id;
  const ip = await clientIp();
  const result = await withTenant(tenantId, async (tx): Promise<EnterpriseState> => {
    const org = await tx.organization.findFirst({ where: { id: id.data, tenantId }, select: { id: true } });
    if (!org) return { error: "Empresa não encontrada." };
    const membership = await tx.membership.findUnique({ where: { tenantId_userId: { tenantId, userId: user.id } } });
    if (!membership) await tx.membership.create({ data: { tenantId, userId: user.id, roles: ["ALUNO"] } });
    await tx.organizationMember.upsert({
      where: { organizationId_userId: { organizationId: org.id, userId: user.id } },
      create: { tenantId, organizationId: org.id, userId: user.id, role: "GESTOR" },
      update: { role: "GESTOR" },
    });
    await audit(tx, { tenantId, actorId: viewer.user.id, action: "empresa.gestor_adicionado", entity: "Organization", entityId: org.id, data: { userId: user.id }, ip });
    return { ok: true, message: `${user.name} agora é gestor(a) da empresa.` };
  });
  if (result.ok) refresh(id.data);
  return result;
}

export async function removeManagerAction(fd: FormData) {
  const viewer = await assertPermission("enterprise:manage");
  const memberId = z.string().uuid().parse(fd.get("memberId"));
  const tenantId = viewer.tenant.id;
  const orgId = await withTenant(tenantId, async (tx) => {
    const m = await tx.organizationMember.findFirst({ where: { id: memberId, tenantId } });
    if (!m) return null;
    await tx.organizationMember.update({ where: { id: m.id }, data: { role: "COLABORADOR" } });
    await audit(tx, { tenantId, actorId: viewer.user.id, action: "empresa.gestor_removido", entity: "Organization", entityId: m.organizationId, data: { userId: m.userId }, ip: await clientIp() });
    return m.organizationId;
  });
  if (orgId) refresh(orgId);
}

const poolSchema = z.object({
  seats: z.coerce.number({ invalid_type_error: "Informe a quantidade" }).int().min(1, "Mínimo de 1 vaga").max(100_000),
  goalPercent: z.coerce.number().int().min(0).max(100).default(90),
  note: optionalText(500),
});

function parsePool(fd: FormData) {
  const base = poolSchema.safeParse({ seats: fd.get("seats"), goalPercent: fd.get("goalPercent") || undefined, note: fd.get("note") ?? undefined });
  if (!base.success) return { error: base.error.issues[0]?.message ?? "Dados inválidos." };
  const endsAt = parseEndDate(fd.get("endsAt"));
  const dueAt = parseEndDate(fd.get("dueAt"));
  if (endsAt === undefined || dueAt === undefined) return { error: "Data inválida." };
  if (endsAt && dueAt && dueAt > endsAt) return { error: "O prazo de conclusão precisa ser anterior ao fim da vigência." };
  const contract = parsePriceToCents(fd.get("contract"));
  if (contract != null && (!Number.isFinite(contract) || contract < 0)) return { error: "Valor do contrato inválido." };
  return { data: { ...base.data, endsAt, dueAt, contractCents: contract } };
}

export async function createPoolAction(_: EnterpriseState, fd: FormData): Promise<EnterpriseState> {
  const viewer = await assertPermission("enterprise:manage");
  const orgId = z.string().uuid().safeParse(fd.get("organizationId"));
  const moduleId = z.string().uuid().safeParse(fd.get("moduleId"));
  if (!orgId.success) return { error: "Empresa inválida." };
  if (!moduleId.success) return { error: "Escolha o curso ou treinamento." };
  const parsed = parsePool(fd);
  if (!parsed.data) return { error: parsed.error };
  if (parsed.data.endsAt && parsed.data.endsAt <= new Date()) return { error: "O fim da vigência precisa ser uma data futura." };
  const tenantId = viewer.tenant.id;
  const ip = await clientIp();
  const result = await withTenant(tenantId, async (tx): Promise<EnterpriseState> => {
    const org = await tx.organization.findFirst({ where: { id: orgId.data, tenantId }, select: { id: true } });
    const mod = await tx.module.findFirst({ where: { id: moduleId.data, tenantId, status: { not: "ARQUIVADO" } }, select: { id: true, title: true } });
    if (!org || !mod) return { error: "Empresa ou curso não encontrado." };
    const pool = await tx.licensePool.create({ data: { tenantId, organizationId: org.id, moduleId: mod.id, ...parsed.data } });
    await audit(tx, { tenantId, actorId: viewer.user.id, action: "licenca.contrato_criado", entity: "LicensePool", entityId: pool.id, data: { moduleId: mod.id, seats: pool.seats }, ip });
    return { ok: true, message: `${pool.seats} vaga(s) de ${mod.title} adicionadas.` };
  });
  if (result.ok) refresh(orgId.data);
  return result;
}

export async function updatePoolAction(_: EnterpriseState, fd: FormData): Promise<EnterpriseState> {
  const viewer = await assertPermission("enterprise:manage");
  const poolId = z.string().uuid().safeParse(fd.get("poolId"));
  const status = z.enum(["ACTIVE", "CANCELED"]).safeParse(fd.get("status"));
  if (!poolId.success || !status.success) return { error: "Dados inválidos." };
  const parsed = parsePool(fd);
  if (!parsed.data) return { error: parsed.error };
  const tenantId = viewer.tenant.id;
  const ip = await clientIp();
  let orgId = "";
  const result = await withTenant(tenantId, async (tx): Promise<EnterpriseState> => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`license-pool:${poolId.data}`}, 0))`;
    const before = await tx.licensePool.findFirst({ where: { id: poolId.data, tenantId }, include: { assignments: { where: { status: { not: "REVOGADO" } }, select: { id: true } } } });
    if (!before) return { error: "Contrato não encontrado." };
    orgId = before.organizationId;
    if (parsed.data.seats < before.assignments.length) return { error: `Já há ${before.assignments.length} vagas em uso; libere vagas antes de reduzir.` };
    await tx.licensePool.update({ where: { id: before.id }, data: { ...parsed.data, status: status.data } });
    await syncPoolEnrollments(tx, before.id);
    await audit(tx, {
      tenantId,
      actorId: viewer.user.id,
      action: status.data === "CANCELED" && before.status !== "CANCELED" ? "licenca.contrato_cancelado" : "licenca.contrato_alterado",
      entity: "LicensePool",
      entityId: before.id,
      data: { before: { seats: before.seats, status: before.status, endsAt: before.endsAt?.toISOString() ?? null }, after: { seats: parsed.data.seats, status: status.data, endsAt: parsed.data.endsAt?.toISOString() ?? null } },
      ip,
    });
    return { ok: true, message: status.data === "CANCELED" ? "Contrato cancelado; os acessos por licença foram encerrados." : "Contrato atualizado." };
  });
  if (result.ok) refresh(orgId);
  return result;
}

export async function updateLeadStatusAction(fd: FormData) {
  const viewer = await assertPermission("enterprise:manage");
  const id = z.string().uuid().parse(fd.get("leadId"));
  const status = z.enum(["NOVO", "EM_CONTATO", "FECHADO", "DESCARTADO"]).parse(fd.get("status"));
  await withTenant(viewer.tenant.id, (tx) => tx.enterpriseLead.updateMany({ where: { id, tenantId: viewer.tenant.id }, data: { status } }));
  revalidatePath("/painel/empresas");
}
