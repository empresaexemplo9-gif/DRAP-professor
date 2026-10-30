"use server";
import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { withTenant, type Tx } from "@/lib/db";
import { getViewer, clientIp } from "@/lib/session";
import { audit } from "@/lib/audit";
import { cpaAccess } from "@/lib/cpa/access";
import { finalizeAttempt } from "@/lib/cpa/attempts";
import { buildExam, nextReview, updateStreak, walkTree, type BankQuestion, type ExamItem, type TreeGraph } from "@/lib/cpa/engine";

/** Ações do ambiente do aluno do preparatório CPA. Toda ação confere sessão e matrícula no servidor. */

async function student() {
  const viewer = await getViewer();
  const access = await cpaAccess(viewer);
  if (!viewer || !access.allowed) redirect("/cpa");
  return { viewer, tenantId: viewer.tenant.id, userId: viewer.user.id };
}

async function plan(tx: Tx, tenantId: string, userId: string) {
  return tx.cpaStudyPlan.upsert({ where: { tenantId_userId: { tenantId, userId } }, create: { tenantId, userId }, update: {} });
}

/** Registra atividade do dia (sequência de estudo) e tempo. */
async function touch(tx: Tx, tenantId: string, userId: string, seconds: number, lessonCode?: string) {
  const p = await plan(tx, tenantId, userId);
  const today = new Date();
  await tx.cpaStudyPlan.update({
    where: { id: p.id },
    data: {
      streakDays: updateStreak(p.lastStudyOn, p.streakDays, today),
      lastStudyOn: today,
      totalSeconds: { increment: seconds },
      ...(lessonCode ? { lastLessonCode: lessonCode } : {}),
    },
  });
}

const code = z.string().regex(/^CPA-[A-Z0-9-]+$/);

export async function trackTimeAction(input: { lessonCode: string; seconds: number; section?: string }) {
  const { tenantId, userId } = await student();
  const lessonCode = code.parse(input.lessonCode);
  const seconds = Math.max(0, Math.min(300, Math.round(input.seconds)));
  await withTenant(tenantId, async (tx) => {
    const lesson = await tx.cpaLesson.findFirst({ where: { tenantId, code: lessonCode, status: "PUBLICADO" }, select: { id: true } });
    if (!lesson) return;
    await tx.cpaLessonProgress.upsert({
      where: { userId_lessonId: { userId, lessonId: lesson.id } },
      create: { tenantId, userId, lessonId: lesson.id, seconds, lastSection: input.section ?? null },
      update: { seconds: { increment: seconds }, ...(input.section ? { lastSection: input.section } : {}) },
    });
    await touch(tx, tenantId, userId, seconds, lessonCode);
  });
}

export async function completeLessonAction(fd: FormData) {
  const { tenantId, userId } = await student();
  const lessonCode = code.parse(fd.get("lessonCode"));
  const done = fd.get("done") === "1";
  await withTenant(tenantId, async (tx) => {
    const lesson = await tx.cpaLesson.findFirst({ where: { tenantId, code: lessonCode, status: "PUBLICADO" }, select: { id: true } });
    if (!lesson) return;
    await tx.cpaLessonProgress.upsert({
      where: { userId_lessonId: { userId, lessonId: lesson.id } },
      create: { tenantId, userId, lessonId: lesson.id, completed: done, completedAt: done ? new Date() : null },
      update: { completed: done, completedAt: done ? new Date() : null },
    });
    await touch(tx, tenantId, userId, 0, lessonCode);
  });
  revalidatePath(`/cpa/aulas/${lessonCode}`);
  revalidatePath("/cpa");
}

export async function checklistAction(input: { lessonCode: string; items: string[] }) {
  const { tenantId, userId } = await student();
  const lessonCode = code.parse(input.lessonCode);
  const items = z.array(z.string().max(300)).max(50).parse(input.items);
  await withTenant(tenantId, async (tx) => {
    const lesson = await tx.cpaLesson.findFirst({ where: { tenantId, code: lessonCode }, select: { id: true } });
    if (!lesson) return;
    await tx.cpaLessonProgress.upsert({
      where: { userId_lessonId: { userId, lessonId: lesson.id } },
      create: { tenantId, userId, lessonId: lesson.id, checklist: items },
      update: { checklist: items },
    });
  });
}

