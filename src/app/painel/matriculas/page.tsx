import type { Metadata } from "next";
import type { EnrollmentStatus, Prisma } from "@prisma/client";
import { requirePermission } from "@/lib/session";
import { withTenant } from "@/lib/db";
import { ENROLLMENT_ORIGIN_LABEL, ENROLLMENT_STATUS_LABEL, toDateInput } from "@/lib/enrollments";
import { DataTable, EmptyState, LinkTabs, PageHeader } from "@/components/ui/misc";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { CreateEnrollmentForm, EnrollmentEditor } from "./forms";

export const metadata: Metadata = { title: "Matrículas" };

const TABS = ["todas", "ATIVA", "CONCLUIDA", "CANCELADA", "EXPIRADA"] as const;

export default async function EnrollmentsPage({ searchParams }: { searchParams: Promise<{ q?: string; situacao?: string; curso?: string; email?: string }> }) {
  const viewer = await requirePermission("enrollment:manage");
  const { q, situacao, curso, email } = await searchParams;
  const status = TABS.find((s) => s === situacao && s !== "todas") as EnrollmentStatus | undefined;
  const t = viewer.tenant.id;
  const where: Prisma.EnrollmentWhereInput = {
    tenantId: t,
    ...(status ? { status } : {}),
    ...(curso ? { moduleId: curso } : {}),
    ...(q ? { user: { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] } } : {}),
  };
  const { enrollments, modules, counts } = await withTenant(t, async (tx) => ({
    enrollments: await tx.enrollment.findMany({
      where,
      include: {
        user: { select: { name: true, email: true } },
        module: { select: { title: true, level: { select: { label: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    modules: await tx.module.findMany({
      where: { tenantId: t, status: { not: "ARQUIVADO" } },
      select: { id: true, title: true, level: { select: { label: true, order: true } } },
      orderBy: [{ level: { order: "asc" } }, { title: "asc" }],
    }),
    counts: await tx.enrollment.groupBy({ by: ["status"], where: { tenantId: t }, _count: true }),
  }));
  const total = counts.reduce((n, c) => n + c._count, 0);
  const countOf = (s: string) => (s === "todas" ? total : counts.find((c) => c.status === s)?._count ?? 0);
  const tabHref = (s: string) => {
    const p = new URLSearchParams();
    if (s !== "todas") p.set("situacao", s);
    if (q) p.set("q", q);
    if (curso) p.set("curso", curso);
    const qs = p.toString();
    return `/painel/matriculas${qs ? `?${qs}` : ""}`;
  };

  return (
    <>
      <PageHeader title="Matrículas" description="Matricule alunos, ajuste prazos e acompanhe a situação de cada acesso." />
      <Card className="mb-8">
        <h2 className="mb-4 font-display text-xl text-text">Nova matrícula</h2>
        <CreateEnrollmentForm defaultEmail={email} modules={modules.map((m) => ({ id: m.id, title: m.title, group: m.level.label }))} />
      </Card>
      <LinkTabs
        current={status ?? "todas"}
        items={TABS.map((s) => ({ key: s, href: tabHref(s), label: `${s === "todas" ? "Todas" : ENROLLMENT_STATUS_LABEL[s].label} (${countOf(s)})` }))}
      />
      <div className="space-y-4">
        <form className="flex flex-wrap gap-2" role="search">
          {status && <input type="hidden" name="situacao" value={status} />}
          <label htmlFor="q" className="sr-only">Buscar aluno</label>
          <input id="q" name="q" defaultValue={q} placeholder="Buscar por nome ou e-mail" className="min-h-11 w-full max-w-xs rounded-md border border-border-strong bg-bg px-3 text-text" />
          <label htmlFor="curso" className="sr-only">Filtrar por curso</label>
          <select id="curso" name="curso" defaultValue={curso ?? ""} className="min-h-11 max-w-xs rounded-md border border-border-strong bg-bg px-3 text-text">
            <option value="">Todos os cursos</option>
            {modules.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
          </select>
          <Button type="submit" variant="secondary">Filtrar</Button>
        </form>
        {enrollments.length === 0 ? (
          <EmptyState title="Nenhuma matrícula encontrada" text="Use o formulário ao lado para matricular um aluno ou ajuste os filtros." />
        ) : (
          <DataTable head={["Aluno", "Curso", "Situação", "Início", "Editar"]} caption="Matrículas">
            {enrollments.map((e) => {
              const s = ENROLLMENT_STATUS_LABEL[e.status];
              return (
                <tr key={e.id} className="align-top">
                  <td className="min-w-48">
                    <span className="block font-medium text-text">{e.user.name}</span>
                    <span className="block text-xs text-text-muted">{e.user.email}</span>
                  </td>
                  <td className="min-w-48">
                    <span className="block text-text">{e.module.title}</span>
                    <span className="block text-xs text-text-muted">{e.module.level.label} · {ENROLLMENT_ORIGIN_LABEL[e.origin]}</span>
                  </td>
                  <td className="whitespace-nowrap">
                    <Badge tone={s.tone}>{s.label}</Badge>
                    {e.endsAt && <span className="mt-1 block text-xs text-text-muted">até {e.endsAt.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}</span>}
                  </td>
                  <td className="whitespace-nowrap text-text-muted">{e.startsAt.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}</td>
                  <td>
                    <EnrollmentEditor enrollment={{ id: e.id, status: e.status, origin: e.origin, endsAt: toDateInput(e.endsAt), note: e.note ?? "" }} />
                  </td>
                </tr>
              );
            })}
          </DataTable>
        )}
      </div>
    </>
  );
}
