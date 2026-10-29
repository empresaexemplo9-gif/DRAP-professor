import Link from "next/link";
import { withTenant } from "@/lib/db";
import { getEnrollment, type getModuleBySlugs } from "@/lib/catalog";
import { levelPath } from "@/lib/catalog-paths";
import { getViewer } from "@/lib/session";
import { can } from "@/lib/rbac";
import { formatWorkload } from "@/lib/levels";
import { lessonIds, quizConfig, readSheet } from "@/lib/course-progress";
import type { ContentDocument } from "@/content-blocks/schema";
import { SlotPlaceholder, tableOfContents } from "@/content-blocks/BlockRenderer";
import { Breadcrumb, ProgressBar } from "@/components/ui/misc";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LessonSections } from "@/components/course/LessonSections";
import { QuizPanel } from "@/components/course/QuizPanel";
import { FeedbackForm } from "@/components/course/FeedbackForm";
import { ModuleSideNav } from "../ModuleSideNav";
import { markTopicAction } from "../../../../actions";

const BLOOM_LABEL: Record<string, string> = { lembrar: "Lembrar", compreender: "Compreender", aplicar: "Aplicar", analisar: "Analisar" };

type Module = NonNullable<Awaited<ReturnType<typeof getModuleBySlugs>>>;

/**
 * Assunto de um curso no padrão do arquivo 01 (content/cursos): objetivos, aulas com presença,
 * prova do módulo com gabarito comentado e avaliação de reação.
 */
