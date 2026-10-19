import Link from "next/link";
import type { Metadata } from "next";
import { requirePermission } from "@/lib/session";
import { withTenant } from "@/lib/db";
import { formatWorkload } from "@/lib/levels";
import { DataTable, EmptyState, LinkTabs, PageHeader } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { SegmentManager } from "./SegmentManager";

export const metadata: Metadata = { title: "Conteúdo" };

export default async function ContentPage({ searchParams }: { searchParams: Promise<{ aba?: string; nivel?: string }> }) {
  const viewer = await requirePermission("content:manage");
  const { aba = "modulos", nivel } = await searchParams;
  const t = viewer.tenant.id;
  const { levels, segments, modules } = await withTenant(t, async (tx) => {
    const levels = await tx.level.findMany({ where: { tenantId: t }, orderBy: { order: "asc" } });
    const segments = await tx.segment.findMany({ where: { tenantId: t }, orderBy: [{ order: "asc" }, { name: "asc" }], include: { _count: { select: { modules: true } } } });
    const level = levels.find((l) => l.slug === nivel);
    const modules = await tx.module.findMany({
      where: { tenantId: t, ...(level ? { levelId: level.id } : {}) },
      include: { level: true, segment: true, _count: { select: { topics: true, enrollments: true } } },
      orderBy: [{ updatedAt: "desc" }],
    });
    return { levels, segments, modules };
  });

  const tabs = [
    { key: "modulos", label: "Módulos", href: "/painel/conteudo" },
    { key: "segmentos", label: "Segmentos", href: "/painel/conteudo?aba=segmentos" },
  ];

  return (
    <>
      <PageHeader
        title="Conteúdo"
        description="Estrutura Nível › Segmento › Módulo › Assunto."
        actions={aba === "modulos" ? <ButtonLink href="/painel/conteudo/modulos/novo">Novo módulo</ButtonLink> : undefined}
      />
      <LinkTabs items={tabs} current={aba} />
      {aba === "segmentos" ? (
        <SegmentManager segments={segments.map((s) => ({ id: s.id, name: s.name, slug: s.slug, description: s.description ?? "", order: s.order, modules: s._count.modules }))} />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filtrar por nível">
            <ButtonLink size="sm" variant={!nivel ? "primary" : "secondary"} href="/painel/conteudo">Todos</ButtonLink>
            {levels.map((l) => (
              <ButtonLink key={l.id} size="sm" variant={nivel === l.slug ? "primary" : "secondary"} href={`/painel/conteudo?nivel=${l.slug}`}>
                {l.label}
              </ButtonLink>
            ))}
          </div>
          {modules.length === 0 ? (
            <EmptyState
              title="Nenhum módulo"
              text={segments.length ? "Crie o primeiro módulo deste nível." : "Comece cadastrando um segmento (ex.: Gestão e Liderança, Finanças)."}
              action={segments.length ? <ButtonLink href="/painel/conteudo/modulos/novo">Novo módulo</ButtonLink> : <ButtonLink href="/painel/conteudo?aba=segmentos">Cadastrar segmento</ButtonLink>}
            />
          ) : (
            <DataTable head={["Módulo", "Nível", "Segmento", "Assuntos", "Matrículas", "Carga", "Situação"]} caption="Módulos">
              {modules.map((m) => (
                <tr key={m.id}>
                  <td className="min-w-56"><Link href={`/painel/conteudo/modulos/${m.id}`}>{m.title}</Link></td>
                  <td className="whitespace-nowrap text-text-muted">{m.level.label}</td>
                  <td className="whitespace-nowrap text-text-muted">{m.segment.name}</td>
                  <td className="text-text-muted">{m._count.topics}</td>
                  <td className="text-text-muted">{m._count.enrollments}</td>
                  <td className="whitespace-nowrap text-text-muted">{formatWorkload(m.workloadMinutes)}</td>
                  <td><StatusBadge status={m.status} /></td>
                </tr>
              ))}
            </DataTable>
          )}
        </>
      )}
    </>
  );
}
