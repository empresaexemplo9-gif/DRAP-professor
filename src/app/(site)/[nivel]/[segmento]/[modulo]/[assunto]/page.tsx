import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTenant } from "@/lib/tenant";
import { withTenant } from "@/lib/db";
import { getEnrollment, getModuleBySlugs, managesCompanyCourse } from "@/lib/catalog";
import { isTeamCourse, TEAM_COURSE_DOWNLOAD } from "@/lib/courses/team-schedules";
import { levelPath } from "@/lib/catalog-paths";
import { getViewer } from "@/lib/session";
import { can } from "@/lib/rbac";
import { isBusinessCourse } from "@/lib/courses/business-management";
import { businessQuestions } from "@/lib/courses/business-management-content";
import { isFinancialCourse } from "@/lib/courses/financial-consulting";
import { FinancialLesson } from "@/components/courses/FinancialLesson";
import { KnowledgeCheck } from "@/components/courses/KnowledgeCheck";
import { findFinancialMentorship, mentorshipPath } from "@/lib/mentorships";
import { mentorshipDownloadPath, mentorshipDownloads } from "@/lib/courses/mentorship-content";
import { mentorshipQuestions, mentorshipTeacherGuide } from "@/lib/courses/mentorship-questions";
import { formatWorkload } from "@/lib/levels";
import { parseDocument } from "@/content-blocks/schema";
import { DocumentView, SlotPlaceholder, tableOfContents } from "@/content-blocks/BlockRenderer";
import { Breadcrumb, ProgressBar } from "@/components/ui/misc";
import { Button, ButtonLink, buttonClass } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { readSheet } from "@/lib/course-progress";
import { ModuleSideNav } from "../ModuleSideNav";
import { StandardTopic } from "./StandardTopic";
import { markTopicAction } from "../../../../actions";

type Params = { nivel: string; segmento: string; modulo: string; assunto: string };

async function load(p: Params) {
  const tenant = await getTenant();
  const mod = await getModuleBySlugs(tenant.id, p.nivel, p.segmento, p.modulo);
  if (!mod) return null;
  const topic = await withTenant(tenant.id, (tx) =>
    tx.topic.findFirst({
      where: { tenantId: tenant.id, moduleId: mod.id, slug: p.assunto, status: "PUBLICADO" },
      include: { publishedVersion: true, module: { select: { courseSheet: true, levelConfig: true } } },
    }),
  );
  if (!topic?.publishedVersion) return null;
  return { tenant, mod, topic, doc: parseDocument(topic.publishedVersion.document, topic.title) };
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const data = await load(await params);
  return { title: data ? `${data.topic.title} · ${data.mod.title}` : "Não encontrado" };
}

