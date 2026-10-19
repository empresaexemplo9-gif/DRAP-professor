"use server";
import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { withTenant } from "@/lib/db";
import { clientIp, getViewer } from "@/lib/session";
import { audit } from "@/lib/audit";
import { buildAttempt, grade, quizGate, type AttemptItem, type QuestionForQuiz } from "@/lib/quiz";
import { ensureProgress, lessonIds, quizConfig, readSheet, refreshEnrollment } from "@/lib/course-progress";

const uuid = z.string().uuid();

async function loadContext(topicId: string) {
  const viewer = await getViewer();
  if (!viewer) redirect("/entrar");
  const tenantId = viewer.tenant.id;
  return { viewer, tenantId, topicId: uuid.parse(topicId) };
}

/** Marca/desmarca uma aula (seção) como concluída — base da presença mínima. */
export async function markSectionAction(fd: FormData) {
  const { viewer, tenantId, topicId } = await loadContext(String(fd.get("topicId")));
  const sectionId = z.string().min(1).max(64).parse(fd.get("sectionId"));
  const done = fd.get("done") === "1";
  const path = String(fd.get("path") ?? "/");
  await withTenant(tenantId, async (tx) => {
    const topic = await tx.topic.findFirst({ where: { id: topicId, tenantId, status: "PUBLICADO" }, include: { publishedVersion: true } });
    if (!topic?.publishedVersion) return;
    if (!lessonIds(topic.publishedVersion.document).includes(sectionId)) return;
    const enrollment = await tx.enrollment.findUnique({ where: { userId_moduleId: { userId: viewer.user.id, moduleId: topic.moduleId } } });
    if (!enrollment || enrollment.status === "CANCELADA" || enrollment.status === "EXPIRADA") return;
    const progress = await ensureProgress(tx, tenantId, enrollment.id, topicId);
    const set = new Set(progress.completedSections);
    if (done) set.add(sectionId);
    else set.delete(sectionId);
    const total = lessonIds(topic.publishedVersion.document).length;
    const percent = total ? Math.round((set.size / total) * 100) : 0;
    await tx.topicProgress.update({ where: { id: progress.id }, data: { completedSections: [...set], percent, lastSectionId: sectionId } });
  });
  revalidatePath(path);
}

/** Inicia uma tentativa (sorteio das questões, ordem das alternativas e prazo). */
export async function startQuizAction(fd: FormData) {
  const { viewer, tenantId, topicId } = await loadContext(String(fd.get("topicId")));
  const path = z.string().startsWith("/").parse(fd.get("path"));
  const ip = await clientIp();
  const result = await withTenant(tenantId, async (tx) => {
    const topic = await tx.topic.findFirst({ where: { id: topicId, tenantId, status: "PUBLICADO" }, include: { publishedVersion: true, module: true } });
    if (!topic?.publishedVersion) return { error: "Módulo não encontrado." };
    const enrollment = await tx.enrollment.findUnique({ where: { userId_moduleId: { userId: viewer.user.id, moduleId: topic.moduleId } } });
    if (!enrollment || enrollment.status === "CANCELADA" || enrollment.status === "EXPIRADA") return { error: "Matrícula inativa." };
    const cfg = quizConfig(readSheet(topic.module.courseSheet));
    const progress = await ensureProgress(tx, tenantId, enrollment.id, topicId);
    const bank = await tx.question.findMany({ where: { topicId, active: true } });
    const attempts = await tx.quizAttempt.findMany({ where: { enrollmentId: enrollment.id, topicId, cycle: progress.quizCycle } });
    const lessons = lessonIds(topic.publishedVersion.document);
    const now = new Date();
    const open = attempts.find((a) => a.status === "EM_ANDAMENTO" && a.deadlineAt > now);
    if (open) return { attemptId: open.id };
    // Tentativas abertas com prazo vencido são encerradas e corrigidas com o que foi salvo.
    for (const stale of attempts.filter((a) => a.status === "EM_ANDAMENTO")) await finalize(tx, stale.id, (stale.answers ?? {}) as Record<string, string>, true);
    const fresh = await tx.quizAttempt.findMany({ where: { enrollmentId: enrollment.id, topicId, cycle: progress.quizCycle } });
    const gate = quizGate(
      {
        hasQuestions: bank.length > 0,
        passed: progress.quizPassed,
        lessonsDone: progress.completedSections.filter((s) => lessons.includes(s)).length,
        lessonsTotal: lessons.length,
        attemptsInCycle: fresh.map((a) => ({ submittedAt: a.submittedAt, passed: a.passed })),
        inProgress: false,
      },
      cfg,
      now,
    );
    if (!gate.ok) return { error: gate.reason };
    const items = buildAttempt(
      bank.map((q) => ({ ...q, options: q.options as QuestionForQuiz["options"] })),
      cfg.questionsPerQuiz,
      randomInt(2 ** 31),
    );
    const attempt = await tx.quizAttempt.create({
      data: {
        tenantId,
        enrollmentId: enrollment.id,
        topicId,
        cycle: progress.quizCycle,
        number: gate.attemptNumber,
        items: items as unknown as Prisma.InputJsonValue,
        deadlineAt: new Date(now.getTime() + items.length * cfg.minutesPerQuestion * 60_000),
        ip,
      },
    });
    await audit(tx, { tenantId, actorId: viewer.user.id, action: "prova.iniciada", entity: "QuizAttempt", entityId: attempt.id, data: { topicId, numero: gate.attemptNumber, ciclo: progress.quizCycle }, ip });
    return { attemptId: attempt.id };
  });
  if ("error" in result) redirect(`${path}?prova=${encodeURIComponent(String(result.error))}`);
  redirect(`${path}/prova`);
}

