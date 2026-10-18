"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma, withTenant } from "@/lib/db";
import { getTenant } from "@/lib/tenant";
import { LEGAL_VERSION } from "@/lib/legal";
import { clientIp, getViewer } from "@/lib/session";
import { sha256 } from "@/lib/crypto";
import { audit } from "@/lib/audit";

export type FormState = { error?: string; fieldErrors?: Record<string, string>; ok?: boolean; message?: string };

const signUpSchema = z.object({
  name: z.string().trim().min(3, "Informe seu nome completo").max(120),
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  password: z.string().min(10, "A senha precisa de pelo menos 10 caracteres").max(128),
  terms: z.literal("on", { errorMap: () => ({ message: "É preciso aceitar os Termos de Uso e a Política de Privacidade" }) }),
  marketing: z.string().optional(),
  invite: z.string().optional(),
});

function fieldErrors(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) out[String(issue.path[0])] ??= issue.message;
  return out;
}

async function recordConsents(tenantId: string, userId: string, marketing: boolean) {
  const ip = await clientIp();
  await withTenant(tenantId, async (tx) => {
    const types = ["TERMOS", "PRIVACIDADE", ...(marketing ? (["MARKETING"] as const) : [])] as const;
    for (const type of types) {
      await tx.consent.create({ data: { tenantId, userId, type, documentVersion: LEGAL_VERSION, ip } });
    }
  });
}

async function applyInvite(tenantId: string, userId: string, email: string, token: string | undefined) {
  if (!token) return;
  await withTenant(tenantId, async (tx) => {
    const invite = await tx.invitation.findUnique({ where: { tokenHash: sha256(token) } });
    if (!invite || invite.tenantId !== tenantId || invite.acceptedAt || invite.expiresAt < new Date()) return;
    if (invite.email.toLowerCase() !== email.toLowerCase()) return;
    await tx.membership.upsert({
      where: { tenantId_userId: { tenantId, userId } },
      create: { tenantId, userId, roles: invite.roles },
      update: { roles: invite.roles, status: "ACTIVE" },
    });
    await tx.invitation.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } });
    await audit(tx, { tenantId, actorId: userId, action: "convite.aceito", entity: "Invitation", entityId: invite.id, data: { roles: invite.roles } });
  });
}

export async function signUpAction(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = signUpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const { name, email, password, marketing, invite } = parsed.data;
  const tenant = await getTenant();
  const exists = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (exists) return { fieldErrors: { email: "Já existe uma conta com este e-mail. Entre ou recupere a senha." } };
  let userId: string;
  try {
    const res = await auth.api.signUpEmail({ body: { name, email, password }, headers: await headers() });
    userId = res.user.id;
  } catch {
    return { error: "Não foi possível criar a conta. Verifique os dados e tente novamente." };
  }
  await withTenant(tenant.id, (tx) =>
    tx.membership.upsert({
      where: { tenantId_userId: { tenantId: tenant.id, userId } },
      create: { tenantId: tenant.id, userId, roles: ["ALUNO"] },
      update: {},
    }),
  );
  await recordConsents(tenant.id, userId, marketing === "on");
  await applyInvite(tenant.id, userId, email, invite);
  if (process.env.RESEND_API_KEY) {
    return { ok: true, message: "Conta criada. Enviamos um e-mail de confirmação — confirme para entrar." };
  }
  redirect("/painel");
}

export async function acceptTermsAction(_: FormState, formData: FormData): Promise<FormState> {
  const viewer = await getViewer();
  if (!viewer) redirect("/entrar");
  if (formData.get("terms") !== "on") return { error: "É preciso aceitar os Termos de Uso e a Política de Privacidade." };
  await recordConsents(viewer.tenant.id, viewer.user.id, formData.get("marketing") === "on");
  redirect("/painel");
}

export async function acceptInviteAction(_: FormState, formData: FormData): Promise<FormState> {
  const viewer = await getViewer();
  if (!viewer) return { error: "Entre na sua conta para aceitar o convite." };
  const token = String(formData.get("invite") ?? "");
  await applyInvite(viewer.tenant.id, viewer.user.id, viewer.user.email, token);
  redirect("/painel");
}
