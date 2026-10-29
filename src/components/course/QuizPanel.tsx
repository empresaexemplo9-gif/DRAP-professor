import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar, Alert } from "@/components/ui/misc";
import { GATE_MESSAGES, quizGate, type QuizConfig } from "@/lib/quiz";
import { startQuizAction } from "@/app/(site)/quiz-actions";

type Attempt = { id: string; number: number; cycle: number; score: number | null; passed: boolean | null; status: string; submittedAt: Date | null; deadlineAt: Date };

/** Painel da prova do módulo: regras, presença, tentativas e botão de início. */
export function QuizPanel({
  topicId,
  path,
  cfg,
  questionCount,
  lessonsDone,
  lessonsTotal,
  passed,
  bestScore,
  cycle,
  attempts,
  error,
  enrolled,
}: {
  topicId: string;
  path: string;
  cfg: QuizConfig;
  questionCount: number;
  lessonsDone: number;
  lessonsTotal: number;
  passed: boolean;
  bestScore: number | null;
  cycle: number;
  attempts: Attempt[];
  error?: string;
  enrolled: boolean;
}) {
  const now = new Date();
  const cycleAttempts = attempts.filter((a) => a.cycle === cycle);
  const open = cycleAttempts.find((a) => a.status === "EM_ANDAMENTO" && a.deadlineAt > now);
  const gate = quizGate(
    {
      hasQuestions: questionCount > 0,
      passed,
      lessonsDone,
      lessonsTotal,
      attemptsInCycle: cycleAttempts.filter((a) => a.status !== "EM_ANDAMENTO").map((a) => ({ submittedAt: a.submittedAt, passed: a.passed })),
      inProgress: Boolean(open),
    },
    cfg,
    now,
  );
  const presence = lessonsTotal ? Math.round((lessonsDone / lessonsTotal) * 100) : 0;
  const errorText = error ? (GATE_MESSAGES as Record<string, string>)[error] ?? error : null;

  return (
    <section aria-labelledby="prova" className="rounded-xl border border-accent bg-surface p-5 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-accent-text">Avaliação do módulo</p>
          <h2 id="prova" className="mt-1 font-display text-2xl text-text">Prova do módulo</h2>
        </div>
        {passed ? <Badge tone="success">Aprovado · {bestScore?.toFixed(1)}%</Badge> : bestScore !== null ? <Badge tone="warning">Melhor nota: {bestScore.toFixed(1)}%</Badge> : null}
      </div>
      <ul className="mt-4 grid gap-2 text-sm text-text-muted sm:grid-cols-2">
        <li>• {cfg.questionsPerQuiz} questões sorteadas de um banco de {questionCount}</li>
        <li>• Nota mínima: {cfg.passPercent}% de acertos</li>
        <li>• {cfg.maxAttempts} tentativas, com {cfg.retryHours} h de intervalo</li>
        <li>• Tempo: {cfg.minutesPerQuestion} min por questão ({cfg.questionsPerQuiz * cfg.minutesPerQuestion} min)</li>
        <li>• Libera com {cfg.minLessonsPercent}% das aulas concluídas</li>
        <li>• Gabarito comentado ao final de cada tentativa</li>
      </ul>
      {enrolled && (
        <div className="mt-5 space-y-4">
          <ProgressBar value={presence} label={`Aulas concluídas: ${lessonsDone} de ${lessonsTotal}`} />
          {errorText && <Alert tone="warning">{errorText}</Alert>}
          {open ? (
            <Link href={`${path}/prova`} className="inline-flex min-h-11 items-center rounded-md bg-primary-strong px-4 font-medium text-text-on-primary no-underline hover:bg-primary">
              Continuar prova em andamento
            </Link>
          ) : gate.ok ? (
            <form action={startQuizAction}>
              <input type="hidden" name="topicId" value={topicId} />
              <input type="hidden" name="path" value={path} />
              <Button type="submit">
                Iniciar prova — tentativa {gate.attemptNumber} de {cfg.maxAttempts}
              </Button>
            </form>
          ) : (
            !passed && (
              <p className="text-sm text-text-muted">
                {GATE_MESSAGES[gate.reason]}
                {gate.reason === "INTERVALO" && gate.nextAt && <> Próxima tentativa a partir de {gate.nextAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}.</>}
              </p>
            )
          )}
          {cycle > 1 && !passed && <p className="text-xs text-text-muted">Ciclo de tentativas nº {cycle} (liberado após revisão do módulo).</p>}
          {attempts.filter((a) => a.status !== "EM_ANDAMENTO").length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-medium text-text">Suas tentativas</h3>
              <ul className="divide-y divide-border rounded-md border border-border">
                {attempts
                  .filter((a) => a.status !== "EM_ANDAMENTO")
                  .map((a) => (
                    <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                      <span className="text-text">
                        Ciclo {a.cycle} · tentativa {a.number}
                        {a.status === "EXPIRADA" && <span className="text-text-muted"> (encerrada pelo tempo)</span>}
                      </span>
                      <span className="flex items-center gap-3">
                        <span className={a.passed ? "text-success" : "text-danger"}>{a.score?.toFixed(1)}%</span>
                        <Link href={`${path}/prova/${a.id}`}>Gabarito comentado</Link>
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