/** Corrige a tentativa, atualiza o progresso e aplica a regra das 3 tentativas por ciclo. */
async function finalize(tx: Prisma.TransactionClient, attemptId: string, answers: Record<string, string>, expired: boolean) {
  const attempt = await tx.quizAttempt.findUnique({ where: { id: attemptId }, include: { topic: { include: { module: true } } } });
  if (!attempt || attempt.status !== "EM_ANDAMENTO") return attempt;
  const items = attempt.items as unknown as AttemptItem[];
  const valid = Object.fromEntries(Object.entries(answers).filter(([qid, a]) => items.some((it) => it.questionId === qid && it.options.some((o) => o.key === a))));
  const cfg = quizConfig(readSheet(attempt.topic.module.courseSheet));
  const { score } = grade(items, valid);
  const passed = score >= cfg.passPercent;
  const updated = await tx.quizAttempt.update({
    where: { id: attemptId },
    data: { answers: valid, score, passed, status: expired ? "EXPIRADA" : "ENTREGUE", submittedAt: new Date() },
  });
  const progress = await ensureProgress(tx, attempt.tenantId, attempt.enrollmentId, attempt.topicId);
  const isFirst = progress.firstScore === null;
  const best = Math.max(progress.bestScore ?? 0, score);
  const cycleAttempts = await tx.quizAttempt.count({ where: { enrollmentId: attempt.enrollmentId, topicId: attempt.topicId, cycle: attempt.cycle, status: { not: "EM_ANDAMENTO" } } });
  const exhausted = !passed && !progress.quizPassed && cycleAttempts >= cfg.maxAttempts;
  await tx.topicProgress.update({
    where: { id: progress.id },
    data: {
      ...(isFirst ? { firstScore: score } : {}),
      bestScore: best,
      ...(passed ? { quizPassed: true, status: "CONCLUIDO", completedAt: new Date(), percent: 100 } : {}),
      // Após 3 reprovações: o aluno revisa o módulo (presença zerada) e ganha novo ciclo de tentativas.
      ...(exhausted ? { quizCycle: progress.quizCycle + 1, completedSections: [], percent: 0 } : {}),
    },
  });
  if (passed) await refreshEnrollment(tx, attempt.enrollmentId, attempt.topic.moduleId);
  return updated;
}

const answersSchema = z.record(z.string().uuid(), z.enum(["A", "B", "C", "D", "E", "F"]));

/** Entrega da prova (também usada no encerramento automático pelo tempo). */
export async function submitQuizAction(input: { attemptId: string; answers: Record<string, string>; path: string }) {
  const viewer = await getViewer();
  if (!viewer) redirect("/entrar");
  const attemptId = uuid.parse(input.attemptId);
  const answers = answersSchema.parse(input.answers);
  const path = z.string().startsWith("/").parse(input.path);
  const tenantId = viewer.tenant.id;
  await withTenant(tenantId, async (tx) => {
    const attempt = await tx.quizAttempt.findFirst({ where: { id: attemptId, tenantId }, include: { enrollment: true } });
    if (!attempt || attempt.enrollment.userId !== viewer.user.id) throw new Error("Tentativa não encontrada");
    // Tolerância de 60 s para a latência da rede; depois disso a entrega conta como encerrada pelo tempo.
    const expired = Date.now() > attempt.deadlineAt.getTime() + 60_000;
    const done = await finalize(tx, attemptId, answers, expired);
    await audit(tx, { tenantId, actorId: viewer.user.id, action: "prova.entregue", entity: "QuizAttempt", entityId: attemptId, data: { nota: done?.score ?? null, aprovado: done?.passed ?? null, expirada: expired } });
  });
  revalidatePath(path);
  redirect(`${path}/prova/${attemptId}`);
}

/** Salva respostas parciais (recuperação após queda de conexão). */
export async function saveAnswersAction(input: { attemptId: string; answers: Record<string, string> }) {
  const viewer = await getViewer();
  if (!viewer) return;
  const attemptId = uuid.parse(input.attemptId);
  const answers = answersSchema.parse(input.answers);
  await withTenant(viewer.tenant.id, async (tx) => {
    const attempt = await tx.quizAttempt.findFirst({ where: { id: attemptId, tenantId: viewer.tenant.id, status: "EM_ANDAMENTO" }, include: { enrollment: true } });
    if (!attempt || attempt.enrollment.userId !== viewer.user.id || attempt.deadlineAt.getTime() < Date.now()) return;
    await tx.quizAttempt.update({ where: { id: attemptId }, data: { answers } });
  });
}

/** Avaliação de reação do aluno (Kirkpatrick nível 1). */
export async function feedbackAction(fd: FormData) {
  const { viewer, tenantId, topicId } = await loadContext(String(fd.get("topicId")));
  const score = z.coerce.number().int().min(1).max(5);
  const data = {
    clarity: score.parse(fd.get("clarity")),
    applicability: score.parse(fd.get("applicability")),
    overall: score.parse(fd.get("overall")),
    comment: z.string().trim().max(2000).optional().parse(fd.get("comment") || undefined),
  };
  const path = String(fd.get("path") ?? "/");
  await withTenant(tenantId, async (tx) => {
    const topic = await tx.topic.findFirst({ where: { id: topicId, tenantId } });
    if (!topic) return;
    const enrollment = await tx.enrollment.findUnique({ where: { userId_moduleId: { userId: viewer.user.id, moduleId: topic.moduleId } } });
    if (!enrollment) return;
    await tx.topicFeedback.upsert({
      where: { enrollmentId_topicId: { enrollmentId: enrollment.id, topicId } },
      create: { tenantId, enrollmentId: enrollment.id, topicId, ...data },
      update: data,
    });
  });
  revalidatePath(path);
}
