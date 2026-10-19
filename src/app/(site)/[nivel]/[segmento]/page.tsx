import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTenant } from "@/lib/tenant";
import { getLevelBySlug, getLevelOverview } from "@/lib/catalog";
import { Breadcrumb, EmptyState, PageHeader } from "@/components/ui/misc";
import { ModuleGrid } from "@/components/catalog/ModuleGrid";

type Params = { nivel: string; segmento: string };

async function load(p: Params) {
  const tenant = await getTenant();
  const level = await getLevelBySlug(tenant.id, p.nivel);
  if (!level) return null;
  const groups = await getLevelOverview(tenant.id, level.id);
  const group = groups.find((g) => g.segment.slug === p.segmento);
  return group ? { level, ...group } : null;
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const data = await load(await params);
  return { title: data ? `${data.segment.name} · ${data.level.label}` : "Não encontrado" };
}

export default async function SegmentPage({ params }: { params: Promise<Params> }) {
  const data = await load(await params);
  if (!data) notFound();
  const { level, segment, modules } = data;
  return (
    <>
      <Breadcrumb items={[{ href: "/", label: "Início" }, { href: `/${level.slug}`, label: level.label }, { label: segment.name }]} />
      <PageHeader eyebrow={level.label} title={segment.name} description={segment.description ?? undefined} />
      {modules.length ? (
        <ModuleGrid levelSlug={level.slug} segmentSlug={segment.slug} modules={modules} />
      ) : (
        <EmptyState title="Em breve" text="Nenhum módulo publicado neste segmento." />
      )}
    </>
  );
}
