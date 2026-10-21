import type { Metadata } from "next";
import type { PixCheckoutStatus } from "@prisma/client";
import { requirePermission } from "@/lib/session";
import { prisma, withTenant } from "@/lib/db";
import { can } from "@/lib/rbac";
import { formatBRL, PIX_STATUS_LABEL, summarizePixCheckouts } from "@/lib/payments/pix-state";
import { Alert, DataTable, EmptyState, LinkTabs, PageHeader } from "@/components/ui/misc";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { CheckoutActions, PriceEditor } from "./forms";
import { AUDIENCE } from "@/lib/audience";

export const metadata: Metadata = { title: "Financeiro" };

const TABS = ["todas", "PENDING", "PAID", "EXPIRED", "CANCELED", "FAILED"] as const;
const dateTime = (d: Date) => d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <p className="text-xs uppercase tracking-wide text-text-muted">{label}</p>
      <p className="mt-1 font-display text-2xl text-text">{value}</p>
      {hint && <p className="mt-1 text-xs text-text-muted">{hint}</p>}
    </Card>
  );
}

export default async function FinancePage({ searchParams }: { searchParams: Promise<{ situacao?: string; q?: string }> }) {
  const viewer = await requirePermission("finance:view");
  const canManage = can(viewer.roles, "finance:manage");
  const { situacao, q } = await searchParams;
  const status = TABS.find((s) => s === situacao && s !== "todas") as PixCheckoutStatus | undefined;
  const t = viewer.tenant.id;
  const since = new Date(Date.now() - 30 * 864e5);
  const { checkouts, all, modules } = await withTenant(t, async (tx) => ({
    checkouts: await tx.pixCheckout.findMany({
      where: {
        tenantId: t,
        ...(status ? { status } : {}),
        ...(q ? { user: { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] } } : {}),
      },
      select: {
        id: true, status: true, amountCents: true, createdAt: true, paidAt: true, expiresAt: true, providerPaymentId: true, adminNote: true, manualConfirmedById: true,
        user: { select: { name: true, email: true } },
        module: { select: { title: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    all: await tx.pixCheckout.findMany({ where: { tenantId: t }, select: { status: true, amountCents: true, paidAt: true } }),
    modules: await tx.module.findMany({
      where: { tenantId: t, status: { not: "ARQUIVADO" } },
      select: { id: true, title: true, status: true, priceCents: true, audience: true, level: { select: { label: true } }, _count: { select: { enrollments: { where: { status: "ATIVA" } } } } },
      orderBy: [{ audience: "asc" }, { level: { order: "asc" } }, { title: "asc" }],
    }),
  }));
  const summary = summarizePixCheckouts(all, since);
  const confirmers = await prisma.user.findMany({
    where: { id: { in: [...new Set(checkouts.map((c) => c.manualConfirmedById).filter((x): x is string => Boolean(x)))] } },
    select: { id: true, name: true },
  });
  const asaasReady = Boolean(process.env.ASAAS_API_KEY && process.env.ASAAS_WEBHOOK_TOKEN);
  const countOf = (s: string) => (s === "todas" ? all.length : all.filter((c) => c.status === s).length);
  const tabHref = (s: string) => {
    const p = new URLSearchParams();
    if (s !== "todas") p.set("situacao", s);
    if (q) p.set("q", q);
    const qs = p.toString();
    return `/painel/financeiro${qs ? `?${qs}` : ""}`;
  };

  return (
    <>
      <PageHeader title="Financeiro" description="Cobranças Pix, baixas manuais e preços dos cursos." />
      {!asaasReady ? (
        <div className="mb-6">
          <Alert tone="warning">O Pix ainda não está ativo: configure ASAAS_API_KEY e ASAAS_WEBHOOK_TOKEN no ambiente (veja docs/DEPLOY.md). Enquanto isso, use Matrículas para liberar acessos manualmente.</Alert>
        </div>
      ) : (
        <p className="mb-6 text-sm text-text-muted">
          Provedor: Asaas · ambiente <Badge tone={process.env.ASAAS_ENVIRONMENT === "production" ? "success" : "warning"}>{process.env.ASAAS_ENVIRONMENT === "production" ? "produção" : "sandbox"}</Badge>
        </p>
      )}

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Receita confirmada" value={formatBRL(summary.paidCents)} hint={`${summary.paidCount} pagamento(s)`} />
        <Stat label="Últimos 30 dias" value={formatBRL(summary.recentPaidCents)} />
        <Stat label="Aguardando pagamento" value={formatBRL(summary.pendingCents)} hint={`${summary.pendingCount} Pix em aberto`} />
        <Stat label="Ticket médio" value={summary.paidCount ? formatBRL(Math.round(summary.paidCents / summary.paidCount)) : "—"} />
      </div>

      <section aria-labelledby="cobrancas" className="mb-10 space-y-4">
        <h2 id="cobrancas" className="font-display text-2xl text-text">Cobranças Pix</h2>
        <LinkTabs
          current={status ?? "todas"}
          items={TABS.map((s) => ({ key: s, href: tabHref(s), label: `${s === "todas" ? "Todas" : PIX_STATUS_LABEL[s].label} (${countOf(s)})` }))}
        />
        <form className="flex gap-2" role="search">
          {status && <input type="hidden" name="situacao" value={status} />}
          <label htmlFor="q" className="sr-only">Buscar aluno</label>
          <input id="q" name="q" defaultValue={q} placeholder="Buscar por nome ou e-mail" className="min-h-11 w-full max-w-sm rounded-md border border-border-strong bg-bg px-3 text-text" />
          <button type="submit" className="min-h-11 rounded-md border border-border-strong px-4 text-sm text-text">Buscar</button>
        </form>
        {checkouts.length === 0 ? (
          <EmptyState title="Nenhuma cobrança" text="As cobranças aparecem aqui quando um aluno inicia a matrícula com Pix." />
        ) : (
          <DataTable head={["Data", "Aluno", "Curso", "Valor", "Situação", ...(canManage ? ["Ações"] : [])]} caption="Cobranças Pix">
            {checkouts.map((c) => {
              const s = PIX_STATUS_LABEL[c.status];
              const confirmer = confirmers.find((u) => u.id === c.manualConfirmedById)?.name;
              return (
                <tr key={c.id} className="align-top">
                  <td className="whitespace-nowrap text-text-muted">{dateTime(c.createdAt)}</td>
                  <td className="min-w-48">
                    <span className="block font-medium text-text">{c.user.name}</span>
                    <span className="block text-xs text-text-muted">{c.user.email}</span>
                  </td>
                  <td className="min-w-40 text-text">{c.module.title}</td>
                  <td className="whitespace-nowrap font-medium text-text">{formatBRL(c.amountCents)}</td>
                  <td className="min-w-40">
                    <Badge tone={s.tone}>{s.label}</Badge>
                    {c.paidAt && <span className="mt-1 block text-xs text-text-muted">em {dateTime(c.paidAt)}</span>}
                    {confirmer && <span className="block text-xs text-text-muted">baixa manual por {confirmer}</span>}
                    {c.adminNote && <span className="block max-w-56 text-xs text-text-muted">“{c.adminNote}”</span>}
                    {c.providerPaymentId && <span className="block font-mono text-[0.7rem] text-text-muted">{c.providerPaymentId}</span>}
                  </td>
                  {canManage && (
                    <td>
                      <CheckoutActions checkoutId={c.id} status={c.status} canSync={asaasReady && Boolean(c.providerPaymentId)} />
                    </td>
                  )}
                </tr>
              );
            })}
          </DataTable>
        )}
      </section>

      <section aria-labelledby="precos" className="space-y-4">
        <div>
          <h2 id="precos" className="font-display text-2xl text-text">Preços dos cursos</h2>
          <p className="mt-1 text-sm text-text-muted">O valor vale para novas cobranças de capacitações individuais. Deixe vazio para retirar o curso do checkout Pix. Treinamentos para empresas são vendidos por contrato em Empresas.</p>
        </div>
        <DataTable head={["Curso", "Público", "Publicação", "Matrículas ativas", "Preço"]} caption="Preços dos cursos">
          {modules.map((m) => (
            <tr key={m.id}>
              <td className="min-w-56">
                <span className="block text-text">{m.title}</span>
                <span className="block text-xs text-text-muted">{m.level.label}</span>
              </td>
              <td className="whitespace-nowrap"><Badge tone={m.audience === "EMPRESA" ? "primary" : "neutral"}>{AUDIENCE[m.audience].short}</Badge></td>
              <td><StatusBadge status={m.status} /></td>
              <td className="text-text-muted">{m._count.enrollments}</td>
              <td className="min-w-64">
                {m.audience === "EMPRESA" ? <span className="text-xs text-text-muted">Por contrato (Empresas)</span> : canManage ? <PriceEditor moduleId={m.id} priceCents={m.priceCents} /> : <span className="text-text">{m.priceCents == null ? "—" : formatBRL(m.priceCents)}</span>}
              </td>
            </tr>
          ))}
        </DataTable>
      </section>
    </>
  );
}
