import "server-only";
import { getTenant } from "@/lib/tenant";
import { withTenant } from "@/lib/db";
import { getModuleBySlugs } from "@/lib/catalog";
import { requireViewer } from "@/lib/session";
import { levelPath } from "@/lib/catalog-paths";

export type ProvaParams = { nivel: string; segmento: string; modulo: string; assunto: string };

/** Carrega curso, módulo e matrícula do aluno logado para as páginas de prova. */
export async function loadProva(p: ProvaParams) {
  const viewer = await requireViewer();
  const tenant = await getTenant();
  const mod = await getModuleBySlugs(tenant.id, p.nivel, p.segmento, p.modulo);
  if (!mod) return null;
  const topic = mod.topics.find((t) => t.slug === p.assunto);
  if (!topic) return null;
  const enrollment = await withTenant(tenant.id, (tx) => tx.enrollment.findUnique({ where: { userId_moduleId: { userId: viewer.user.id, moduleId: mod.id } } }));
  const path = levelPath(mod.level.slug, mod.segment.slug, mod.slug, topic.slug);
  return { viewer, tenant, mod, topic, enrollment, path };
}
