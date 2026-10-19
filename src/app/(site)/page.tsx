import Link from "next/link";
import { getTenant } from "@/lib/tenant";
import { withTenant } from "@/lib/db";
import { LEVELS } from "@/lib/levels";
import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";

export default async function HomePage() {
  const tenant = await getTenant();
  const { levels, segments, total } = await withTenant(tenant.id, async (tx) => {
    const levels = await tx.level.findMany({ where: { tenantId: tenant.id, active: true }, orderBy: { order: "asc" } });
    const counts = await tx.module.groupBy({ by: ["levelId"], where: { tenantId: tenant.id, status: "PUBLICADO" }, _count: true });
    const segments = await tx.segment.findMany({
      where: { tenantId: tenant.id, modules: { some: { status: "PUBLICADO" } } },
      orderBy: [{ order: "asc" }, { name: "asc" }],
      select: { id: true, name: true, description: true },
    });
    return {
      levels: levels.map((l) => ({ ...l, count: counts.find((c) => c.levelId === l.id)?._count ?? 0 })),
      segments,
      total: counts.reduce((s, c) => s + c._count, 0),
    };
  });
  const cursos = levels.find((l) => l.kind === "CURSO") ?? levels[0];
  return (
    <div className="space-y-16">
      <section className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="flex flex-col justify-center rounded-xl border border-border bg-surface px-6 py-12 shadow-md sm:px-12 sm:py-16">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-accent-text">Plataforma educacional</p>
          <h1 className="mt-4 font-display text-4xl text-text sm:text-5xl">Capacitação para profissionais que querem evoluir.</h1>
          <p className="mt-5 max-w-2xl text-lg text-text-muted">
            Mentorias, treinamentos, cursos, aulas e capacitações com conteúdo próprio, avaliação e certificado.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href={`/${cursos?.slug ?? "cursos"}`} size="lg">Explorar cursos</ButtonLink>
            <ButtonLink href="/cadastro" variant="secondary" size="lg">Criar conta gratuita</ButtonLink>
          </div>
        </div>
        <aside aria-label="Destaques" className="grid grid-cols-3 gap-3 sm:gap-4 lg:grid-cols-1">
          <Card variant="featured" className="flex flex-col justify-center p-4 sm:p-5">
            <p className="font-display text-3xl text-accent-text sm:text-5xl">{total}</p>
            <p className="mt-1 text-sm text-text-muted">{total === 1 ? "programa publicado" : "programas publicados"}</p>
          </Card>
          <Card className="flex flex-col justify-center p-4 sm:p-5">
            <p className="font-display text-3xl text-text sm:text-5xl">{levels.length}</p>
            <p className="mt-1 text-sm text-text-muted">formatos de aprendizado</p>
          </Card>
          <Card className="flex flex-col justify-center p-4 sm:p-5">
            <p className="font-display text-3xl text-text sm:text-5xl">{segments.length}</p>
            <p className="mt-1 text-sm text-text-muted">{segments.length === 1 ? "segmento de atuação" : "segmentos de atuação"}</p>
          </Card>
        </aside>
      </section>

      <section aria-labelledby="niveis">
        <h2 id="niveis" className="font-display text-3xl text-text">Como você quer aprender</h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {levels.map((l) => (
            <li key={l.id}>
              <Link href={`/${l.slug}`} className="block h-full no-underline">
                <Card variant="interactive" className="flex h-full flex-col">
                  <h3 className="font-display text-2xl text-text">{l.label}</h3>
                  <p className="mt-2 text-sm text-text-muted">{l.description ?? LEVELS[l.kind].description}</p>
                  <p className="mt-auto pt-4 text-sm font-medium text-primary-text">
                    {l.count} {l.count === 1 ? "programa disponível" : "programas disponíveis"} →
                  </p>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {segments.length > 0 && (
        <section aria-labelledby="segmentos">
          <h2 id="segmentos" className="font-display text-3xl text-text">Segmentos</h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {segments.map((s) => (
              <li key={s.id}>
                <Card className="h-full">
                  <h3 className="font-display text-xl text-text">{s.name}</h3>
                  {s.description && <p className="mt-2 text-sm text-text-muted">{s.description}</p>}
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