export async function StandardTopic({
  tenantId,
  mod,
  topic,
  doc,
  courseSheet,
  levelConfig,
  document,
  quizError,
}: {
  tenantId: string;
  mod: Module;
  topic: { id: string; title: string; slug: string; durationMinutes: number };
  doc: ContentDocument;
  courseSheet: unknown;
  levelConfig: unknown;
  document: unknown;
  quizError?: string;
}) {
  const tenant = { id: tenantId };
  const viewer = await getViewer();
  const active = Boolean(viewer && !viewer.disabled && !viewer.needsConsent);
  const enrollment = viewer && active ? await getEnrollment(tenant.id, viewer.user.id, mod.id) : null;
  const isStaff = Boolean(viewer && active && can(viewer.roles, "content:manage"));
  const enrolled = Boolean(enrollment && enrollment.status !== "CANCELADA" && enrollment.status !== "EXPIRADA");
  const sheet = readSheet(courseSheet);
  const cfg = quizConfig(sheet);
  const sequential = (levelConfig as { sequential?: boolean } | null)?.sequential !== false;

  const extra = await withTenant(tenant.id, async (tx) => {
    const questionCounts = await tx.question.groupBy({ by: ["topicId"], where: { tenantId: tenant.id, topicId: { in: mod.topics.map((t) => t.id) }, active: true }, _count: true });
    const progress = enrollment ? await tx.topicProgress.findMany({ where: { enrollmentId: enrollment.id } }) : [];
    const attempts = enrollment
      ? await tx.quizAttempt.findMany({ where: { enrollmentId: enrollment.id, topicId: topic.id }, orderBy: [{ cycle: "asc" }, { number: "asc" }] })
      : [];
    const feedback = enrollment ? await tx.topicFeedback.findUnique({ where: { enrollmentId_topicId: { enrollmentId: enrollment.id, topicId: topic.id } } }) : null;
    return { questionCounts, progress, attempts, feedback };
  });
  const qCount = (id: string) => extra.questionCounts.find((q) => q.topicId === id)?._count ?? 0;
  const prog = (id: string) => extra.progress.find((x) => x.topicId === id);
  const isDoneTopic = (id: string) => (qCount(id) > 0 ? Boolean(prog(id)?.quizPassed) : prog(id)?.status === "CONCLUIDO");
  const completedTopics = new Set(mod.topics.filter((t) => isDoneTopic(t.id)).map((t) => t.id));

  const idx = mod.topics.findIndex((t) => t.id === topic.id);
  const prev = mod.topics[idx - 1];
  const next = mod.topics[idx + 1];
  const path = levelPath(mod.level.slug, mod.segment.slug, mod.slug, topic.slug);
  const toc = tableOfContents(doc);
  const myProgress = prog(topic.id);
  const lessons = lessonIds(document);
  const completedSections = new Set(myProgress?.completedSections ?? []);
  const lessonsDone = lessons.filter((l) => completedSections.has(l)).length;
  const hasQuiz = qCount(topic.id) > 0;
  const moduleSheet = sheet.modules?.find((m) => m.slug === topic.slug);
  const lockedByPrevious = !isStaff && enrolled && sequential && prev && !isDoneTopic(prev.id);
  const canRead = (enrolled && !lockedByPrevious) || isStaff;

  return (
    <>
      <Breadcrumb
        items={[
          { href: "/", label: "Início" },
          { href: `/${mod.level.slug}`, label: mod.level.label },
          { href: levelPath(mod.level.slug, mod.segment.slug), label: mod.segment.name },
          { href: levelPath(mod.level.slug, mod.segment.slug, mod.slug), label: mod.title },
          { label: topic.title },
        ]}
      />
      <div className="grid gap-8 lg:grid-cols-[18rem_1fr] xl:grid-cols-[18rem_1fr_15rem]">
        <aside className="no-print order-2 space-y-4 lg:order-1">
          {enrollment && <ProgressBar value={mod.topics.length ? (completedTopics.size / mod.topics.length) * 100 : 0} label="Progresso no curso" />}
          <ModuleSideNav
            levelSlug={mod.level.slug}
            segmentSlug={mod.segment.slug}
            moduleSlug={mod.slug}
            moduleTitle={mod.title}
            topics={mod.topics}
            currentTopicId={topic.id}
            completed={completedTopics}
          />
        </aside>

        <article className="order-1 min-w-0 space-y-8 lg:order-2">
          <header>
            <p className="text-sm font-medium uppercase tracking-widest text-accent-text">
              {sheet.codigo ? `${sheet.codigo} · ` : ""}Módulo {idx + 1} de {mod.topics.length} · {formatWorkload(topic.durationMinutes)}
            </p>
            <h1 className="mt-2 font-display text-3xl text-text sm:text-4xl">{topic.title}</h1>
            {sheet.aviso && (
              <p className="mt-4 rounded-md border-l-4 border-warning bg-surface p-3 text-sm text-text" role="note">
                {sheet.aviso}
              </p>
            )}
          </header>

          {moduleSheet?.objectives?.length ? (
            <Card>
              <h2 className="font-display text-xl text-text">Objetivos de aprendizagem</h2>
              <p className="mt-1 text-sm text-text-muted">Ao final deste módulo, você será capaz de:</p>
              <ul className="mt-3 space-y-2">
                {moduleSheet.objectives.map((o) => (
                  <li key={o.code} className="flex gap-3 text-sm text-text">
                    <span className="mt-0.5 shrink-0 rounded-sm border border-primary px-1.5 text-xs font-medium text-primary-text">{o.code}</span>
                    <span>
                      {o.text} <span className="text-text-muted">({BLOOM_LABEL[o.bloom.toLowerCase()] ?? o.bloom})</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          {canRead ? (
            <>
              <LessonSections doc={doc} topicId={topic.id} path={path} completed={completedSections} canTrack={enrolled} />
              {hasQuiz ? (
                <QuizPanel
                  topicId={topic.id}
                  path={path}
                  cfg={cfg}
                  questionCount={qCount(topic.id)}
                  lessonsDone={lessonsDone}
                  lessonsTotal={lessons.length}
                  passed={Boolean(myProgress?.quizPassed)}
                  bestScore={myProgress?.bestScore ?? null}
                  cycle={myProgress?.quizCycle ?? 1}
                  attempts={extra.attempts}
                  error={quizError}
                  enrolled={enrolled}
                />
              ) : (
                <SlotPlaceholder title="Questões do assunto" text="Este assunto não tem prova." />
              )}
              {enrolled && myProgress?.quizPassed && <FeedbackForm topicId={topic.id} path={path} existing={extra.feedback} />}
              <SlotPlaceholder title="Fórum do módulo" text="O fórum de discussão será ativado na próxima etapa (Fase 3)." />
              <div className="no-print flex flex-col gap-4 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
                {enrollment && !hasQuiz ? (
                  <form action={markTopicAction}>
                    <input type="hidden" name="topicId" value={topic.id} />
                    <input type="hidden" name="done" value={completedTopics.has(topic.id) ? "0" : "1"} />
                    <input type="hidden" name="path" value={path} />
                    <Button type="submit" variant={completedTopics.has(topic.id) ? "secondary" : "primary"}>
                      {completedTopics.has(topic.id) ? "✓ Concluído — desmarcar" : "Marcar como concluído"}
                    </Button>
                  </form>
                ) : (
                  <span className="text-sm text-text-muted">{isStaff && !enrolled ? "Pré-visualização da equipe." : ""}</span>
                )}
                <div className="flex gap-2">
                  {prev && <ButtonLink variant="secondary" href={levelPath(mod.level.slug, mod.segment.slug, mod.slug, prev.slug)}>← Anterior</ButtonLink>}
                  {next && <ButtonLink href={levelPath(mod.level.slug, mod.segment.slug, mod.slug, next.slug)}>Próximo →</ButtonLink>}
                </div>
              </div>
            </>
          ) : lockedByPrevious ? (
            <Card variant="featured">
              <h2 className="font-display text-xl text-text">Módulo bloqueado</h2>
              <p className="mt-2 text-sm text-text-muted">Os módulos são sequenciais: seja aprovado na prova do módulo anterior para liberar este.</p>
              <div className="mt-4">
                <ButtonLink href={levelPath(mod.level.slug, mod.segment.slug, mod.slug, prev!.slug)}>Ir para {prev!.title}</ButtonLink>
              </div>
            </Card>
          ) : (
            <Card variant="featured">
              <h2 className="font-display text-xl text-text">Conteúdo exclusivo para alunos matriculados</h2>
              <p className="mt-2 text-sm text-text-muted">Este módulo faz parte de {mod.title}.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <ButtonLink href={levelPath(mod.level.slug, mod.segment.slug, mod.slug)}>Ver o curso</ButtonLink>
                {viewer?.needsConsent ? (
                  <ButtonLink href="/aceite" variant="secondary">Revisar os termos</ButtonLink>
                ) : viewer ? (
                  <ButtonLink href="/painel/aprendizado" variant="secondary">Consultar minhas matrículas</ButtonLink>
                ) : (
                  <ButtonLink href="/entrar" variant="secondary">Entrar</ButtonLink>
                )}
              </div>
            </Card>
          )}
        </article>

        <aside className="no-print order-3 hidden xl:block">
          <nav aria-label="Índice do módulo" className="sticky top-24 text-sm">
            <p className="mb-2 font-medium text-text">Neste módulo</p>
            <ul className="space-y-1.5 border-l border-border pl-3">
              {toc.map((s) => (
                <li key={s.id}>
                  <Link href={`#${s.id}`} className="text-text-muted no-underline hover:text-text">
                    {completedSections.has(s.id.slice(2)) ? "✓ " : ""}
                    {s.title}
                  </Link>
                </li>
              ))}
              {hasQuiz && (
                <li>
                  <Link href="#prova" className="text-accent-text no-underline">Prova do módulo</Link>
                </li>
              )}
            </ul>
          </nav>
        </aside>
      </div>
    </>
  );
}
