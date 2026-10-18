import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTenant } from "@/lib/tenant";
import { getLevelBySlug, getLevelOverview, levelPath } from "@/lib/catalog";
import { LEVELS } from "@/lib/levels";
import { Breadcrumb, EmptyState, PageHeader } from "@/components/ui/misc";
import { ModuleGrid } from "@/components/catalog/ModuleGrid";

type Params = { nivel: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { nivel } = await params;
  const tenant = await getTenant();
  const level = await getLevelBySlug(tenant.id, nivel);
  return { title: level?.label ?? "Não encontrado" };
}

export default async function LevelPage({ params }: { params: Promise<Params> }) {
  const { nivel } = await params;
  const tenant = await getTenant();
  const level = await getLevelBySlug(tenant.id, nivel);
  if (!level) notFound();
  const groups = await getLevelOverview(tenant.id, level.id);
  return (
    <>
      <Breadcrumb items={[{ href: "/", label: "Início" }, { label: level.label }]} />
      <PageHeader eyebrow="Catálogo" title={level.label} description={level.description ?? LEVELS[level.kind].description} />
      {groups.length === 0 ? (
        <EmptyState title="Em breve" text={`Ainda não há ${level.label.toLowerCase()} publicadas.`} />
      ) : (
        <div className="space-y-12">
          {groups.map(({ segment, modules }) => (
            <section key={segment.id} aria-labelledby={`seg-${segment.id}`}>
              <div className="mb-4 flex items-baseline justify-between gap-4">
                <h2 id={`seg-${segment.id}`} className="font-display text-2xl text-text">
                  <Link href={levelPath(level.slug, segment.slug)} className="text-text no-underline hover:text-primary-text">
                    {segment.name}
                  </Link>
                </h2>
                <Link href={levelPath(level.slug, segment.slug)} className="text-sm">Ver segmento</Link>
              </div>
              <ModuleGrid levelSlug={level.slug} segmentSlug={segment.slug} modules={modules} />
            </section>
          ))}
        </div>
      )}
    </>
  );
}
