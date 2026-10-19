import Link from "next/link";
import type { Metadata } from "next";
import { getTenant } from "@/lib/tenant";
import { withTenant } from "@/lib/db";
import { PageHeader, EmptyState } from "@/components/ui/misc";
import { FeaturedCourses } from "@/components/campus/FeaturedCourses";
import { formatWorkload } from "@/lib/levels";
import { levelPath } from "@/lib/catalog-paths";

export const metadata: Metadata = { title: "Encontre sua formação" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const params = await searchParams;
  const query = (typeof params.q === "string" ? params.q : "").trim().slice(0, 120);
  const tenant = await getTenant();
  const modules = await withTenant(tenant.id, (tx) =>
    tx.module.findMany({
      where: {
        tenantId: tenant.id,
        status: "PUBLICADO",
        level: { active: true },
        ...(query
          ? {
              OR: [
                { title: { contains: query, mode: "insensitive" as const } },
                { summary: { contains: query, mode: "insensitive" as const } },
                { segment: { name: { contains: query, mode: "insensitive" as const } } },
                {
                  topics: {
                    some: { status: "PUBLICADO" as const, title: { contains: query, mode: "insensitive" as const } },
                  },
                },
              ],
            }
          : {}),
      },
      include: { level: true, segment: true, _count: { select: { topics: { where: { status: "PUBLICADO" } } } } },
      orderBy: [{ order: "asc" }, { title: "asc" }],
      take: 100,
    }),
  );
  const levels = [
    ...new Map(
      modules.map((module) => [module.level.slug, { slug: module.level.slug, label: module.level.label }]),
    ).values(),
  ];
  return (
    <>
      <PageHeader
        eyebrow="Explore novos caminhos"
        title={query ? `Resultados para “${query}”` : "Encontre sua próxima formação"}
        description={
          query
            ? `${modules.length}${modules.length === 100 ? "+" : ""} ${modules.length === 1 ? "formação encontrada" : "formações encontradas"} no catálogo publicado.`
            : "Escolha um formato e descubra o que você pode aprender."
        }
      />
      <form action="/buscar" className="mb-8 flex max-w-xl flex-wrap gap-3">
        <label htmlFor="catalog-search" className="sr-only">
          O que você quer aprender?
        </label>
        <input
          id="catalog-search"
          name="q"
          type="search"
          maxLength={120}
          defaultValue={query}
          placeholder="Busque por área, formação ou assunto"
          className="min-h-11 min-w-0 flex-1 rounded-md border border-border-strong bg-surface px-4 text-sm text-text"
        />
        <button type="submit" className="rounded-md bg-primary-strong px-5 py-2 text-sm text-text-on-primary">
          Pesquisar
        </button>
      </form>
      {modules.length ? (
        <FeaturedCourses
          key={query}
          showAll
          levels={levels}
          courses={modules.map((module) => ({
            id: module.id,
            title: module.title,
            href: levelPath(module.level.slug, module.segment.slug, module.slug),
            segment: module.segment.name,
            segmentSlug: module.segment.slug,
            level: module.level.label,
            levelSlug: module.level.slug,
            workload: formatWorkload(module.workloadMinutes),
            topics: module._count.topics,
          }))}
        />
      ) : (
        <EmptyState
          title="Vamos descobrir outro caminho?"
          text="Nenhuma formação corresponde a essa busca. Tente uma área ou outro assunto."
          action={<Link href="/buscar">Ver todas as formações</Link>}
        />
      )}
    </>
  );
}
