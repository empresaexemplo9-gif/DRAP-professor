import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/session";
import { withTenant } from "@/lib/db";
import { formatCnpj } from "@/lib/cpf";
import { toDateInput } from "@/lib/enrollments";
import { organizationReport } from "@/lib/enterprise-server";
import { formatBRL } from "@/lib/payments/pix-state";
import { TeamPanel } from "@/components/enterprise/TeamPanel";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Breadcrumb, PageHeader } from "@/components/ui/misc";
import { AddManagerForm, CreatePoolForm, OrganizationForm, PoolEditor } from "../forms";
import { removeManagerAction } from "../actions";

export const metadata: Metadata = { title: "Empresa" };

export default async function EnterpriseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requirePermission("enterprise:manage");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const org = await organizationReport(viewer.tenant.id, id);
  if (!org) notFound();
  const modules = await withTenant(viewer.tenant.id, (tx) =>
    tx.module.findMany({
      where: { tenantId: viewer.tenant.id, status: { not: "ARQUIVADO" } },
      select: { id: true, title: true, level: { select: { label: true } }, segment: { select: { name: true } } },
      orderBy: [{ level: { order: "asc" } }, { segment: { name: "asc" } }, { title: "asc" }],
    }),
  );
  const managers = org.members.filter((m) => m.role === "GESTOR");
  const contracted = org.pools.filter((p) => p.status === "ACTIVE").reduce((n, p) => n + (p.contractCents ?? 0), 0);

  return (
    <>
      <Breadcrumb items={[{ href: "/painel/empresas", label: "Empresas" }, { label: org.name }]} />
      <PageHeader
        eyebrow="Enterprise"
        title={org.name}
        description={[org.cnpj && formatCnpj(org.cnpj), contracted > 0 && `Contratos ativos: ${formatBRL(contracted)}`].filter(Boolean).join(" · ") || undefined}
        actions={<ButtonLink href={`/api/empresas/${org.id}/relatorio`} variant="secondary">Exportar relatório (CSV)</ButtonLink>}
      />
      {org.status !== "ACTIVE" && <div className="mb-6"><Badge tone="danger">Empresa suspensa — acessos por licença pausados</Badge></div>}

      <section aria-labelledby="contratos" className="mb-10 space-y-4">
        <h2 id="contratos" className="font-display text-2xl text-text">Contratos e equipe</h2>
        <TeamPanel
          org={org}
          footer={(pool) => (
            <PoolEditor
              pool={{
                id: pool.id,
                seats: pool.seats,
                goalPercent: pool.goalPercent,
                endsAt: toDateInput(pool.endsAt),
                dueAt: toDateInput(pool.dueAt),
                contract: pool.contractCents == null ? "" : (pool.contractCents / 100).toFixed(2).replace(".", ","),
                note: pool.note ?? "",
                status: pool.status,
              }}
            />
          )}
        />
        <Card>
          <h3 className="mb-4 font-display text-xl text-text">Novo contrato de vagas</h3>
          <CreatePoolForm organizationId={org.id} modules={modules.map((m) => ({ id: m.id, title: m.title, group: `${m.level.label} · ${m.segment.name}` }))} />
        </Card>
      </section>

      <div className="grid gap-8 xl:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-display text-xl text-text">Gestores da empresa</h2>
          {managers.length === 0 ? (
            <p className="mb-4 text-sm text-text-muted">Nenhum gestor ainda. O gestor distribui as vagas e acompanha a equipe na aba Minha empresa.</p>
          ) : (
            <ul className="mb-4 divide-y divide-border">
              {managers.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="min-w-0">
                    <span className="block text-text">{m.user.name}</span>
                    <span className="block truncate text-xs text-text-muted">{m.user.email}</span>
                  </span>
                  <form action={removeManagerAction}>
                    <input type="hidden" name="memberId" value={m.id} />
                    <Button size="sm" variant="ghost" type="submit">Remover</Button>
                  </form>
                </li>
              ))}
            </ul>
          )}
          <AddManagerForm organizationId={org.id} />
        </Card>
        <Card>
          <h2 className="mb-4 font-display text-xl text-text">Dados da empresa</h2>
          <OrganizationForm
            values={{
              id: org.id,
              name: org.name,
              legalName: org.legalName,
              cnpj: org.cnpj ? formatCnpj(org.cnpj) : "",
              contactName: org.contactName,
              contactEmail: org.contactEmail,
              contactPhone: org.contactPhone,
              notes: org.notes,
              status: org.status,
            }}
          />
        </Card>
      </div>
    </>
  );
}