export default async function TopicPage({ params, searchParams }: { params: Promise<Params>; searchParams: Promise<{ prova?: string }> }) {
  const p = await params;
  const data = await load(p);
  if (!data) notFound();
  const { tenant, mod, topic, doc } = data;
  // Cursos do catálogo oficial (content/cursos, padrão do arquivo 01): aulas, prova e gabarito comentado.
  if (readSheet(topic.module.courseSheet).codigo) {
    const { prova } = await searchParams;
    return (
      <StandardTopic
        tenantId={tenant.id}
        mod={mod}
        topic={topic}
        doc={doc}
        courseSheet={topic.module.courseSheet}
        levelConfig={topic.module.levelConfig}
        document={topic.publishedVersion!.document}
        quizError={prova}
      />
    );
  }
  const viewer = await getViewer();
  const enrollment = viewer ? await getEnrollment(tenant.id, viewer.user.id, mod.id) : null;
  const isStaff = Boolean(viewer && !viewer.disabled && can(viewer.roles, "content:manage"));
  const isTeam = isTeamCourse(mod);
  const mentorship = findFinancialMentorship(mod);
  const enrolled = enrollment?.status === "ATIVA";
  // Treinamento e mentoria para empresas: o gestor da empresa contratante lê o material para acompanhar a equipe.
  const isManager = Boolean((isTeam || mentorship) && viewer && !viewer.disabled && !enrolled && (await managesCompanyCourse(tenant.id, viewer.user.id, mod.id)));
  const canRead = Boolean(viewer && !viewer.disabled && !viewer.needsConsent && (enrolled || isStaff || isManager));
  const isBusiness = isBusinessCourse(mod);
  const isFinancial = isFinancialCourse(mod);
  const questions = !canRead ? [] : isBusiness ? businessQuestions(topic.slug) : mentorship ? mentorshipQuestions(mentorship, topic.slug) : [];
  const teacherGuide = canRead && mentorship ? mentorshipTeacherGuide(mentorship, topic.slug, isStaff) : null;
  const downloads = mentorship ? mentorshipDownloads(mentorship, isStaff) : [];
  const completed = new Set(enrollment?.progress.filter((x) => x.status === "CONCLUIDO").map((x) => x.topicId) ?? []);
  const idx = mod.topics.findIndex((t) => t.id === topic.id);
  const prev = mod.topics[idx - 1];
  const next = mod.topics[idx + 1];
  const path = levelPath(mod.level.slug, mod.segment.slug, mod.slug, topic.slug);
  const toc = tableOfContents(doc);
  const isDone = completed.has(topic.id);

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
      <div className="grid gap-8 lg:grid-cols-[18rem_1fr] xl:grid-cols-[18rem_1fr_14rem]">
        <aside className="no-print order-2 space-y-4 lg:order-1">
          {enrollment && (
            <ProgressBar
              value={mod.topics.length ? (completed.size / mod.topics.length) * 100 : 0}
              label="Progresso no módulo"
            />
          )}
          <ModuleSideNav
            levelSlug={mod.level.slug}
            segmentSlug={mod.segment.slug}
            moduleSlug={mod.slug}
            moduleTitle={mod.title}
            topics={mod.topics}
            currentTopicId={topic.id}
            completed={completed}
          />
        </aside>

        <article className="order-1 min-w-0 lg:order-2">
          <header className="mb-8">
            <p className="text-sm font-medium uppercase tracking-widest text-accent-text">
              Assunto {idx + 1} de {mod.topics.length} · {formatWorkload(topic.durationMinutes)}
            </p>
            <h1 className="mt-2 font-display text-3xl text-text sm:text-4xl">{topic.title}</h1>
          </header>

          {canRead ? (
            <>
              {isFinancial ? (
                <FinancialLesson
                  doc={doc}
                  topic={topic}
                  tenantId={tenant.id}
                  studentId={enrollment?.status === "ATIVA" ? viewer!.user.id : null}
                />
              ) : isBusiness && topic.slug === "banco-de-questoes" ? (
                <>
                  <KnowledgeCheck key={topic.id} questions={questions} />
                  <details className="rounded-md border border-border bg-surface p-5">
                    <summary className="cursor-pointer font-display text-lg text-text">
                      Consultar questões e gabarito da apostila
                    </summary>
                    <div className="mt-6">
                      <DocumentView doc={doc} />
                    </div>
                  </details>
                </>
              ) : (
                <>
                  <DocumentView doc={doc} />
                  {questions.length > 0 && <KnowledgeCheck key={topic.id} questions={questions} />}
                  {teacherGuide && (
                    <details className="no-print mt-10 rounded-md border border-border bg-surface p-5">
                      <summary className="cursor-pointer font-display text-lg text-text">
                        Gabaritos e critérios de correção (uso docente)
                      </summary>
                      <p className="mt-2 text-sm text-text-muted">Visível somente para a equipe pedagógica. Participantes não veem este apêndice.</p>
                      <div className="mt-6">
                        <DocumentView doc={teacherGuide} />
                      </div>
                    </details>
                  )}
                </>
              )}
              {downloads.length > 0 && (
                <div className="no-print mt-10 flex flex-wrap items-center gap-3 text-sm text-text-muted">
                  <span>Prefere estudar pelo material original?</span>
                  {downloads.map((d) => (
                    <a key={d.id} href={mentorshipDownloadPath(mentorship!, d.id)} className={buttonClass("secondary", "sm")}>
                      {d.audience === "docente" ? `Baixar ${d.label} · uso docente` : `Baixar ${d.label}`}
                    </a>
                  ))}
                </div>
              )}
              {isTeam && (
                <div className="no-print mt-10 flex flex-wrap items-center gap-3 text-sm text-text-muted">
                  <span>Prefere estudar pelo material original?</span>
                  <a href={TEAM_COURSE_DOWNLOAD} className={buttonClass("secondary", "sm")}>Baixar a apostila completa (DOCX)</a>
                </div>
              )}
              {!isBusiness && !isFinancial && !isTeam && !mentorship && (
                <div className="mt-12 space-y-6">
                  <SlotPlaceholder
                    title="Questões do assunto"
                    text="O banco de questões e o quiz deste assunto serão ativados na Fase 3."
                  />
                  <SlotPlaceholder
                    title="Fórum do assunto"
                    text="O fórum de discussão deste assunto será ativado na Fase 3."
                  />
                </div>
              )}
              <div className="no-print mt-10 flex flex-col gap-4 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
                {enrollment ? (
                  <form action={markTopicAction}>
                    <input type="hidden" name="topicId" value={topic.id} />
                    <input type="hidden" name="done" value={isDone ? "0" : "1"} />
                    <input type="hidden" name="path" value={path} />
                    <Button type="submit" variant={isDone ? "secondary" : "primary"}>
                      {isDone ? "✓ Concluído — desmarcar" : "Marcar como concluído"}
                    </Button>
                  </form>
                ) : (
                  <p className="text-sm text-text-muted">{isManager ? "Leitura do gestor da empresa." : "Pré-visualização da equipe."}</p>
                )}
                <div className="flex gap-2">
                  {prev && (
                    <ButtonLink
                      variant="secondary"
                      href={levelPath(mod.level.slug, mod.segment.slug, mod.slug, prev.slug)}
                    >
                      ← Anterior
                    </ButtonLink>
                  )}
                  {next && (
                    <ButtonLink href={levelPath(mod.level.slug, mod.segment.slug, mod.slug, next.slug)}>
                      Próximo →
                    </ButtonLink>
                  )}
                </div>
              </div>
            </>
          ) : (
            <Card variant="featured">
              <h2 className="font-display text-xl text-text">{isTeam || mentorship ? "Conteúdo exclusivo para equipes de empresas contratantes" : "Conteúdo exclusivo para alunos matriculados"}</h2>
              <p className="mt-2 text-sm text-text-muted">
                {viewer?.needsConsent
                  ? "Depois de revisar os termos, volte a este assunto para iniciar seus estudos."
                  : mentorship
                    ? "Esta mentoria é contratada pela empresa: quando sua empresa atribuir uma vaga ao seu e-mail, o acesso aparece automaticamente em Meu Aprendizado. Empresas interessadas podem conhecer a mentoria e solicitar uma proposta."
                  : isTeam
                    ? "Este treinamento é liberado pela empresa: quando sua empresa atribuir uma vaga ao seu e-mail, o acesso aparece automaticamente em Meu Aprendizado. Empresas interessadas podem solicitar uma proposta."
                  : viewer
                    ? `Sua conta está conectada, mas ainda não tem matrícula ativa em ${mod.title}. Consulte suas matrículas para ver o status e os próximos passos.`
                    : `Entre na sua conta e confirme sua matrícula em ${mod.title} para acessar os módulos, exercícios e materiais.`}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {viewer?.needsConsent ? (
                  <ButtonLink href="/aceite">Revisar os termos</ButtonLink>
                ) : mentorship ? (
                  <>
                    <ButtonLink href={mentorshipPath(mentorship)}>Conhecer a mentoria</ButtonLink>
                    <ButtonLink href={viewer ? "/painel/aprendizado" : "/entrar"} variant="secondary">
                      {viewer ? "Ver meu aprendizado" : "Entrar"}
                    </ButtonLink>
                  </>
                ) : isTeam ? (
                  <>
                    <ButtonLink href={`/empresas?curso=${encodeURIComponent(mod.slug)}#proposta`}>Solicitar proposta para minha empresa</ButtonLink>
                    <ButtonLink href={viewer ? "/painel/aprendizado" : "/entrar"} variant="secondary">
                      {viewer ? "Ver meu aprendizado" : "Entrar"}
                    </ButtonLink>
                  </>
                ) : viewer ? (
                  <>
                    <ButtonLink href="/painel/aprendizado">Consultar minhas matrículas</ButtonLink>
                    {isFinancial && (
                      <>
                        <ButtonLink
                          href={`${levelPath(mod.level.slug, mod.segment.slug, mod.slug)}#acesso-financeiro`}
                          variant="secondary"
                        >
                          Ver opções de acesso
                        </ButtonLink>
                        <ButtonLink href={levelPath(mod.level.slug, mod.segment.slug, mod.slug)} variant="ghost">
                          Voltar ao programa
                        </ButtonLink>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <ButtonLink href="/entrar">Entrar</ButtonLink>
                    <ButtonLink href="/cadastro" variant="secondary">
                      Criar minha conta
                    </ButtonLink>
                  </>
                )}
              </div>
            </Card>
          )}
        </article>

        <aside className="no-print order-3 hidden xl:block">
          <nav aria-label="Índice do assunto" className="sticky top-24 text-sm">
            <p className="mb-2 font-medium text-text">Neste assunto</p>
            <ul className="space-y-1.5 border-l border-border pl-3">
              {toc.map((s) => (
                <li key={s.id}>
                  <Link href={`#${s.id}`} className="text-text-muted no-underline hover:text-text">
                    {s.title}
                  </Link>
                  {s.children.length > 0 && (
                    <ul className="mt-1 space-y-1 pl-3">
                      {s.children.map((c) => (
                        <li key={c.id}>
                          <Link href={`#${c.id}`} className="text-text-muted no-underline hover:text-text">
                            {c.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        </aside>
      </div>
    </>
  );
}