export async function annotateAction(fd: FormData) {
  const { tenantId, userId } = await student();
  const lessonCode = code.parse(fd.get("lessonCode"));
  const kind = z.enum(["MARCADOR", "DESTAQUE", "NOTA", "FAVORITO"]).parse(fd.get("kind"));
  const remove = z.string().uuid().optional().parse(fd.get("remove") || undefined);
  const data = {
    anchor: z.string().max(100).optional().parse(fd.get("anchor") || undefined) ?? null,
    quote: z.string().max(1000).optional().parse(fd.get("quote") || undefined) ?? null,
    note: z.string().trim().max(4000).optional().parse(fd.get("note") || undefined) ?? null,
  };
  await withTenant(tenantId, async (tx) => {
    if (remove) {
      await tx.cpaAnnotation.deleteMany({ where: { id: remove, tenantId, userId } });
      return;
    }
    if (kind === "FAVORITO") {
      const existing = await tx.cpaAnnotation.findFirst({ where: { tenantId, userId, lessonCode, kind } });
      if (existing) return void (await tx.cpaAnnotation.delete({ where: { id: existing.id } }));
    }
    if (kind === "NOTA" && !data.note) return;
    await tx.cpaAnnotation.create({ data: { tenantId, userId, lessonCode, kind, ...data } });
  });
  revalidatePath(`/cpa/aulas/${lessonCode}`);
  revalidatePath("/cpa/apostila");
}

type AnswerCheck = { correct: boolean; correctKey: string; explanation: string; justifications: Record<string, string> };

/** Questão respondida no modo estudo (aulas e revisões): devolve a correção e agenda a revisão. */
export async function answerStudyQuestionAction(input: { questionCode: string; answer: string }): Promise<AnswerCheck | null> {
  const { tenantId, userId } = await student();
  const questionCode = code.parse(input.questionCode);
  const answer = z.enum(["A", "B", "C", "D"]).parse(input.answer);
  return withTenant(tenantId, async (tx) => {
    const q = await tx.cpaQuestion.findFirst({ where: { tenantId, code: questionCode, status: "PUBLICADO" }, include: { items: { include: { item: true } } } });
    if (!q) return null;
    const correct = answer === q.correct;
    const prev = await tx.cpaReview.findUnique({ where: { tenantId_userId_kind_refCode: { tenantId, userId, kind: "QUESTAO", refCode: q.code } } });
    if (prev || !correct) {
      const next = nextReview(prev ?? { stage: 0, lapses: 0 }, correct, new Date(), (await plan(tx, tenantId, userId)).reviewDays);
      await tx.cpaReview.upsert({
        where: { tenantId_userId_kind_refCode: { tenantId, userId, kind: "QUESTAO", refCode: q.code } },
        create: { tenantId, userId, kind: "QUESTAO", refCode: q.code, itemCode: q.items[0]?.item.code ?? null, ...next },
        update: next,
      });
    }
    await touch(tx, tenantId, userId, 0);
    const options = q.options as { key: string; justification: string }[];
    return { correct, correctKey: q.correct, explanation: q.explanation, justifications: Object.fromEntries(options.map((o) => [o.key, o.justification])) };
  });
}

/** Cartão revisado: "lembrei" avança o intervalo, "não lembrei" volta ao início. */
export async function reviewCardAction(input: { cardCode: string; remembered: boolean }) {
  const { tenantId, userId } = await student();
  const cardCode = code.parse(input.cardCode);
  await withTenant(tenantId, async (tx) => {
    const card = await tx.cpaCard.findFirst({ where: { tenantId, code: cardCode } });
    if (!card) return;
    const prev = await tx.cpaReview.findUnique({ where: { tenantId_userId_kind_refCode: { tenantId, userId, kind: "CARTAO", refCode: cardCode } } });
    const next = nextReview(prev ?? { stage: 0, lapses: 0 }, input.remembered, new Date(), (await plan(tx, tenantId, userId)).reviewDays);
    await tx.cpaReview.upsert({
      where: { tenantId_userId_kind_refCode: { tenantId, userId, kind: "CARTAO", refCode: cardCode } },
      create: { tenantId, userId, kind: "CARTAO", refCode: cardCode, itemCode: card.itemCode, ...next },
      update: next,
    });
    await touch(tx, tenantId, userId, 0);
  });
  revalidatePath("/cpa/revisoes");
}

