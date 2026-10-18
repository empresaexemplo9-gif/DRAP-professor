import type { Metadata } from "next";
import { requireViewer } from "@/lib/session";
import { withTenant } from "@/lib/db";
import { getLevelOverview } from "@/lib/catalog";
import { EmptyState, LinkTabs, PageHeader } from "@/components/ui/misc";
import { ModuleGrid } from "@/components/catalog/ModuleGrid";

export const metadata: Metadata = { title: "Catálogo" };

export default async function CatalogPage({ searchParams }: { searchParams: Promise<{ nivel?: string }> }) {
  const viewer = await requireViewer();
  const { nivel } = await searchParams;
  const levels = await withTenant(viewer.tenant.id, (tx) =>
    tx.level.findMany({ where: { tenantId: viewer.tenant.id, active: true }, orderBy: { order: "asc" } }),
  );
  const current = levels.find((l) => l.slug === nivel) ?? levels[0];
  const groups = current ? await getLevelOverview(viewer.tenant.id, current.id) : [];
  return (
    <>
      <PageHeader title="Catálogo" description="Conteúdos organizados por nível e segmento." />
      <LinkTabs items={levels.map((l) => ({ key: l.slug, label: l.label, href: `/painel/catalogo?nivel=${l.slug}` }))} current={current?.slug ?? ""} />
      {groups.length === 0 ? (
        <EmptyState title="Em breve" text="Ainda não há conteúdos publicados neste nível." />
      ) : (
        <div className="space-y-10">
          {groups.map((g) => (
            <section key={g.segment.id} aria-labelledby={`g-${g.segment.id}`}>
              <h2 id={`g-${g.segment.id}`} className="mb-4 font-display text-2xl text-text">{g.segment.name}</h2>
              <ModuleGrid levelSlug={current!.slug} segmentSlug={g.segment.slug} modules={g.modules} />
            </section>
          ))}
        </div>
      )}
    </>
  );
}
