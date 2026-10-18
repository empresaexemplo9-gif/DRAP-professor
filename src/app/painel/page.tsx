import Link from "next/link";
import type { Metadata } from "next";
import { requireViewer } from "@/lib/session";
import { withTenant } from "@/lib/db";
import { can } from "@/lib/rbac";
import { levelPath } from "@/lib/catalog-paths";
import { Alert, EmptyState, PageHeader, ProgressBar } from "@/components/ui/misc";
import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Início" };

export default async function PainelHome({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  const viewer = await requireViewer();
  const t = viewer.tenant.id;
  const data = await withTenant(t, async (tx) => {
    const enrollments = await tx.enrollment.findMany({
      where: { tenantId: t, userId: viewer.user.id, status: "ATIVA" },
      include: {
        module: { include: { level: true, segment: true, _count: { select: { topics: { where: { status: "PUBLICADO" } } } } } },
        progress: { where: { status: "CONCLUIDO" }, select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 6,
    });
    const stats = can(viewer.roles, "content:manage")
      ? {
          modules: await tx.module.count({ where: { tenantId: t } }),
          published: await tx.module.count({ where: { tenantId: t, status: "PUBLICADO" } }),
          topics: await tx.topic.count({ where: { tenantId: t } }),
          members: await tx.membership.count({ where: { tenantId: t, status: "ACTIVE" } }),
          enrollments: await tx.enrollment.count({ where: { tenantId: t, status: "ATIVA" } }),
        }
      : null;
    return { enrollments, stats };
  });
  const firstName = viewer.user.name.split(" ")[0];
  return (
    <>
      <PageHeader eyebrow={viewer.tenant.name} title={`Olá, ${firstName}`} description="Este é o seu painel. Continue de onde parou ou explore novos conteúdos." />
      {erro === "sem-permissao" && (
        <div className="mb-6"><Alert tone="warning">Você não tem permissão para acessar aquela área.</Alert></div>
      )}
      {data.stats && (
        <section aria-label="Indicadores" className="mb-10 grid grid-cols-2 gap-4 md:grid-cols-5">
          {[
            ["Módulos", data.stats.modules],
            ["Publicados", data.stats.published],
            ["Assuntos", data.stats.topics],
            ["Pessoas", data.stats.members],
            ["Matrículas ativas", data.stats.enrollments],
          ].map(([label, value]) => (
            <Card key={String(label)} className="p-4">
              <p className="text-xs uppercase tracking-wide text-text-muted">{label}</p>
              <p className="mt-1 font-display text-3xl text-text">{value}</p>
            </Card>
          ))}
        </section>
      )}
      <section aria-labelledby="continuar">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="continuar" className="font-display text-2xl text-text">Continuar estudando</h2>
          <Link href="/painel/aprendizado" className="text-sm">Ver tudo</Link>
        </div>
        {data.enrollments.length === 0 ? (
          <EmptyState
            title="Nenhuma matrícula ainda"
            text="Explore o catálogo para conhecer mentorias, treinamentos, cursos, aulas e capacitações."
            action={<ButtonLink href="/painel/catalogo">Abrir o catálogo</ButtonLink>}
          />
        ) : (
          <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {data.enrollments.map((e) => {
              const total = e.module._count.topics;
              const pct = total ? (e.progress.length / total) * 100 : 0;
              return (
                <li key={e.id}>
                  <Card className="flex h-full flex-col gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-accent-text">{e.module.level.label} · {e.module.segment.name}</p>
                      <h3 className="mt-1 font-display text-xl text-text">{e.module.title}</h3>
                    </div>
                    <ProgressBar value={pct} label={`${e.progress.length} de ${total} assuntos`} />
                    <ButtonLink className="mt-auto" variant="secondary" href={levelPath(e.module.level.slug, e.module.segment.slug, e.module.slug)}>
                      Abrir
                    </ButtonLink>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
