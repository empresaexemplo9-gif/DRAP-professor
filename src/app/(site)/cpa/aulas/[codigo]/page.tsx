import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getViewer } from "@/lib/session";
import { withTenant } from "@/lib/db";
import { parseDocument } from "@/content-blocks/schema";
import { DocumentView } from "@/content-blocks/BlockRenderer";
import { Card } from "@/components/ui/Card";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Exercises } from "@/components/cpa/Exercises";
import { LessonQuestions } from "@/components/cpa/LessonQuestions";
import { Checklist } from "@/components/cpa/Checklist";
import { TimeTracker } from "@/components/cpa/TimeTracker";
import { annotateAction, completeLessonAction } from "../../actions";

type Params = { codigo: string };
export const dynamic = "force-dynamic";

async function load(code: string) {
  const viewer = (await getViewer())!;
  const t = viewer.tenant.id;
  return withTenant(t, async (tx) => {
    const lesson = await tx.cpaLesson.findFirst({
      where: { tenantId: t, code, status: "PUBLICADO" },
      include: { chapter: true, items: { include: { item: true }, orderBy: { item: { code: "asc" } } } },
    });
    if (!lesson) return null;
    const [progress, questions, notes, next, prev] = await Promise.all([
      tx.cpaLessonProgress.findUnique({ where: { userId_lessonId: { userId: viewer.user.id, lessonId: lesson.id } } }),
      tx.cpaQuestion.findMany({ where: { tenantId: t, lessonCode: code, status: "PUBLICADO", use: "FIXACAO" }, orderBy: { code: "asc" } }),
      tx.cpaAnnotation.findMany({ where: { tenantId: t, userId: viewer.user.id, lessonCode: code }, orderBy: { createdAt: "asc" } }),
      lesson.nextLessonCode ? tx.cpaLesson.findFirst({ where: { tenantId: t, code: lesson.nextLessonCode, status: "PUBLICADO" }, select: { code: true, title: true } }) : null,
      tx.cpaLesson.findFirst({ where: { tenantId: t, nextLessonCode: code, status: "PUBLICADO" }, select: { code: true, title: true } }),
    ]);
    const prereqs = lesson.prerequisites.length
      ? await tx.cpaLesson.findMany({ where: { tenantId: t, code: { in: lesson.prerequisites } }, select: { code: true, title: true } })
      : [];
    return { lesson, progress, questions, notes, next, prev, prereqs };
  });
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { codigo } = await params;
  return { title: codigo };
}

