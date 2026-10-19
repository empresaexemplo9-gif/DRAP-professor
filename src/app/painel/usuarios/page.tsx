import type { Metadata } from "next";
import { requirePermission } from "@/lib/session";
import { prisma, withTenant } from "@/lib/db";
import { ROLE_LABELS } from "@/lib/rbac";
import { DataTable, PageHeader } from "@/components/ui/misc";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { InviteForm, RolesEditor } from "./forms";
import { setMemberStatusAction } from "./actions";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Usuários" };

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const viewer = await requirePermission("users:manage");
  const { q } = await searchParams;
  const t = viewer.tenant.id;
  const { members, invites } = await withTenant(t, async (tx) => ({
    members: await tx.membership.findMany({
      where: { tenantId: t, ...(q ? { user: { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] } } : {}) },
      include: { user: { select: { id: true, name: true, email: true, twoFactorEnabled: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    invites: await tx.invitation.findMany({ where: { tenantId: t, acceptedAt: null, expiresAt: { gt: new Date() } }, orderBy: { createdAt: "desc" } }),
  }));
  const lastSeen = await prisma.session.groupBy({ by: ["userId"], where: { userId: { in: members.map((m) => m.userId) } }, _max: { updatedAt: true } });
  return (
    <>
      <PageHeader title="Usuários" description="Pessoas, perfis de acesso e convites." />
      <div className="grid gap-8 xl:grid-cols-[1fr_22rem]">
        <div className="space-y-4">
          <form className="flex gap-2" role="search">
            <label htmlFor="q" className="sr-only">Buscar</label>
            <input id="q" name="q" defaultValue={q} placeholder="Buscar por nome ou e-mail" className="min-h-11 w-full max-w-sm rounded-md border border-border-strong bg-bg px-3 text-text" />
            <Button type="submit" variant="secondary">Buscar</Button>
          </form>
          <DataTable head={["Pessoa", "Perfis", "2FA", "Último acesso", "Situação"]} caption="Usuários">
            {members.map((m) => {
              const seen = lastSeen.find((s) => s.userId === m.userId)?._max.updatedAt;
              return (
                <tr key={m.id}>
                  <td className="min-w-56">
                    <span className="block font-medium text-text">{m.user.name}</span>
                    <span className="block text-xs text-text-muted">{m.user.email}</span>
                  </td>
                  <td className="min-w-64"><RolesEditor membershipId={m.id} roles={m.roles} /></td>
                  <td>{m.user.twoFactorEnabled ? <Badge tone="success">Ativo</Badge> : <Badge>—</Badge>}</td>
                  <td className="whitespace-nowrap text-text-muted">{seen ? seen.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "—"}</td>
                  <td className="whitespace-nowrap">
                    {m.userId === viewer.user.id ? (
                      <Badge tone="primary">Você</Badge>
                    ) : (
                      <form action={setMemberStatusAction} className="flex items-center gap-2">
                        <input type="hidden" name="membershipId" value={m.id} />
                        <input type="hidden" name="status" value={m.status === "ACTIVE" ? "DISABLED" : "ACTIVE"} />
                        {m.status === "ACTIVE" ? <Badge tone="success">Ativo</Badge> : <Badge tone="danger">Desativado</Badge>}
                        <Button size="sm" variant="ghost" type="submit">{m.status === "ACTIVE" ? "Desativar" : "Reativar"}</Button>
                      </form>
                    )}
                  </td>
                </tr>
              );
            })}
          </DataTable>
        </div>
        <div className="space-y-6">
          <Card>
            <h2 className="mb-4 font-display text-xl text-text">Convidar pessoa</h2>
            <InviteForm />
          </Card>
          {invites.length > 0 && (
            <Card>
              <h2 className="mb-3 font-display text-xl text-text">Convites pendentes</h2>
              <ul className="space-y-2 text-sm">
                {invites.map((i) => (
                  <li key={i.id} className="flex flex-col">
                    <span className="text-text">{i.email}</span>
                    <span className="text-xs text-text-muted">{i.roles.map((r) => ROLE_LABELS[r]).join(", ")} · expira em {i.expiresAt.toLocaleDateString("pt-BR")}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
