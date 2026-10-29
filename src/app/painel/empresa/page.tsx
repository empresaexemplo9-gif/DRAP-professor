import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireViewer } from "@/lib/session";
import { managedOrganizations, organizationReport } from "@/lib/enterprise-server";
import { TeamPanel } from "@/components/enterprise/TeamPanel";
import { ButtonLink } from "@/components/ui/Button";
import { LinkTabs, PageHeader } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Minha empresa" };

export default async function CompanyPage({ searchParams }: { searchParams: Promise<{ org?: string; equipe?: string }> }) {
  const viewer = await requireViewer();
  const { org: orgParam, equipe } = await searchParams;
  const orgs = await managedOrganizations(viewer);
  if (orgs.length === 0) redirect("/painel?erro=sem-permissao");
  const current = orgs.find((o) => o.id === orgParam) ?? orgs[0]!;
  const report = await organizationReport(viewer.tenant.id, current.id);
  if (!report) redirect("/painel?erro=sem-permissao");
  const teams = [...new Set(report.pools.flatMap((p) => p.learners.map((l) => l.team)).filter((t): t is string => Boolean(t)))].sort();
  const href = (team?: string) => {
    const p = new URLSearchParams();
    if (orgs.length > 1) p.set("org", current.id);
    if (team) p.set("equipe", team);
    const qs = p.toString();
    return `/painel/empresa${qs ? `?${qs}` : ""}`;
  };

  return (
    <>
      <PageHeader
        eyebrow="Painel do gestor"
        title={report.name}
        description="Distribua as vagas contratadas, acompanhe o progresso da equipe e a meta de cada treinamento."
        actions={<ButtonLink href={`/api/empresas/${report.id}/relatorio`} variant="secondary">Exportar relatório (CSV)</ButtonLink>}
      />
      {orgs.length > 1 && (
        <LinkTabs current={current.id} items={orgs.map((o) => ({ key: o.id, label: o.name, href: `/painel/empresa?org=${o.id}` }))} />
      )}
      {teams.length > 0 && (
        <nav aria-label="Filtrar por equipe" className="mb-6 flex flex-wrap gap-2 text-sm">
          <ButtonLink href={href()} size="sm" variant={equipe ? "ghost" : "secondary"}>Todas as equipes</ButtonLink>
          {teams.map((t) => (
            <ButtonLink key={t} href={href(t)} size="sm" variant={equipe === t ? "secondary" : "ghost"}>{t}</ButtonLink>
          ))}
        </nav>
      )}
      <TeamPanel org={report} team={equipe && teams.includes(equipe) ? equipe : undefined} />
    </>
  );
}
