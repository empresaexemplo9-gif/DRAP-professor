import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requirePermission } from "@/lib/session";
import { prisma, withTenant } from "@/lib/db";
import { can } from "@/lib/rbac";
import { levelPath } from "@/lib/catalog-paths";
import { parseDocument } from "@/content-blocks/schema";
import { Breadcrumb, DataTable, PageHeader } from "@/components/ui/misc";
import { StatusBadge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { TopicEditor } from "./TopicEditor";
import { restoreVersionAction, setTopicStatusAction } from "../../actions";

export const metadata: Metadata = { title: "Editar assunto" };

export default async function TopicEditPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ r?: string }> }) {
  const { id } = await params;
  const { r } = await searchParams;
  const viewer = await requirePermission("content:manage");
  const t = viewer.tenant.id;
  const topic = await withTenant(t, (tx) =>
    tx.topic.findFirst({
      where: { id, tenantId: t },
      include: { module: { include: { level: true, segment: true } }, versions: { orderBy: { number: "desc" }, take: 20 } },
    }),
  );
  if (!topic) notFound();
  const authors = await prisma.user.findMany({ where: { id: { in: [...new Set(topic.versions.map((v) => v.authorId))] } }, select: { id: true, name: true } });
  const doc = parseDocument(topic.draft, topic.title);
  const canPublish = can(viewer.roles, "content:publish");
  const m = topic.module;
  const publicUrl = levelPath(m.level.slug, m.segment.slug, m.slug, topic.slug);
  return (
    <>
      <Breadcrumb
        items={[
          { href: "/painel/conteudo", label: "Conteúdo" },
          { href: `/painel/conteudo/modulos/${m.id}`, label: m.title },
          { label: topic.title },
        ]}
      />
      <PageHeader
        eyebrow={`${m.level.label} · ${m.segment.name} · ${m.title}`}
        title={topic.title}
        description={<span className="inline-flex items-center gap-2"><StatusBadge status={topic.status} /> {topic.publishedVersionId ? "Há uma versão publicada." : "Ainda não publicado."}</span>}
        actions={
          topic.status === "PUBLICADO" && m.status === "PUBLICADO" ? (
            <ButtonLink href={publicUrl} target="_blank" variant="secondary">Ver página publicada</ButtonLink>
          ) : undefined
        }
      />
      {canPublish && topic.publishedVersionId && (
        <div className="mb-6 flex flex-wrap gap-2">
          {topic.status !== "ARQUIVADO" && (
            <form action={setTopicStatusAction}>
              <input type="hidden" name="id" value={topic.id} />
              <input type="hidden" name="status" value="ARQUIVADO" />
              <Button size="sm" variant="danger" type="submit">Despublicar (arquivar)</Button>
            </form>
          )}
          {topic.status === "ARQUIVADO" && (
            <form action={setTopicStatusAction}>
              <input type="hidden" name="id" value={topic.id} />
              <input type="hidden" name="status" value="PUBLICADO" />
              <Button size="sm" type="submit">Republicar última versão</Button>
            </form>
          )}
        </div>
      )}
      <TopicEditor key={r ?? "inicial"} meta={{ id: topic.id, title: topic.title, slug: topic.slug, durationMinutes: topic.durationMinutes }} document={doc} canPublish={canPublish} />

      <section aria-labelledby="historico" className="mt-12 space-y-3">
        <h2 id="historico" className="font-display text-2xl text-text">Histórico de versões</h2>
        {topic.versions.length === 0 ? (
          <p className="text-sm text-text-muted">Nenhuma versão publicada ainda.</p>
        ) : (
          <DataTable head={["Versão", "Publicada em", "Por", "Nota", ""]} caption="Versões publicadas">
            {topic.versions.map((v) => (
              <tr key={v.id}>
                <td className="font-medium text-text">
                  v{v.number} {v.id === topic.publishedVersionId && <span className="text-xs text-success">(atual)</span>}
                </td>
                <td className="whitespace-nowrap text-text-muted">{v.createdAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</td>
                <td className="text-text-muted">{authors.find((a) => a.id === v.authorId)?.name ?? "—"}</td>
                <td className="text-text-muted">{v.changeNote ?? "—"}</td>
                <td>
                  <form action={restoreVersionAction}>
                    <input type="hidden" name="versionId" value={v.id} />
                    <Button size="sm" variant="ghost" type="submit">Restaurar no rascunho</Button>
                  </form>
                </td>
              </tr>
            ))}
          </DataTable>
        )}
      </section>
    </>
  );
}
