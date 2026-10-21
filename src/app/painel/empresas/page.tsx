import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/lib/session";
import { withTenant } from "@/lib/db";
import { formatCnpj } from "@/lib/cpf";
import { seatsUsed } from "@/lib/enterprise";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DataTable, EmptyState, LinkTabs, PageHeader } from "@/components/ui/misc";
import { OrganizationForm } from "./forms";
import { updateLeadStatusAction } from "./actions";

export const metadata: Metadata = { title: "Empresas" };

const LEAD_STATUS = { NOVO: "Novo", EM_CONTATO: "Em contato", FECHADO: "Fechado", DESCARTADO: "Descartado" } as const;
const date = (d: Date) => d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });

export default async function EnterprisesPage({ searchParams }: { searchParams: Promise<{ aba?: string; q?: string }> }) {
  const viewer = await requirePermission("enterprise:manage");
  const { aba, q } = await searchParams;
  const tab = aba === "propostas" ? "propostas" : "empresas";
  const t = viewer.tenant.id;
  const { orgs, leads, newLeads } = await withTenant(t, async (tx) => ({
    orgs: await tx.organization.findMany({
      where: { tenantId: t, ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { cnpj: { contains: q.replace(/\D/g, "") || q } }] } : {}) },
      include: {
        pools: { select: { seats: true, status: true, assignments: { select: { status: true } } } },
        _count: { select: { members: { where: { role: "GESTOR" } } } },
      },
      orderBy: { name: "asc" },
    }),
    leads: tab === "propostas" ? await tx.enterpriseLead.findMany({ where: { tenantId: t }, orderBy: { createdAt: "desc" }, take: 200 }) : [],
    newLeads: await tx.enterpriseLead.count({ where: { tenantId: t, status: "NOVO" } }),
  }));

  return (
    <>
      <PageHeader title="Empresas" description="Versão Enterprise: empresas clientes, contratos de vagas e treinamento de equipes inteiras." />
      <LinkTabs
        current={tab}
        items={[
          { key: "empresas", label: `Empresas (${orgs.length})`, href: "/painel/empresas" },
          { key: "propostas", label: `Pedidos de proposta${newLeads ? ` (${newLeads} novo${newLeads > 1 ? "s" : ""})` : ""}`, href: "/painel/empresas?aba=propostas" },
        ]}
      />
      {tab === "empresas" ? (
        <div className="space-y-8">
          <div className="space-y-4">
            <form className="flex gap-2" role="search">
              <label htmlFor="q" className="sr-only">Buscar empresa</label>
              <input id="q" name="q" defaultValue={q} placeholder="Buscar por nome ou CNPJ" className="min-h-11 w-full max-w-sm rounded-md border border-border-strong bg-bg px-3 text-text" />
              <Button type="submit" variant="secondary">Buscar</Button>
            </form>
            {orgs.length === 0 ? (
              <EmptyState title="Nenhuma empresa cadastrada" text="Cadastre a primeira empresa cliente abaixo para vender vagas de cursos e treinamentos." />
            ) : (
              <DataTable head={["Empresa", "Contratos ativos", "Vagas em uso", "Gestores", "Situação"]} caption="Empresas clientes">
                {orgs.map((o) => {
                  const active = o.pools.filter((p) => p.status === "ACTIVE");
                  const seats = active.reduce((n, p) => n + p.seats, 0);
                  const used = active.reduce((n, p) => n + seatsUsed(p.assignments), 0);
                  return (
                    <tr key={o.id}>
                      <td className="min-w-56">
                        <Link href={`/painel/empresas/${o.id}`} className="font-medium">{o.name}</Link>
                        {o.cnpj && <span className="block text-xs text-text-muted">{formatCnpj(o.cnpj)}</span>}
                      </td>
                      <td className="text-text-muted">{active.length}</td>
                      <td className="whitespace-nowrap text-text-muted">{used} de {seats}</td>
                      <td className="text-text-muted">{o._count.members}</td>
                      <td>{o.status === "ACTIVE" ? <Badge tone="success">Ativa</Badge> : <Badge tone="danger">Suspensa</Badge>}</td>
                    </tr>
                  );
                })}
              </DataTable>
            )}
          </div>
          <Card>
            <h2 className="mb-4 font-display text-xl text-text">Nova empresa</h2>
            <OrganizationForm />
          </Card>
        </div>
      ) : leads.length === 0 ? (
        <EmptyState title="Nenhum pedido de proposta" text="Os pedidos enviados pela página pública Para empresas (/empresas) aparecem aqui." />
      ) : (
        <DataTable head={["Data", "Empresa", "Contato", "Equipe", "Interesse", "Situação"]} caption="Pedidos de proposta">
          {leads.map((l) => (
            <tr key={l.id} className="align-top">
              <td className="whitespace-nowrap text-text-muted">{date(l.createdAt)}</td>
              <td className="min-w-40 font-medium text-text">{l.company}</td>
              <td className="min-w-48">
                <span className="block text-text">{l.contactName}</span>
                <a href={`mailto:${l.email}`} className="block text-xs">{l.email}</a>
                {l.phone && <span className="block text-xs text-text-muted">{l.phone}</span>}
              </td>
              <td className="whitespace-nowrap text-text-muted">{l.teamSize ? `${l.teamSize} pessoas` : "—"}</td>
              <td className="min-w-56 text-xs text-text-muted">
                {l.interests.length > 0 && <span className="block text-text">{l.interests.join(", ")}</span>}
                {l.message}
              </td>
              <td>
                <form action={updateLeadStatusAction} className="flex items-center gap-2">
                  <input type="hidden" name="leadId" value={l.id} />
                  <label className="sr-only" htmlFor={`lead-${l.id}`}>Situação</label>
                  <select id={`lead-${l.id}`} name="status" defaultValue={l.status} className="min-h-9 rounded-md border border-border-strong bg-bg px-2 text-xs text-text">
                    {Object.entries(LEAD_STATUS).map(([v, label]) => <option key={v} value={v}>{label}</option>)}
                  </select>
                  <Button size="sm" variant="ghost" type="submit">Salvar</Button>
                </form>
              </td>
            </tr>
          ))}
        </DataTable>
      )}
    </>
  );
}
