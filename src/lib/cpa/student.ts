import "server-only";
import { withTenant } from "@/lib/db";
import { OFFICIAL_WEIGHTS, type ExamResult } from "./engine";

/** Consultas do ambiente do aluno (painel, desempenho, sumário). */

export async function getCourseIndex(tenantId: string, userId: string) {
  return withTenant(tenantId, async (tx) => {
    const chapters = await tx.cpaChapter.findMany({
      where: { tenantId, status: { not: "ARQUIVADO" } },
      orderBy: { order: "asc" },
      include: {
        lessons: {
          where: { status: "PUBLICADO" },
          orderBy: { order: "asc" },
          select: { id: true, code: true, title: true, minutes: true, items: { select: { item: { select: { code: true } } } } },
        },
      },
    });
    const progress = await tx.cpaLessonProgress.findMany({ where: { tenantId, userId }, select: { lessonId: true, completed: true, seconds: true } });
    return { chapters, progress: new Map(progress.map((p) => [p.lessonId, p])) };
  });
}

export async function getDashboard(tenantId: string, userId: string) {
  const { chapters, progress } = await getCourseIndex(tenantId, userId);
  return withTenant(tenantId, async (tx) => {
    const lessons = chapters.flatMap((c) => c.lessons.map((l) => ({ ...l, chapter: c })));
    const done = lessons.filter((l) => progress.get(l.id)?.completed);
    const next = lessons.find((l) => !progress.get(l.id)?.completed);
    const plan = await tx.cpaStudyPlan.findUnique({ where: { tenantId_userId: { tenantId, userId } } });
    const last = plan?.lastLessonCode ? lessons.find((l) => l.code === plan.lastLessonCode) : undefined;
    const attempts = await tx.cpaAttempt.findMany({
      where: { tenantId, userId, submittedAt: { not: null } },
      orderBy: { submittedAt: "desc" },
      include: { exam: { select: { code: true, title: true, kind: true, targetPercent: true } } },
    });
    const reviewsDue = await tx.cpaReview.count({ where: { tenantId, userId, dueAt: { lte: new Date() } } });
    const reviewRows = await tx.cpaReview.findMany({ where: { tenantId, userId }, select: { lastResult: true, itemCode: true, lapses: true } });
    // Respostas: tentativas de simulado + questões do modo estudo (fila de revisão).
    const answered = attempts.reduce((a, t) => a + (t.result as ExamResult | null)!.total, 0);
    const hits = attempts.reduce((a, t) => a + (t.hits ?? 0), 0);
    // Pontos de dificuldade: microtemas com mais erros acumulados.
    const misses = new Map<string, { total: number; hits: number }>();
    for (const t of attempts) for (const r of (t.result as ExamResult).byItem) {
      const m = misses.get(r.item) ?? { total: 0, hits: 0 };
      m.total += r.total;
      m.hits += r.hits;
      misses.set(r.item, m);
    }
    for (const r of reviewRows) if (r.itemCode && r.lapses) {
      const m = misses.get(r.itemCode) ?? { total: 0, hits: 0 };
      m.total += r.lapses;
      misses.set(r.itemCode, m);
    }
    const weakCodes = [...misses.entries()]
      .filter(([, m]) => m.hits < m.total)
      .sort((a, b) => (b[1].total - b[1].hits) / b[1].total - (a[1].total - a[1].hits) / a[1].total || (OFFICIAL_WEIGHTS[b[0][0]!] ?? 0) - (OFFICIAL_WEIGHTS[a[0][0]!] ?? 0))
      .slice(0, 5);
    const weakItems = await tx.cpaSyllabusItem.findMany({ where: { tenantId, code: { in: weakCodes.map(([c]) => c) } }, select: { code: true, text: true } });
    const weak = weakCodes.map(([c, m]) => ({ code: c, text: weakItems.find((w) => w.code === c)?.text ?? c, ...m }));

    // Próximo simulado recomendado: diagnóstico primeiro; depois o do macrotema com menos tentativas.
    const exams = await tx.cpaExam.findMany({ where: { tenantId, status: "PUBLICADO" }, orderBy: { order: "asc" } });
    const doneExams = new Set(attempts.map((a) => a.exam.code));
    const completedMacros = new Set(
      chapters.filter((c) => c.lessons.length && c.lessons.every((l) => progress.get(l.id)?.completed)).map((c) => c.macro),
    );
    const recommended =
      exams.find((e) => e.kind === "DIAGNOSTICO" && !doneExams.has(e.code)) ??
      exams.find((e) => e.kind === "MODULO" && e.macros.some((m) => completedMacros.has(m)) && !doneExams.has(e.code)) ??
      exams.find((e) => e.kind === "COMPLETO" && !doneExams.has(e.code)) ??
      exams.find((e) => !doneExams.has(e.code));

    return {
      totalLessons: lessons.length,
      doneLessons: done.length,
      percent: lessons.length ? Math.round((done.length / lessons.length) * 100) : 0,
      next,
      last,
      plan,
      answered,
      hits,
      accuracy: answered ? Math.round((hits / answered) * 1000) / 10 : null,
      reviewsDue,
      weak,
      recommended,
      lastAttempts: attempts.slice(0, 5),
    };
  });
}

export function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return h ? `${h} h ${String(m).padStart(2, "0")} min` : `${m} min`;
}
