import Link from "next/link";
import { getTenant } from "@/lib/tenant";
import { withTenant } from "@/lib/db";
import { LEVELS } from "@/lib/levels";
import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";

export default async function HomePage() {
  const tenant = await getTenant();
  const levels = await withTenant(tenant.id, async (tx) => {
    const levels = await tx.level.findMany({ where: { tenantId: tenant.id, active: true }, orderBy: { order: "asc" } });
    const counts = await tx.module.groupBy({ by: ["levelId"], where: { tenantId: tenant.id, status: "PUBLICADO" }, _count: true });
    return levels.map((l) => ({ ...l, count: counts.find((c) => c.levelId === l.id)?._count ?? 0 }));
  });
  return (
    <div className="space-y-16">
      <section className="relative overflow-hidden rounded-xl border border-border bg-surface px-6 py-14 shadow-md sm:px-12 sm:py-20">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-accent-text">Capacitação profissional</p>
        <h1 className="mt-4 max-w-3xl font-display text-4xl text-text sm:text-5xl">
          Conhecimento aplicado, do agro às finanças, com quem vive o mercado.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-text-muted">
          Mentorias, treinamentos, cursos, aulas e capacitações com certificado e acompanhamento de perto.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href={`/${levels[2]?.slug ?? "cursos"}`} size="lg">Explorar cursos</ButtonLink>
          <ButtonLink href="/cadastro" variant="secondary" size="lg">Criar conta gratuita</ButtonLink>
        </div>
      </section>

      <section aria-labelledby="niveis">
        <h2 id="niveis" className="font-display text-3xl text-text">Como você quer aprender</h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {levels.map((l) => (
            <li key={l.id}>
              <Link href={`/${l.slug}`} className="block h-full no-underline">
                <Card variant="interactive" className="h-full">
                  <h3 className="font-display text-2xl text-text">{l.label}</h3>
                  <p className="mt-2 text-sm text-text-muted">{l.description ?? LEVELS[l.kind].description}</p>
                  <p className="mt-4 text-sm font-medium text-primary-text">
                    {l.count} {l.count === 1 ? "programa disponível" : "programas disponíveis"} →
                  </p>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
