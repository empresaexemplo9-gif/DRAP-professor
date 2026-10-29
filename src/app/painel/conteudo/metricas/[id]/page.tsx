import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { z } from "zod";
import { requirePermission } from "@/lib/session";
import { withTenant } from "@/lib/db";
import type { AttemptItem } from "@/lib/quiz";
import { quizConfig, readSheet } from "@/lib/course-progress";
import { average, FLAG_LABELS, hakeGain, itemStatistics, MIN_SAMPLE, type ItemResponse } from "@/lib/learning-metrics";
import { Alert, DataTable, PageHeader } from "@/components/ui/misc";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

export const metadata: Metadata = { title: "Métricas do curso" };

const pct = (v: number | null) => (v === null ? "—" : `${v.toFixed(1)}%`);
const dec = (v: number | null) => (v === null ? "—" : v.toFixed(2).replace(".", ","));

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-md border border-border bg-bg p-3">
      <dt className="text-xs uppercase tracking-wide text-text-muted">{label}</dt>
      <dd className="mt-1 font-display text-2xl text-text">{value}</dd>
      {hint && <dd className="mt-0.5 text-xs text-text-muted">{hint}</dd>}
    </div>
  );
}

/**
 * Painel pedagógico do curso: reação (Kirkpatrick 1), aprendizagem (Kirkpatrick 2: notas, ganho de Hake,
 * aprovação) e qualidade do banco de questões (dificuldade, discriminação, distratores).
 */
