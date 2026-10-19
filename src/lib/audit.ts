import type { Prisma } from "@prisma/client";
import type { Tx } from "./db";

/** Registra ação sensível. Tabela somente-inserção (sem UPDATE/DELETE para a aplicação). */
export async function audit(
  tx: Tx,
  entry: { tenantId: string; actorId?: string | null; action: string; entity: string; entityId?: string | null; data?: Prisma.InputJsonValue; ip?: string | null },
) {
  await tx.auditLog.create({
    data: {
      tenantId: entry.tenantId,
      actorId: entry.actorId ?? null,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId ?? null,
      data: entry.data,
      ip: entry.ip ?? null,
    },
  });
}
