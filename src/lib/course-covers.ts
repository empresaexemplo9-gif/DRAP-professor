import "server-only";
import { cache } from "react";
import { withTenant } from "@/lib/db";

/**
 * Posição de cada curso no catálogo inteiro (ordem de criação). A capa usa essa posição para
 * escolher padrão e cor sem repetir combinação entre cards.
 */
export const getCoverIndex = cache(async (tenantId: string): Promise<Record<string, number>> => {
  const rows = await withTenant(tenantId, (tx) =>
    tx.module.findMany({ where: { tenantId }, orderBy: [{ createdAt: "asc" }, { slug: "asc" }], select: { slug: true } }),
  );
  return Object.fromEntries(rows.map((r, i) => [r.slug, i]));
});
