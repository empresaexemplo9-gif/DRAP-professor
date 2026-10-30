import "server-only";
import type { Prisma } from "@prisma/client";
import { withTenant, type Tx } from "@/lib/db";
import { gradeExam, nextReview, updateStreak, type ExamItem } from "./engine";

/** Encerramento e correção de tentativas (uso interno do servidor; nunca exposto como ação). */

async function touch(tx: Tx, tenantId: string, userId: string, seconds: number) {
  const p = await tx.cpaStudyPlan.upsert({ where: { tenantId_userId: { tenantId, userId } }, create: { tenantId, userId }, update: {} });
  const today = new Date();
  await tx.cpaStudyPlan.update({ where: { id: p.id }, data: { streakDays: updateStreak(p.lastStudyOn, p.streakDays, today), lastStudyOn: today, totalSeconds: { increment: seconds } } });
  return p;
}

export async function finalizeAttempt(tx: Tx, attemptId: string, tenantId: string, userId: string) {
  const a = await tx.cpaAttempt.findFirst({ where: { id: attemptId, tenantId, userId } });
  if (!a || a.submittedAt) return a;
  const items = a.items as unknown as ExamItem[];
  const result = gradeExam(items, a.answers as Record<string, string>, a.timings as Record<string, number>);
  const expired = Date.now() > a.deadlineAt.getTime() + 60_000;
  const done = await tx.cpaAttempt.update({
    where: { id: a.id },
    data: { submittedAt: new Date(), expired, score: result.percent, hits: result.hits, result: result as unknown as Prisma.InputJsonValue },
  });
  // Erros e questões em branco entram na fila de revisão espaçada.
  const days = (await tx.cpaStudyPlan.upsert({ where: { tenantId_userId: { tenantId, userId } }, create: { tenantId, userId }, update: {} })).reviewDays;
  for (const it of items) {
    const correct = (a.answers as Record<string, string>)[it.code] === it.correct;
    const prev = await tx.cpaReview.findUnique({ where: { tenantId_userId_kind_refCode: { tenantId, userId, kind: "QUESTAO", refCode: it.code } } });
    if (!prev && correct) continue;
    const next = nextReview(prev ?? { stage: 0, lapses: 0 }, correct, new Date(), days);
    await tx.cpaReview.upsert({
      where: { tenantId_userId_kind_refCode: { tenantId, userId, kind: "QUESTAO", refCode: it.code } },
      create: { tenantId, userId, kind: "QUESTAO", refCode: it.code, itemCode: it.items[0] ?? null, ...next },
      update: next,
    });
  }
  await touch(tx, tenantId, userId, result.seconds);
  return done;
}

/** Encerra tentativas vencidas do aluno (chamado ao abrir a lista e o painel). */
export async function closeExpiredAttempts(tenantId: string, userId: string) {
  await withTenant(tenantId, async (tx) => {
    const stale = await tx.cpaAttempt.findMany({ where: { tenantId, userId, submittedAt: null, deadlineAt: { lt: new Date(Date.now() - 60_000) } }, select: { id: true } });
    for (const s of stale) await finalizeAttempt(tx, s.id, tenantId, userId);
  });
}

