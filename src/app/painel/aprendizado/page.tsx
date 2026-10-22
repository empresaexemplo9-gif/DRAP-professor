import type { Metadata } from "next";
import Link from "next/link";
import { requireViewer } from "@/lib/session";
import { withTenant } from "@/lib/db";
import { levelPath } from "@/lib/catalog-paths";
import { DataTable, EmptyState, PageHeader, ProgressBar } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatBRL } from "@/lib/payments/pix-state";
import { ENROLLMENT_STATUS_LABEL, isPastEnd } from "@/lib/enrollments";

export const metadata: Metadata = { title: "Meu Aprendizado" };

export default async function LearningPage() {
  const viewer = await requireViewer();
  const pendingPix = await withTenant(viewer.tenant.id, (tx) =>
    tx.pixCheckout.findMany({
      where: { tenantId: viewer.tenant.id, userId: viewer.user.id, status: "PENDING", expiresAt: { gt: new Date() }, providerPaymentId: { not: null } },
      select: { id: true, amountCents: true, expiresAt: true, module: { select: { title: true } } },
      orderBy: { createdAt: "desc" },
    }),
  );
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
      {pendingPix.length > 0 && (
        <Card className="mb-6 space-y-3">
          <h2 className="font-display text-xl text-text">Pagamentos Pix em aberto</h2>
          <ul className="space-y-2 text-sm">
            {pendingPix.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-text">{p.module.title} · {formatBRL(p.amountCents)}</span>
                <ButtonLink href={`/checkout/pix/${p.id}`} variant="gold" size="sm">Pagar com Pix</ButtonLink>
              </li>
            ))}
          </ul>
        </Card>
      )}
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
                <td className="whitespace-nowrap text-text-muted">
                  {ENROLLMENT_STATUS_LABEL[isPastEnd(e) ? "EXPIRADA" : e.status].label}
                  {e.endsAt && !isPastEnd(e) && e.status === "ATIVA" && <span className="block text-xs">até {e.endsAt.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}</span>}
                </td>
                <td className="min-w-48"><ProgressBar value={total ? (e.progress.length / total) * 100 : 0} label={`${e.progress.length}/${total}`} /></td>
              </tr>
            );
          })}
        </DataTable>
      )}
    </>
  );
}
