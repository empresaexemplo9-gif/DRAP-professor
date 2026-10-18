import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { auth } from "./auth";
import { withTenant } from "./db";
import { getTenant, type CurrentTenant } from "./tenant";
import { can, type Permission } from "./rbac";
import { LEGAL_VERSION } from "./legal";

export type Viewer = {
  tenant: CurrentTenant;
  user: { id: string; name: string; email: string; image?: string | null; twoFactorEnabled?: boolean | null };
  sessionId: string;
  roles: Role[];
  disabled: boolean;
  needsConsent: boolean;
};

/** Usuário logado no tenant atual (cria o vínculo de Aluno no primeiro acesso). */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const tenant = await getTenant();
  const { membership, consent } = await withTenant(tenant.id, async (tx) => {
    const membership =
      (await tx.membership.findUnique({ where: { tenantId_userId: { tenantId: tenant.id, userId: session.user.id } } })) ??
      (await tx.membership.create({ data: { tenantId: tenant.id, userId: session.user.id, roles: ["ALUNO"] } }));
    const consent = await tx.consent.findFirst({
      where: { tenantId: tenant.id, userId: session.user.id, type: "TERMOS", documentVersion: LEGAL_VERSION, revokedAt: null },
      select: { id: true },
    });
    return { membership, consent };
  });
  return {
    tenant,
    user: session.user,
    sessionId: session.session.id,
    roles: membership.roles,
    disabled: membership.status === "DISABLED",
    needsConsent: !consent,
  };
});

export async function requireViewer(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect("/entrar");
  if (viewer.disabled) redirect("/acesso-desativado");
  return viewer;
}

export async function requirePermission(permission: Permission): Promise<Viewer> {
  const viewer = await requireViewer();
  if (!can(viewer.roles, permission)) redirect("/painel?erro=sem-permissao");
  return viewer;
}

/** Variante para Server Actions e rotas de API: lança erro em vez de redirecionar. */
export async function assertPermission(permission: Permission): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer || viewer.disabled) throw new Error("Não autenticado");
  if (!can(viewer.roles, permission)) throw new Error("Sem permissão");
  return viewer;
}

export async function clientIp(): Promise<string | null> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip");
}