// ─── Simulados ───

function toBank(q: { code: string; macro: number; type: string; difficulty: number; stem: string; options: unknown; correct: string; explanation: string; items: { item: { code: string } }[] }): BankQuestion {
  return {
    code: q.code,
    macro: q.macro,
    type: q.type,
    difficulty: q.difficulty,
    stem: q.stem,
    options: q.options as BankQuestion["options"],
    correct: q.correct,
    explanation: q.explanation,
    items: q.items.map((i) => i.item.code),
  };
}

export async function startExamAction(fd: FormData) {
  const { viewer, tenantId, userId } = await student();
  const examCode = code.parse(fd.get("examCode"));
  const mode = z.enum(["PROVA", "ESTUDO"]).parse(fd.get("mode") ?? "PROVA");
  const ip = await clientIp();
  const attemptId = await withTenant(tenantId, async (tx) => {
    const exam = await tx.cpaExam.findFirst({ where: { tenantId, code: examCode, status: "PUBLICADO" } });
    if (!exam) return null;
    // Recupera tentativa interrompida (mesmo simulado, ainda no prazo).
    const open = await tx.cpaAttempt.findFirst({ where: { tenantId, userId, examId: exam.id, submittedAt: null, deadlineAt: { gt: new Date() } } });
    if (open) return open.id;
    const pool = await tx.cpaQuestion.findMany({
      where: { tenantId, status: "PUBLICADO", ...(exam.fixedCodes.length ? { code: { in: exam.fixedCodes } } : { use: exam.pool }) },
      include: { items: { include: { item: { select: { code: true } } } } },
    });
    const seenRows = await tx.cpaAttempt.findMany({ where: { tenantId, userId }, select: { items: true } });
    const seen = new Set(seenRows.flatMap((a) => (a.items as unknown as ExamItem[]).map((i) => i.code)));
    const items = buildExam({
      bank: pool.map(toBank),
      count: exam.questionCount,
      seed: randomInt(2 ** 31),
      fixedCodes: exam.fixedCodes,
      macros: exam.macros,
      distribution: exam.distribution as Record<string, number>,
      seen,
    });
    if (!items.length) return null;
    const attempt = await tx.cpaAttempt.create({
      data: {
        tenantId,
        userId,
        examId: exam.id,
        mode: mode === "ESTUDO" && exam.allowStudyMode ? "ESTUDO" : "PROVA",
        items: items as unknown as Prisma.InputJsonValue,
        deadlineAt: new Date(Date.now() + exam.durationMinutes * 60_000),
      },
    });
    await audit(tx, { tenantId, actorId: viewer.user.id, action: "cpa.simulado.iniciado", entity: "CpaAttempt", entityId: attempt.id, data: { exame: exam.code, modo: mode }, ip });
    return attempt.id;
  });
  if (!attemptId) redirect(`/cpa/simulados?erro=indisponivel`);
  redirect(`/cpa/simulados/tentativa/${attemptId}`);
}

const answersSchema = z.record(z.string().max(40), z.enum(["A", "B", "C", "D"]));

export async function saveAttemptAction(input: { attemptId: string; answers: Record<string, string>; flagged: string[]; timings: Record<string, number> }) {
  const { tenantId, userId } = await student();
  const attemptId = z.string().uuid().parse(input.attemptId);
  const data = {
    answers: answersSchema.parse(input.answers),
    flagged: z.array(z.string().max(40)).max(300).parse(input.flagged),
    timings: z.record(z.string().max(40), z.number().min(0).max(36_000)).parse(input.timings),
  };
  await withTenant(tenantId, async (tx) => {
    await tx.cpaAttempt.updateMany({ where: { id: attemptId, tenantId, userId, submittedAt: null, deadlineAt: { gt: new Date(Date.now() - 60_000) } }, data });
  });
}