export default async function LessonPage({ params }: { params: Promise<Params> }) {
  const { codigo } = await params;
  const data = await load(codigo);
  if (!data) notFound();
  const { lesson, progress, questions, notes, next, prev, prereqs } = data;
  const doc = parseDocument(lesson.document, lesson.title);
  const extras = lesson.extras as { exercises?: { id: string; prompt: string; answer: string }[]; checklist?: string[] };
  const refs = lesson.references as { text: string; url?: string; pending: boolean }[];
  const favorite = notes.some((n) => n.kind === "FAVORITO");
  const done = Boolean(progress?.completed);

  return (
    <div className="grid gap-8 xl:grid-cols-[1fr_18rem]">
      <TimeTracker lessonCode={lesson.code} />
      <article className="min-w-0 space-y-8">
        <header className="space-y-3">
          <p className="text-sm text-text-muted">
            <Link href="/cpa/aulas">Aulas</Link> › Módulo {lesson.chapter.macro} › Capítulo {lesson.chapter.number}. {lesson.chapter.title}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{lesson.code}</Badge>
            <Badge tone="gold">{lesson.minutes} min</Badge>
            {done && <Badge tone="success">Concluída</Badge>}
          </div>
          <h1 className="font-display text-3xl text-text sm:text-4xl">{lesson.title}</h1>
        </header>

        <Card>
          <h2 className="font-display text-xl text-text">Objetivos de aprendizagem</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-text">
            {lesson.objectives.map((o) => (
              <li key={o}>{o}</li>
            ))}
          </ul>
          <h3 className="mt-4 text-sm font-medium text-text">Microtemas oficiais cobertos (Programa Detalhado CPA)</h3>
          <ul className="mt-1 space-y-1 text-xs text-text-muted">
            {lesson.items.map(({ item }) => (
              <li key={item.code}>
                <span className="font-mono">{item.code}</span> {item.text}
              </li>
            ))}
          </ul>
          {prereqs.length > 0 && (
            <p className="mt-3 text-sm text-text-muted">
              Pré-requisitos:{" "}
              {prereqs.map((p, i) => (
                <span key={p.code}>
                  {i > 0 && ", "}
                  <Link href={`/cpa/aulas/${p.code}`}>{p.title}</Link>
                </span>
              ))}
            </p>
          )}
        </Card>

        <DocumentView doc={doc} />

        {extras.exercises?.length ? (
          <section aria-labelledby="exercicios" className="space-y-4">
            <h2 id="exercicios" className="font-display text-2xl text-text">Exercícios de fixação</h2>
            <Exercises items={extras.exercises} />
          </section>
        ) : null}

        {questions.length > 0 && (
          <section aria-labelledby="questoes" className="space-y-4">
            <h2 id="questoes" className="font-display text-2xl text-text">Questões comentadas</h2>
            <p className="text-sm text-text-muted">Responda antes de ver a correção. Os erros entram na sua fila de revisão.</p>
            <LessonQuestions
              questions={questions.map((q) => ({ code: q.code, stem: q.stem, options: (q.options as { key: string; text: string }[]).map((o) => ({ key: o.key, text: o.text })) }))}
            />
          </section>
        )}

        {extras.checklist?.length ? (
          <section aria-labelledby="checklist" className="space-y-3">
            <h2 id="checklist" className="font-display text-2xl text-text">Checklist de domínio</h2>
            <Checklist lessonCode={lesson.code} items={extras.checklist} initial={progress?.checklist ?? []} />
          </section>
        ) : null}

        <section aria-labelledby="referencias" className="space-y-2">
          <h2 id="referencias" className="font-display text-2xl text-text">Referências</h2>
          <ul className="space-y-1 text-sm text-text">
            {refs.map((r) => (
              <li key={r.text}>
                {r.text}
                {r.pending && <span className="ml-2 text-xs text-warning">conferência pendente</span>}
              </li>
            ))}
          </ul>
          {lesson.checkedAt && <p className="text-xs text-text-muted">Conteúdo conferido em {lesson.checkedAt.toLocaleDateString("pt-BR", { timeZone: "UTC" })} · versão {lesson.version}</p>}
        </section>

        <div className="flex flex-col gap-4 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
          <form action={completeLessonAction}>
            <input type="hidden" name="lessonCode" value={lesson.code} />
            <input type="hidden" name="done" value={done ? "0" : "1"} />
            <Button type="submit" variant={done ? "secondary" : "primary"}>
              {done ? "✓ Concluída — desmarcar" : "Marcar aula como concluída"}
            </Button>
          </form>
          <div className="flex flex-wrap gap-2">
            {prev && (
              <ButtonLink variant="secondary" href={`/cpa/aulas/${prev.code}`}>
                ← Anterior
              </ButtonLink>
            )}
            {next && <ButtonLink href={`/cpa/aulas/${next.code}`}>Próxima: {next.title} →</ButtonLink>}
          </div>
        </div>
      </article>

      <aside className="space-y-4" aria-label="Anotações da aula">
        <Card>
          <form action={annotateAction}>
            <input type="hidden" name="lessonCode" value={lesson.code} />
            <input type="hidden" name="kind" value="FAVORITO" />
            <Button type="submit" size="sm" variant="secondary">
              {favorite ? "★ Nos favoritos" : "☆ Adicionar aos favoritos"}
            </Button>
          </form>
          <h2 className="mt-4 font-display text-lg text-text">Minhas anotações</h2>
          <form action={annotateAction} className="mt-2 space-y-2">
            <input type="hidden" name="lessonCode" value={lesson.code} />
            <label className="block text-sm text-text">
              Tipo
              <select name="kind" className="mt-1 min-h-11 w-full rounded-md border border-border-strong bg-bg px-2 text-text">
                <option value="NOTA">Nota</option>
                <option value="DESTAQUE">Destaque (trecho)</option>
                <option value="MARCADOR">Marcador</option>
              </select>
            </label>
            <label className="block text-sm text-text">
              Trecho ou seção (opcional)
              <input name="quote" maxLength={1000} className="mt-1 min-h-11 w-full rounded-md border border-border-strong bg-bg px-2 text-text" />
            </label>
            <label className="block text-sm text-text">
              Anotação
              <textarea name="note" maxLength={4000} className="mt-1 min-h-20 w-full rounded-md border border-border-strong bg-bg px-2 py-1 text-text" />
            </label>
            <Button type="submit" size="sm">
              Salvar
            </Button>
          </form>
          <ul className="mt-4 space-y-2 text-sm">
            {notes
              .filter((n) => n.kind !== "FAVORITO")
              .map((n) => (
                <li key={n.id} className="rounded-md border border-border p-2">
                  <p className="text-xs uppercase text-text-muted">{n.kind.toLowerCase()}</p>
                  {n.quote && <p className="italic text-text">“{n.quote}”</p>}
                  {n.note && <p className="text-text">{n.note}</p>}
                  <form action={annotateAction}>
                    <input type="hidden" name="lessonCode" value={lesson.code} />
                    <input type="hidden" name="kind" value={n.kind} />
                    <input type="hidden" name="remove" value={n.id} />
                    <button type="submit" className="min-h-11 text-xs text-danger underline">
                      Excluir
                    </button>
                  </form>
                </li>
              ))}
          </ul>
        </Card>
      </aside>
    </div>
  );
}
