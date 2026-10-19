import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { prisma } from "./db";

export type CurrentTenant = { id: string; name: string; slug: string };

function normalizeHost(host: string | null): string {
  return (host ?? "").toLowerCase().split(":")[0] ?? "";
}

/** Resolve o tenant pelo domínio da requisição; sem correspondência, usa DEFAULT_TENANT_SLUG. */
export const getTenant = cache(async (): Promise<CurrentTenant> => {
  const h = await headers();
  const host = normalizeHost(h.get("x-forwarded-host") ?? h.get("host"));
  const select = { id: true, name: true, slug: true } as const;
  const byDomain = host
    ? await prisma.tenant.findFirst({ where: { domains: { has: host }, status: "ACTIVE" }, select })
    : null;
  if (byDomain) return byDomain;
  const slug = process.env.DEFAULT_TENANT_SLUG ?? "drap";
  const fallback =
    (await prisma.tenant.findUnique({ where: { slug }, select })) ??
    (await prisma.tenant.findFirst({ where: { status: "ACTIVE" }, orderBy: { createdAt: "asc" }, select }));
  if (!fallback) throw new Error("Nenhum tenant cadastrado. Execute `npm run db:seed`.");
  return fallback;
});