export default async function CourseMetricsPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requirePermission("content:manage");
  const id = z.string().uuid().safeParse((await params).id);
  if (!id.success) notFound();
  const t = viewer.tenant.id;
  const data = await withTenant(t, async (tx) => {
    const mod = await tx.module.findFirst({ where: { id: id.data, tenantId: t }, include: { topics: { where: { status: "PUBLICADO" }, orderBy: { order: "asc" } } } });
    if (!mod) return null;
    const topicIds = mod.topics.map((x) => x.id);
    const [enrollments, progress, attempts, questions, feedback] = await Promise.all([
      tx.enrollment.findMany({ where: { tenantId: t, moduleId: mod.id }, select: { id: true, status: true } }),
      tx.topicProgress.findMany({ where: { tenantId: t, topicId: { in: topicIds } } }),
      tx.quizAttempt.findMany({ where: { tenantId: t, topicId: { in: topicIds }, status: { not: "EM_ANDAMENTO" } } }),
      tx.question.findMany({ where: { tenantId: t, topicId: { in: topicIds } }, orderBy: { code: "asc" } }),
      tx.topicFeedback.findMany({ where: { tenantId: t, topicId: { in: topicIds } } }),
    ]);
    return { mod, enrollments, progress, attempts, questions, feedback };
  });
  if (!data) notFound();
  const { mod, enrollments, progress, attempts, questions, feedback } = data;
  const sheet = readSheet(mod.courseSheet);
  const cfg = quizConfig(sheet);

  const responses: ItemResponse[] = attempts.flatMap((a) => {
    const items = a.items as unknown as AttemptItem[];
    const answers = (a.answers ?? {}) as Record<string, string>;
    return items.map((it) => {
      const chosen = it.options.find((o) => o.key === answers[it.questionId]);
      return { attemptId: a.id, questionId: it.questionId, chosenOriginalKey: chosen?.originalKey ?? null, correct: answers[it.questionId] === it.correct, attemptScore: a.score ?? 0, attemptSize: items.length };
    });
  });
  const stats = new Map(itemStatistics(responses).map((s) => [s.questionId, s]));
  const concluded = enrollments.filter((e) => e.status === "CONCLUIDA").length;
  const gains = progress.filter((p) => p.firstScore !== null && p.bestScore !== null).map((p) => hakeGain(p.firstScore!, p.bestScore!));
  const durations = attempts.filter((a) => a.submittedAt).map((a) => (a.submittedAt!.getTime() - a.startedAt.getTime()) / 60_000);
  const flagged = questions.filter((q) => q.active && (stats.get(q.id)?.flags.some((f) => f !== "AMOSTRA_INSUFICIENTE") ?? false));

  return (
    <>
      <PageHeader eyebrow={sheet.codigo ?? "Curso"} title={`Métricas · ${mod.title}`} description="Reação, aprendizagem e qualidade do banco de questões, calculadas a partir das tentativas reais dos alunos." />
      <div className="space-y-8">
        <Card>
          <h2 className="font-display text-xl text-text">Visão geral</h2>
          <dl className="mt-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
            <Stat label="Matrículas" value={String(enrollments.length)} />
            <Stat label="Conclusão" value={enrollments.length ? pct((concluded / enrollments.length) * 100) : "—"} hint={`${concluded} concluídas`} />
            <Stat label="Tentativas" value={String(attempts.length)} />
            <Stat label="Aprovação por tentativa" value={attempts.length ? pct((attempts.filter((a) => a.passed).length / attempts.length) * 100) : "—"} />
            <Stat label="Ganho de Hake médio" value={dec(average(gains))} hint="1ª tentativa → melhor nota" />
            <Stat label="Tempo médio de prova" value={durations.length ? `${average(durations)} min` : "—"} hint={`limite ${cfg.questionsPerQuiz * cfg.minutesPerQuestion} min`} />
          </dl>
        </Card>

        <section aria-labelledby="modulos">
          <h2 id="modulos" className="mb-3 font-display text-2xl text-text">Por módulo</h2>
          <DataTable head={["Módulo", "Alunos", "Aprovados", "1ª nota média", "Melhor nota média", "Ganho (g)", "Tentativas até aprovar", "Clareza", "Aplicabilidade", "Geral"]} caption="Indicadores por módulo">
            {mod.topics.map((topic) => {
              const ps = progress.filter((p) => p.topicId === topic.id);
              const passedPs = ps.filter((p) => p.quizPassed);
              const ats = attempts.filter((a) => a.topicId === topic.id);
              const attemptsToPass = passedPs.map((p) => ats.filter((a) => a.enrollmentId === p.enrollmentId).length);
              const fb = feedback.filter((f) => f.topicId === topic.id);
              return (
                <tr key={topic.id}>
                  <td className="min-w-48 text-text">{topic.title}</td>
                  <td>{ps.length}</td>
                  <td>{passedPs.length}</td>
                  <td>{pct(average(ps.map((p) => p.firstScore)))}</td>
                  <td>{pct(average(ps.map((p) => p.bestScore)))}</td>
                  <td>{dec(average(ps.filter((p) => p.firstScore !== null && p.bestScore !== null).map((p) => hakeGain(p.firstScore!, p.bestScore!))))}</td>
                  <td>{dec(average(attemptsToPass))}</td>
                  <td>{dec(average(fb.map((f) => f.clarity)))}</td>
                  <td>{dec(average(fb.map((f) => f.applicability)))}</td>
                  <td>{dec(average(fb.map((f) => f.overall)))}</td>
                </tr>
              );
            })}
          </DataTable>
        </section>

        <section aria-labelledby="banco" className="space-y-3">
          <h2 id="banco" className="font-display text-2xl text-text">Qualidade do banco de questões</h2>
          <p className="max-w-3xl text-sm text-text-muted">
            <strong>p</strong> = proporção de acertos (ideal entre 0,30 e 0,80). <strong>D</strong> = discriminação ponto-bisserial contra a nota no restante da prova (≥ 0,30 boa; 0,20–0,29 aceitável; abaixo de 0,20 revisar; negativa indica provável erro de gabarito ou enunciado ambíguo). Distratores escolhidos por menos de 5% dos alunos não estão funcionando. Alertas exigem ao menos {MIN_SAMPLE} respostas.
          </p>
          {flagged.length > 0 && <Alert tone="warning">{flagged.length} questões ativas com alerta — revise antes do próximo ciclo de revisão do curso.</Alert>}
          <DataTable head={["Questão", "Objetivo", "Tipo", "n", "p", "D", "Alternativas (A/B/C/D)", "Alertas"]} caption="Estatística de itens">
            {questions.map((q) => {
              const s = stats.get(q.id);
              const n = s?.n ?? 0;
              return (
                <tr key={q.id} className={q.active ? "" : "opacity-60"}>
                  <td className="whitespace-nowrap font-mono text-xs text-text">
                    {q.code} v{q.version}
                    {!q.active && " (inativa)"}
                  </td>
                  <td className="whitespace-nowrap">{q.objective}</td>
                  <td>{q.isCase ? "Caso" : "Direta"}</td>
                  <td>{n}</td>
                  <td>{dec(s?.p ?? null)}</td>
                  <td>{dec(s?.discrimination ?? null)}</td>
                  <td className="whitespace-nowrap text-xs">
                    {["A", "B", "C", "D"]
                      .map((k) => {
                        const c = s?.distractors[k] ?? 0;
                        const v = n ? Math.round((c / n) * 100) : 0;
                        return k === q.correct ? `[${v}%]` : `${v}%`;
                      })
                      .join(" · ")}
                  </td>
                  <td className="min-w-48">
                    <div className="flex flex-wrap gap-1">
                      {(s?.flags ?? ["AMOSTRA_INSUFICIENTE"]).map((f) => (
                        <Badge key={f} tone={f === "AMOSTRA_INSUFICIENTE" ? "neutral" : f === "DISCRIMINACAO_NEGATIVA" ? "danger" : "warning"}>
                          {FLAG_LABELS[f]}
                        </Badge>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </DataTable>
          <p className="text-xs text-text-muted">Entre colchetes, o percentual da alternativa correta (letras do banco original, antes do embaralhamento).</p>
        </section>

        {feedback.some((f) => f.comment) && (
          <section aria-labelledby="comentarios">
            <h2 id="comentarios" className="mb-3 font-display text-2xl text-text">Comentários dos alunos</h2>
            <ul className="space-y-2">
              {feedback
                .filter((f) => f.comment)
                .slice(0, 50)
                .map((f) => (
                  <li key={f.id} className="rounded-md border border-border bg-surface p-3 text-sm text-text">
                    <span className="mr-2 text-text-muted">{mod.topics.find((x) => x.id === f.topicId)?.title} · {f.overall}/5</span>
                    {f.comment}
                  </li>
                ))}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}
