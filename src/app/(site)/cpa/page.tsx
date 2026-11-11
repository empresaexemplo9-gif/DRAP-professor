import Link from "next/link";
import { getViewer } from "@/lib/session";
import { getDashboard, formatDuration } from "@/lib/cpa/student";
import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { ProgressBar, EmptyState } from "@/components/ui/misc";
import { closeExpiredAttempts } from "@/lib/cpa/attempts";

export const dynamic = "force-dynamic";

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <p className="text-xs uppercase tracking-wide text-text-muted">{label}</p>
      <p className="mt-1 font-display text-2xl text-text">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-text-muted">{hint}</p>}
    </div>
  );
}

export default async function CpaDashboard() {
  const viewer = (await getViewer())!;
  await closeExpiredAttempts(viewer.tenant.id, viewer.user.id);
  const d = await getDashboard(viewer.tenant.id, viewer.user.id);
  const first = viewer.user.name.split(" ")[0];
  const daysToExam = d.plan?.examDate ? Math.ceil((d.plan.examDate.getTime() - Date.now()) / 86_400_000) : null;

  if (!d.totalLessons)
    return <EmptyState title="Conteúdo em publicação" text="As aulas do preparatório estão sendo publicadas. Volte em breve." />;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-text">Olá, {first}.</h1>
          <p className="mt-1 text-text-muted">
            {daysToExam !== null && daysToExam >= 0 ? `Faltam ${daysToExam} dia(s) para a sua prova. ` : ""}
            {d.reviewsDue ? `Você tem ${d.reviewsDue} revisão(ões) pendente(s).` : "Nenhuma revisão pendente hoje."}
          </p>
        </div>
        {d.next && <ButtonLink href={`/cpa/aulas/${d.next.code}`}>Próxima aula: {d.next.title}</ButtonLink>}
      </header>

      <section aria-label="Resumo do estudo" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Conclusão" value={`${d.percent}%`} hint={`${d.doneLessons} de ${d.totalLessons} aulas`} />
        <Stat label="Tempo de estudo" value={formatDuration(d.plan?.totalSeconds ?? 0)} />
        <Stat label="Sequência" value={`${d.plan?.streakDays ?? 0} dia(s)`} hint="dias seguidos com estudo" />
        <Stat label="Acertos em simulados" value={d.accuracy === null ? "—" : `${d.accuracy}%`} hint={`${d.answered} questões respondidas`} />
      </section>

      <ProgressBar value={d.percent} label="Progresso no curso" />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <h2 className="font-display text-xl text-text">Continue de onde parou</h2>
          {d.last ? (
            <p className="mt-2 text-sm text-text-muted">
              Último capítulo acessado: <strong className="text-text">{d.last.chapter.title}</strong>
              <br />
              <Link href={`/cpa/aulas/${d.last.code}`}>{d.last.title}</Link>
            </p>
          ) : (
            <p className="mt-2 text-sm text-text-muted">Comece pelo diagnóstico inicial para descobrir seus pontos fortes e fracos.</p>
          )}
          {d.recommended && (
            <div className="mt-4 border-t border-border pt-4">
              <p className="text-xs uppercase tracking-wide text-text-muted">Próximo simulado recomendado</p>
              <p className="mt-1 text-sm text-text">{d.recommended.title}</p>
              <ButtonLink size="sm" variant="secondary" className="mt-3" href={`/cpa/simulados#${d.recommended.code}`}>
                Ver simulado
              </ButtonLink>
            </div>
          )}
        </Card>
        <Card>
          <h2 className="font-display text-xl text-text">Pontos de dificuldade</h2>
          {d.weak.length ? (
            <ul className="mt-3 space-y-2 text-sm">
              {d.weak.map((w) => (
                <li key={w.code}>
                  <span className="font-mono text-xs text-text-muted">{w.code}</span> <span className="text-text">{w.text}</span>
                  <span className="text-danger"> · {w.total - w.hits} erro(s)</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-text-muted">Responda questões e simulados para identificar os assuntos que pedem revisão.</p>
          )}
        </Card>
        <Card>
          <h2 className="font-display text-xl text-text">Revisões</h2>
          <p className="mt-2 text-sm text-text-muted">
            A revisão espaçada (1, 3, 7 e 14 dias, ajustável no plano) é montada a partir dos seus erros.
          </p>
          <p className="mt-3 font-display text-3xl text-text">{d.reviewsDue}</p>
          <p className="text-xs text-text-muted">pendentes hoje</p>
          <ButtonLink size="sm" className="mt-3" href="/cpa/revisoes">
            Revisar agora
          </ButtonLink>
        </Card>
      </div>

      {d.lastAttempts.length > 0 && (
        <section aria-labelledby="ultimos">
          <h2 id="ultimos" className="mb-3 font-display text-xl text-text">Últimos simulados</h2>
          <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
            {d.lastAttempts.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <span className="text-text">{a.exam.title}</span>
                <span className="flex items-center gap-3">
                  <span className={(a.score ?? 0) >= a.exam.targetPercent ? "text-success" : "text-warning"}>{a.score?.toFixed(1)}%</span>
                  <Link href={`/cpa/simulados/resultado/${a.id}`}>Relatório</Link>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
