import type { Metadata } from "next";
import Link from "next/link";
import { requireViewer } from "@/lib/session";
import { withTenant } from "@/lib/db";
import { levelPath } from "@/lib/catalog-paths";
import { DataTable, EmptyState, PageHeader, ProgressBar } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Meu Aprendizado" };

export default async function LearningPage() {
  const viewer = await requireViewer();
  const enrollments = await withTenant(viewer.tenant.id, (tx) =>
    tx.enrollment.findMany({
      where: { tenantId: viewer.tenant.id, userId: viewer.user.id },
      include: {
        module: { include: { level: true, segment: true, _count: { select: { topics: { where: { status: "PUBLICADO" } } } } } },
        progress: { where: { status: "CONCLUIDO" }, select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  );
  return (
    <>
      <PageHeader title="Meu Aprendizado" description="Suas matrículas e o progresso em cada uma." />
      {enrollments.length === 0 ? (
        <EmptyState title="Nenhuma matrícula" text="Quando você for matriculado, seus programas aparecem aqui." action={<ButtonLink href="/painel/catalogo">Ver catálogo</ButtonLink>} />
      ) : (
        <DataTable head={["Programa", "Nível", "Situação", "Progresso"]} caption="Matrículas">
          {enrollments.map((e) => {
            const total = e.module._count.topics;
            return (
              <tr key={e.id}>
                <td className="min-w-48">
                  <Link href={levelPath(e.module.level.slug, e.module.segment.slug, e.module.slug)}>{e.module.title}</Link>
                </td>
                <td className="whitespace-nowrap text-text-muted">{e.module.level.label}</td>
                <td className="whitespace-nowrap text-text-muted">{e.status === "ATIVA" ? "Ativa" : e.status === "CONCLUIDA" ? "Concluída" : e.status === "CANCELADA" ? "Cancelada" : "Expirada"}</td>
                <td className="min-w-48"><ProgressBar value={total ? (e.progress.length / total) * 100 : 0} label={`${e.progress.length}/${total}`} /></td>
              </tr>
            );
          })}
        </DataTable>
      )}
    </>
  );
}
