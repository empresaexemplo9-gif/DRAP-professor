"use server";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { prisma, withTenant } from "@/lib/db";
import { assertPermission, clientIp } from "@/lib/session";
import { audit } from "@/lib/audit";
import { randomToken, sha256 } from "@/lib/crypto";
import { sendEmail } from "@/lib/email";
import { ROLE_LABELS } from "@/lib/rbac";

export type UsersState = { error?: string; ok?: boolean; message?: string; inviteUrl?: string };

const roleEnum = z.enum(["ADMIN", "PEDAGOGICO", "INSTRUTOR", "ALUNO"]);

export async function inviteAction(_: UsersState, fd: FormData): Promise<UsersState> {
  const viewer = await assertPermission("users:manage");
  const email = z.string().trim().toLowerCase().email().safeParse(fd.get("email"));
  if (!email.success) return { error: "E-mail inválido." };
  const roles = z.array(roleEnum).min(1, "Escolha ao menos um perfil").safeParse(fd.getAll("roles"));
  if (!roles.success) return { error: "Escolha ao menos um perfil." };
  const token = randomToken();
  const tenantId = viewer.tenant.id;
  await withTenant(tenantId, async (tx) => {
    const inv = await tx.invitation.create({
      data: { tenantId, email: email.data, roles: roles.data, tokenHash: sha256(token), invitedBy: viewer.user.id, expiresAt: new Date(Date.now() + 7 * 864e5) },
    });
    await audit(tx, { tenantId, actorId: viewer.user.id, action: "usuario.convidado", entity: "Invitation", entityId: inv.id, data: { email: email.data, roles: roles.data }, ip: await clientIp() });
  });
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const base = host ? `${h.get("x-forwarded-proto") ?? "https"}://${host}` : (process.env.BETTER_AUTH_URL ?? "");
  const inviteUrl = `${base}/convite/${token}`;
  await sendEmail(
    email.data,
    `Convite para ${viewer.tenant.name}`,
    `Você foi convidado(a) para ${viewer.tenant.name} como ${roles.data.map((r) => ROLE_LABELS[r]).join(", ")}.\n\nAceite em: ${inviteUrl}\n\nO link vale por 7 dias.`,
  );
  revalidatePath("/painel/usuarios");
  return { ok: true, message: "Convite criado. Envie o link abaixo (ele também foi enviado por e-mail, se configurado).", inviteUrl };
}

export async function updateRolesAction(fd: FormData) {
  const viewer = await assertPermission("users:manage");
  const membershipId = z.string().uuid().parse(fd.get("membershipId"));
  const roles = z.array(roleEnum).min(1).parse(fd.getAll("roles"));
  const tenantId = viewer.tenant.id;
  await withTenant(tenantId, async (tx) => {
    const m = await tx.membership.findFirst({ where: { id: membershipId, tenantId } });
    if (!m) return;
    // Impede que o último administrador remova o próprio acesso.
    if (m.roles.includes("ADMIN") && !roles.includes("ADMIN")) {
      const admins = await tx.membership.count({ where: { tenantId, status: "ACTIVE", roles: { has: "ADMIN" } } });
      if (admins <= 1) return;
    }
    await tx.membership.update({ where: { id: m.id }, data: { roles } });
    await audit(tx, { tenantId, actorId: viewer.user.id, action: "usuario.perfis_alterados", entity: "Membership", entityId: m.id, data: { before: m.roles, after: roles }, ip: await clientIp() });
  });
  revalidatePath("/painel/usuarios");
}

export async function setMemberStatusAction(fd: FormData) {
  const viewer = await assertPermission("users:manage");
  const membershipId = z.string().uuid().parse(fd.get("membershipId"));
  const status = z.enum(["ACTIVE", "DISABLED"]).parse(fd.get("status"));
  const tenantId = viewer.tenant.id;
  await withTenant(tenantId, async (tx) => {
    const m = await tx.membership.findFirst({ where: { id: membershipId, tenantId } });
    if (!m || m.userId === viewer.user.id) return; // ninguém desativa a si mesmo
    await tx.membership.update({ where: { id: m.id }, data: { status } });
    await audit(tx, { tenantId, actorId: viewer.user.id, action: status === "DISABLED" ? "usuario.desativado" : "usuario.reativado", entity: "Membership", entityId: m.id, ip: await clientIp() });
  });
  if (status === "DISABLED") {
    const m = await withTenant(tenantId, (tx) => tx.membership.findFirst({ where: { id: membershipId, tenantId } }));
    if (m) await prisma.session.deleteMany({ where: { userId: m.userId } });
  }
  revalidatePath("/painel/usuarios");
}
