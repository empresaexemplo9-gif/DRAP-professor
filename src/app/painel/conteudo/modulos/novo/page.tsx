import type { Metadata } from "next";
import { requirePermission } from "@/lib/session";
import { withTenant } from "@/lib/db";
import { Breadcrumb, EmptyState, PageHeader } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/Button";
import { ModuleForm } from "../../ModuleForm";

export const metadata: Metadata = { title: "Novo módulo" };

export default async function NewModulePage() {
  const viewer = await requirePermission("content:manage");
  const t = viewer.tenant.id;
  const { levels, segments } = await withTenant(t, async (tx) => ({
    levels: await tx.level.findMany({ where: { tenantId: t }, orderBy: { order: "asc" } }),
    segments: await tx.segment.findMany({ where: { tenantId: t }, orderBy: [{ order: "asc" }, { name: "asc" }] }),
  }));
  return (
    <>
      <Breadcrumb items={[{ href: "/painel/conteudo", label: "Conteúdo" }, { label: "Novo módulo" }]} />
      <PageHeader title="Novo módulo" />
      {segments.length === 0 ? (
        <EmptyState title="Cadastre um segmento primeiro" text="Todo módulo pertence a um nível e a um segmento." action={<ButtonLink href="/painel/conteudo?aba=segmentos">Cadastrar segmento</ButtonLink>} />
      ) : (
        <div className="max-w-3xl">
          <ModuleForm levels={levels.map((l) => ({ id: l.id, label: l.label, kind: l.kind }))} segments={segments.map((s) => ({ id: s.id, label: s.name }))} />
        </div>
      )}
    </>
  );
}
