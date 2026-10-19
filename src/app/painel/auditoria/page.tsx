import type { Metadata } from "next";
import { requirePermission } from "@/lib/session";
import { prisma, withTenant } from "@/lib/db";
import { DataTable, PageHeader } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Auditoria" };

export default async function AuditPage() {
  const viewer = await requirePermission("audit:view");
  const logs = await withTenant(viewer.tenant.id, (tx) =>
    tx.auditLog.findMany({ where: { tenantId: viewer.tenant.id }, orderBy: { createdAt: "desc" }, take: 200 }),
  );
  const actors = await prisma.user.findMany({ where: { id: { in: [...new Set(logs.map((l) => l.actorId).filter((x): x is string => Boolean(x)))] } }, select: { id: true, name: true } });
  return (
    <>
      <PageHeader title="Auditoria" description="Registro imutável das ações sensíveis (últimas 200)." />
      <DataTable head={["Data", "Pessoa", "Ação", "Entidade", "IP"]} caption="Registro de auditoria">
        {logs.map((l) => (
          <tr key={l.id}>
            <td className="whitespace-nowrap text-text-muted">{l.createdAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</td>
            <td className="whitespace-nowrap">{actors.find((a) => a.id === l.actorId)?.name ?? "Sistema"}</td>
            <td className="font-mono text-xs text-text">{l.action}</td>
            <td className="text-text-muted">{l.entity}</td>
            <td className="whitespace-nowrap text-text-muted">{l.ip ?? "—"}</td>
          </tr>
        ))}
      </DataTable>
    </>
  );
}
