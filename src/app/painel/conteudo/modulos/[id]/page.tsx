import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requirePermission } from "@/lib/session";
import { prisma, withTenant } from "@/lib/db";
import { can } from "@/lib/rbac";
import { levelPath } from "@/lib/catalog-paths";
import { formatWorkload } from "@/lib/levels";
import { Breadcrumb, DataTable, PageHeader } from "@/components/ui/misc";
import { Button, ButtonLink } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { ModuleForm } from "../../ModuleForm";
import { EnrollForm, NewTopicForm, StaffForm } from "../../SmallForms";
import { cancelEnrollmentAction, moveTopicAction, removeStaffAction, setModuleStatusAction } from "../../actions";

export const metadata: Metadata = { title: "Editar módulo" };

const STAFF_LABEL = { AUTOR: "Autor", INSTRUTOR: "Instrutor", MENTOR: "Mentor" } as const;

export default async function ModuleEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await requirePermission("content:manage");
  const t = viewer.tenant.id;
  const data = await withTenant(t, async (tx) => {
    const mod = await tx.module.findFirst({
      where: { id, tenantId: t },
      include: {
        level: true,
        segment: true,
        topics: { orderBy: [{ order: "asc" }, { createdAt: "asc" }] },
        staff: true,
        enrollments: { orderBy: { createdAt: "desc" }, take: 100, include: { user: { select: { name: true, email: true } } } },
      },
    });
    if (!mod) return null;
    const levels = await tx.level.findMany({ where: { tenantId: t }, orderBy: { order: "asc" } });
    const segments = await tx.segment.findMany({ where: { tenantId: t }, orderBy: [{ order: "asc" }, { name: "asc" }] });
    return { mod, levels, segments };
  });
  if (!data) notFound();
  const { mod, levels, segments } = data;
  const staffUsers = await prisma.user.findMany({ where: { id: { in: mod.staff.map((s) => s.userId) } }, select: { id: true, name: true, email: true } });
  const canPublish = can(viewer.roles, "content:publish");
  const publicUrl = levelPath(mod.level.slug, mod.segment.slug, mod.slug);

  const statusButtons = (["RASCUNHO", "REVISAO", "PUBLICADO", "ARQUIVADO"] as const).filter((s) => s !== mod.status);
  const statusLabel = { RASCUNHO: "Voltar a rascunho", REVISAO: "Enviar para revisão", PUBLICADO: "Publicar", ARQUIVADO: "Arquivar" } as const;

  return (
    <>
      <Breadcrumb items={[{ href: "/painel/conteudo", label: "Conteúdo" }, { href: `/painel/conteudo?nivel=${mod.level.slug}`, label: mod.level.label }, { label: mod.title }]} />
      <PageHeader
        eyebrow={`${mod.level.label} · ${mod.segment.name}`}
        title={mod.title}
        description={<span className="inline-flex items-center gap-2"><StatusBadge status={mod.status} /> <span>Endereço: {publicUrl}</span></span>}
        actions={mod.status === "PUBLICADO" ? <ButtonLink href={publicUrl} variant="secondary" target="_blank">Ver página</ButtonLink> : undefined}
      />
      {canPublish && (
        <div className="mb-8 flex flex-wrap gap-2">
          {statusButtons.map((s) => (
            <form key={s} action={setModuleStatusAction}>
              <input type="hidden" name="id" value={mod.id} />
              <input type="hidden" name="status" value={s} />
              <Button type="submit" size="sm" variant={s === "PUBLICADO" ? "primary" : s === "ARQUIVADO" ? "danger" : "secondary"}>{statusLabel[s]}</Button>
            </form>
          ))}
        </div>
      )}

      <div className="grid gap-8 xl:grid-cols-[1fr_24rem]">
        <div className="space-y-8">
          <section aria-labelledby="assuntos" className="space-y-4">
            <h2 id="assuntos" className="font-display text-2xl text-text">Assuntos</h2>
            {mod.topics.length > 0 && (
              <DataTable head={["#", "Assunto", "Duração", "Situação", "Ordem"]} caption="Assuntos do módulo">
                {mod.topics.map((topic, i) => (
                  <tr key={topic.id}>
                    <td className="text-text-muted">{i + 1}</td>
                    <td className="min-w-48"><Link href={`/painel/conteudo/assuntos/${topic.id}`}>{topic.title}</Link></td>
                    <td className="whitespace-nowrap text-text-muted">{formatWorkload(topic.durationMinutes)}</td>
                    <td><StatusBadge status={topic.status} /></td>
                    <td className="whitespace-nowrap">
                      <div className="flex gap-1">
                        {(["up", "down"] as const).map((dir) => (
                          <form key={dir} action={moveTopicAction}>
                            <input type="hidden" name="id" value={topic.id} />
                            <input type="hidden" name="dir" value={dir} />
                            <Button type="submit" size="sm" variant="ghost" aria-label={dir === "up" ? `Mover ${topic.title} para cima` : `Mover ${topic.title} para baixo`} disabled={dir === "up" ? i === 0 : i === mod.topics.length - 1}>
                              {dir === "up" ? "↑" : "↓"}
                            </Button>
                          </form>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </DataTable>
            )}
            <Card><NewTopicForm moduleId={mod.id} /></Card>
          </section>

          <section aria-labelledby="dados" className="space-y-4">
            <h2 id="dados" className="font-display text-2xl text-text">Dados do módulo</h2>
            <Card>
              <ModuleForm
                levels={levels.map((l) => ({ id: l.id, label: l.label, kind: l.kind }))}
                segments={segments.map((s) => ({ id: s.id, label: s.name }))}
                values={{
                  id: mod.id,
                  levelId: mod.levelId,
                  segmentId: mod.segmentId,
                  title: mod.title,
                  slug: mod.slug,
                  summary: mod.summary ?? "",
                  workloadHours: mod.workloadMinutes / 60,
                  priceCents: mod.priceCents,
                  certificateType: mod.certificateType,
                  order: mod.order,
                  levelConfig: mod.levelConfig as Record<string, unknown>,
                }}
              />
            </Card>
          </section>
        </div>

        <div className="space-y-8">
          <section aria-labelledby="equipe" className="space-y-3">
            <h2 id="equipe" className="font-display text-2xl text-text">Equipe</h2>
            <Card className="space-y-4">
              {mod.staff.length === 0 ? (
                <p className="text-sm text-text-muted">Nenhum autor, instrutor ou mentor vinculado.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {mod.staff.map((s) => {
                    const u = staffUsers.find((x) => x.id === s.userId);
                    return (
                      <li key={s.id} className="flex items-center justify-between gap-2 py-2">
                        <span className="min-w-0">
                          <span className="block truncate text-sm text-text">{u?.name ?? s.userId}</span>
                          <span className="text-xs text-text-muted">{STAFF_LABEL[s.role]}</span>
                        </span>
                        <form action={removeStaffAction}>
                          <input type="hidden" name="id" value={s.id} />
                          <Button size="sm" variant="ghost" type="submit" aria-label={`Remover ${u?.name ?? ""}`}>Remover</Button>
                        </form>
                      </li>
                    );
                  })}
                </ul>
              )}
              <StaffForm moduleId={mod.id} />
            </Card>
          </section>

          {can(viewer.roles, "enrollment:manage") && (
            <section aria-labelledby="matriculas" className="space-y-3">
              <h2 id="matriculas" className="font-display text-2xl text-text">Matrículas</h2>
              <Card className="space-y-4">
                <EnrollForm moduleId={mod.id} />
                {mod.enrollments.length > 0 && (
                  <ul className="divide-y divide-border">
                    {mod.enrollments.map((e) => (
                      <li key={e.id} className="flex items-center justify-between gap-2 py-2">
                        <span className="min-w-0">
                          <span className="block truncate text-sm text-text">{e.user.name}</span>
                          <span className="block truncate text-xs text-text-muted">{e.user.email} · {e.status === "ATIVA" ? "ativa" : e.status.toLowerCase()}</span>
                        </span>
                        {e.status === "ATIVA" && (
                          <form action={cancelEnrollmentAction}>
                            <input type="hidden" name="id" value={e.id} />
                            <Button size="sm" variant="ghost" type="submit">Cancelar</Button>
                          </form>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
