import "server-only";
import type { LevelKind } from "@prisma/client";
import { withTenant } from "./db";

/** Consultas do catálogo público (só conteúdo publicado). */

export async function getLevelBySlug(tenantId: string, slug: string) {
  return withTenant(tenantId, (tx) => tx.level.findFirst({ where: { tenantId, slug, active: true } }));
}

export async function getLevelOverview(tenantId: string, levelId: string) {
  return withTenant(tenantId, async (tx) => {
    const modules = await tx.module.findMany({
      where: { tenantId, levelId, status: "PUBLICADO" },
      orderBy: [{ order: "asc" }, { title: "asc" }],
      include: { segment: true, _count: { select: { topics: { where: { status: "PUBLICADO" } } } } },
    });
    const segments = new Map<string, { segment: (typeof modules)[number]["segment"]; modules: typeof modules }>();
    for (const m of modules) {
      const entry = segments.get(m.segmentId) ?? { segment: m.segment, modules: [] };
      entry.modules.push(m);
      segments.set(m.segmentId, entry);
    }
    return [...segments.values()].sort((a, b) => a.segment.order - b.segment.order || a.segment.name.localeCompare(b.segment.name));
  });
}

export async function getModuleBySlugs(tenantId: string, levelSlug: string, segmentSlug: string, moduleSlug: string) {
  return withTenant(tenantId, (tx) =>
    tx.module.findFirst({
      where: { tenantId, slug: moduleSlug, status: "PUBLICADO", level: { slug: levelSlug }, segment: { slug: segmentSlug } },
      include: {
        level: true,
        segment: true,
        topics: { where: { status: "PUBLICADO" }, orderBy: { order: "asc" }, select: { id: true, title: true, slug: true, durationMinutes: true } },
      },
    }),
  );
}

export async function getEnrollment(tenantId: string, userId: string, moduleId: string) {
  return withTenant(tenantId, (tx) =>
    tx.enrollment.findUnique({
      where: { userId_moduleId: { userId, moduleId } },
      include: { progress: { select: { topicId: true, status: true, quizPassed: true, bestScore: true, firstScore: true } } },
    }),
  );
}

export { levelPath } from "./catalog-paths";

export type { LevelKind };