/** Correção no modo estudo: devolve o gabarito de UMA questão já respondida (nunca antes da resposta). */
export async function checkStudyItemAction(input: { attemptId: string; questionCode: string; answer: string }) {
  const { tenantId, userId } = await student();
  const attemptId = z.string().uuid().parse(input.attemptId);
  const answer = z.enum(["A", "B", "C", "D"]).parse(input.answer);
  return withTenant(tenantId, async (tx) => {
    const a = await tx.cpaAttempt.findFirst({ where: { id: attemptId, tenantId, userId, mode: "ESTUDO" } });
    const it = (a?.items as unknown as ExamItem[] | undefined)?.find((i) => i.code === input.questionCode);
    if (!a || !it) return null;
    const answers = { ...(a.answers as Record<string, string>), [it.code]: answer };
    await tx.cpaAttempt.update({ where: { id: a.id }, data: { answers } });
    return { correct: answer === it.correct, correctKey: it.correct, explanation: it.explanation, justifications: Object.fromEntries(it.options.map((o) => [o.key, o.justification])) };
  });
}

export async function submitAttemptAction(input: { attemptId: string; answers: Record<string, string>; flagged: string[]; timings: Record<string, number> }) {
  await saveAttemptAction(input);
  const { tenantId, userId, viewer } = await student();
  await withTenant(tenantId, async (tx) => {
    const done = await finalizeAttempt(tx, input.attemptId, tenantId, userId);
    if (done) await audit(tx, { tenantId, actorId: viewer.user.id, action: "cpa.simulado.entregue", entity: "CpaAttempt", entityId: done.id, data: { nota: done.score, expirado: done.expired } });
  });
  redirect(`/cpa/simulados/resultado/${input.attemptId}`);
}

// ─── Árvores de decisão ───

export async function treeStepAction(input: { treeCode: string; path: number[] }) {
  const { tenantId, userId } = await student();
  const treeCode = code.parse(input.treeCode);
  const path = z.array(z.number().int().min(0).max(10)).max(40).parse(input.path);
  return withTenant(tenantId, async (tx) => {
    const tree = await tx.cpaTree.findFirst({ where: { tenantId, code: treeCode, status: "PUBLICADO" } });
    if (!tree) return null;
    const graph = tree.graph as unknown as TreeGraph;
    const walked = walkTree(graph, path);
    if (walked.finished) {
      await tx.cpaTreeRun.create({
        data: { tenantId, userId, treeId: tree.id, path: walked.steps as unknown as Prisma.InputJsonValue, score: walked.score, competences: [...new Set(walked.competences)], finishedAt: new Date() },
      });
      await touch(tx, tenantId, userId, 0);
    }
    return { node: walked.node, text: walked.current.text, outcome: walked.current.outcome ?? null, choices: walked.current.choices.map((c) => c.label), steps: walked.steps, score: walked.score, competences: walked.competences, finished: walked.finished };
  });
}

// ─── Plano de estudo ───

export async function savePlanAction(fd: FormData) {
  const { tenantId, userId } = await student();
  const examDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().parse(fd.get("examDate") || undefined);
  const hoursPerWeek = z.coerce.number().int().min(1).max(60).parse(fd.get("hoursPerWeek"));
  const pace = z.enum(["LEVE", "REGULAR", "INTENSO"]).parse(fd.get("pace"));
  const studyDays = z.array(z.coerce.number().int().min(0).max(6)).min(1).parse(fd.getAll("studyDays"));
  const reviewDays = z
    .string()
    .transform((s) => s.split(/[,;\s]+/).filter(Boolean).map(Number))
    .pipe(z.array(z.number().int().min(1).max(120)).min(1).max(8))
    .parse(fd.get("reviewDays") || "1,3,7,14");
  await withTenant(tenantId, async (tx) => {
    const p = await plan(tx, tenantId, userId);
    await tx.cpaStudyPlan.update({ where: { id: p.id }, data: { examDate: examDate ? new Date(`${examDate}T12:00:00Z`) : null, hoursPerWeek, pace, studyDays, reviewDays: [...reviewDays].sort((a, b) => a - b) } });
  });
  revalidatePath("/cpa/plano");
  revalidatePath("/cpa");
}
