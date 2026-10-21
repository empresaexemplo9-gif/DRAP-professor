import type { Prisma } from "@prisma/client";
import { FINANCIAL_MENTORSHIPS, LEGACY_MENTORSHIP_SLUG, MENTORSHIP_SEGMENT, MENTORSHIP_SOURCE } from "../../src/lib/mentorships";

/**
 * Publica as mentorias financeiras por porte e arquiva a mentoria de exemplo que elas substituem.
 * Executa uma única vez por tenant; edições posteriores da equipe são preservadas.
 */
export async function seedFinancialMentorships(tx: Prisma.TransactionClient, tenantId: string, authorId: string) {
  const done = await tx.auditLog.findFirst({
    where: { tenantId, action: "mentorias.publicadas", data: { path: ["source"], equals: MENTORSHIP_SOURCE } },
    select: { id: true },
  });
  if (done) return;
  const level = await tx.level.findUniqueOrThrow({ where: { tenantId_kind: { tenantId, kind: "MENTORIA" } } });
  const segment = await tx.segment.upsert({
    where: { tenantId_slug: { tenantId, slug: MENTORSHIP_SEGMENT.slug } },
    create: { tenantId, ...MENTORSHIP_SEGMENT, description: "Finanças empresariais e pessoais." },
    update: {},
  });
  const created: string[] = [];
  for (const [index, m] of FINANCIAL_MENTORSHIPS.entries()) {
    const existing = await tx.module.findUnique({ where: { levelId_segmentId_slug: { levelId: level.id, segmentId: segment.id, slug: m.slug } } });
    if (existing) continue;
    const mod = await tx.module.create({
      data: {
        tenantId,
        levelId: level.id,
        segmentId: segment.id,
        title: m.title,
        slug: m.slug,
        summary: m.summary,
        audience: "EMPRESA",
        certificateType: "LIVRE",
        status: "PUBLICADO",
        order: index,
        // Formato, encontros e agenda são definidos na proposta de cada empresa.
        levelConfig: {},
      },
    });
    created.push(mod.id);
  }
  // A mentoria de exemplo é arquivada (não excluída): matrículas e progresso continuam preservados.
  const archived = await tx.module.updateMany({
    where: { tenantId, levelId: level.id, segmentId: segment.id, slug: LEGACY_MENTORSHIP_SLUG, status: { not: "ARQUIVADO" } },
    data: { status: "ARQUIVADO" },
  });
  await tx.auditLog.create({
    data: {
      tenantId,
      actorId: authorId,
      action: "mentorias.publicadas",
      entity: "Module",
      data: { source: MENTORSHIP_SOURCE, created, legacyArchived: archived.count },
    },
  });
}
