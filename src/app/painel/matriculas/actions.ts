"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma, withTenant } from "@/lib/db";
import { assertPermission, clientIp } from "@/lib/session";
import { audit } from "@/lib/audit";
import { parseEndDate } from "@/lib/enrollments";

export type EnrollmentState = { error?: string; ok?: boolean; message?: string };

const statusEnum = z.enum(["ATIVA", "CONCLUIDA", "CANCELADA", "EXPIRADA"]);
const originEnum = z.enum(["COMPRA", "ASSINATURA", "ATRIBUICAO", "CORTESIA"]);
// Matrículas de licença nascem do contrato da empresa; aqui só podem ser mantidas.
const editableOriginEnum = z.enum([...originEnum.options, "LICENCA"]);
const noteField = z.string().trim().max(500).optional().transform((v) => v || null);

export async function createEnrollmentAction(_: EnrollmentState, fd: FormData): Promise<EnrollmentState> {
  const viewer = await assertPermission("enrollment:manage");
  const email = z.string().trim().toLowerCase().email().safeParse(fd.get("email"));
  if (!email.success) return { error: "Informe o e-mail de um aluno cadastrado." };
  const moduleId = z.string().uuid().safeParse(fd.get("moduleId"));
  if (!moduleId.success) return { error: "Escolha o curso." };
  const origin = originEnum.safeParse(fd.get("origin"));
  if (!origin.success) return { error: "Escolha a origem da matrícula." };
  const endsAt = parseEndDate(fd.get("endsAt"));
  if (endsAt === undefined) return { error: "Data de término inválida." };
  if (endsAt && endsAt <= new Date()) return { error: "A data de término precisa ser futura." };
  const note = noteField.safeParse(fd.get("note") ?? undefined);
  if (!note.success) return { error: "A observação aceita até 500 caracteres." };

  // A conta precisa existir: a matrícula se vincula a quem já se cadastrou (ou aceitou convite).
  const user = await prisma.user.findUnique({ where: { email: email.data }, select: { id: true, name: true } });
  if (!user) return { error: "Nenhuma conta com este e-mail. Peça para a pessoa se cadastrar ou envie um convite em Usuários." };

  const tenantId = viewer.tenant.id;
  const ip = await clientIp();
  const result = await withTenant(tenantId, async (tx) => {
    const mod = await tx.module.findFirst({ where: { id: moduleId.data, tenantId }, select: { id: true, title: true } });
    if (!mod) return { error: "Curso não encontrado." };
    const membership = await tx.membership.findUnique({ where: { tenantId_userId: { tenantId, userId: user.id } } });
    if (membership?.status === "DISABLED") return { error: "Esta conta está desativada. Reative-a em Usuários antes de matricular." };
    if (!membership) await tx.membership.create({ data: { tenantId, userId: user.id, roles: ["ALUNO"] } });

    const existing = await tx.enrollment.findUnique({ where: { userId_moduleId: { userId: user.id, moduleId: mod.id } } });
    if (existing?.status === "ATIVA") return { error: `${user.name} já tem matrícula ativa em ${mod.title}.` };
    const data = { origin: origin.data, status: "ATIVA" as const, endsAt, note: note.data };
    const enrollment = existing
      ? await tx.enrollment.update({ where: { id: existing.id }, data: { ...data, startsAt: new Date() } })
      : await tx.enrollment.create({ data: { tenantId, userId: user.id, moduleId: mod.id, ...data } });
    await audit(tx, {
      tenantId,
      actorId: viewer.user.id,
      action: existing ? "matricula.reativada" : "matricula.criada",
      entity: "Enrollment",
      entityId: enrollment.id,
      data: { userId: user.id, moduleId: mod.id, origin: origin.data, endsAt: endsAt?.toISOString() ?? null },
      ip,
    });
    return { ok: true, message: `${user.name} foi matriculado(a) em ${mod.title}.` };
  });
  if (result.ok) revalidatePath("/painel/matriculas");
  return result;
}

export async function updateEnrollmentAction(_: EnrollmentState, fd: FormData): Promise<EnrollmentState> {
  const viewer = await assertPermission("enrollment:manage");
  const id = z.string().uuid().safeParse(fd.get("enrollmentId"));
  const status = statusEnum.safeParse(fd.get("status"));
  const origin = editableOriginEnum.safeParse(fd.get("origin"));
  if (!id.success || !status.success || !origin.success) return { error: "Dados inválidos." };
  const endsAt = parseEndDate(fd.get("endsAt"));
  if (endsAt === undefined) return { error: "Data de término inválida." };
  const note = noteField.safeParse(fd.get("note") ?? undefined);
  if (!note.success) return { error: "A observação aceita até 500 caracteres." };

  const tenantId = viewer.tenant.id;
  const ip = await clientIp();
  const result = await withTenant(tenantId, async (tx) => {
    const before = await tx.enrollment.findFirst({ where: { id: id.data, tenantId } });
    if (!before) return { error: "Matrícula não encontrada." };
    await tx.enrollment.update({ where: { id: before.id }, data: { status: status.data, origin: origin.data, endsAt, note: note.data } });
    await audit(tx, {
      tenantId,
      actorId: viewer.user.id,
      action: "matricula.alterada",
      entity: "Enrollment",
      entityId: before.id,
      data: {
        before: { status: before.status, origin: before.origin, endsAt: before.endsAt?.toISOString() ?? null },
        after: { status: status.data, origin: origin.data, endsAt: endsAt?.toISOString() ?? null },
      },
      ip,
    });
    return { ok: true, message: "Matrícula atualizada." };
  });
  if (result.ok) revalidatePath("/painel/matriculas");
  return result;
}
