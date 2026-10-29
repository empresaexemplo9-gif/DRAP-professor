import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTenant } from "@/lib/tenant";
import { getEnrollment, getModuleBySlugs } from "@/lib/catalog";
import { levelPath } from "@/lib/catalog-paths";
import { getViewer } from "@/lib/session";
import { can } from "@/lib/rbac";
import { isBusinessCourse } from "@/lib/courses/business-management";
import { isFinancialCourse } from "@/lib/courses/financial-consulting";
import { isTeamCourse } from "@/lib/courses/team-schedules";
import { TeamScheduleCourse } from "@/components/courses/TeamScheduleCourse";
import { managesCompanyCourse } from "@/lib/catalog";
import { findFinancialMentorship, FINANCIAL_MENTORSHIPS } from "@/lib/mentorships";
import { MentorshipPage } from "@/components/courses/Mentorships";
import { withTenant } from "@/lib/db";
import { FinancialConsultingCourse } from "@/components/courses/FinancialConsultingCourse";
import { BusinessManagementCourse } from "@/components/courses/BusinessManagementCourse";
import { formatWorkload, LEVELS, parseLevelConfig } from "@/lib/levels";
import { Breadcrumb, PageHeader, ProgressBar } from "@/components/ui/misc";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { BlockView, SlotPlaceholder } from "@/content-blocks/BlockRenderer";
import { markdownToBlocks } from "@/content-import/markdown";
import { finalGrade } from "@/lib/quiz";
import { quizConfig, readSheet } from "@/lib/course-progress";
import { ModuleSideNav } from "./ModuleSideNav";
import { PixEnrollmentCta } from "@/components/payments/PixEnrollmentCta";

type Params = { nivel: string; segmento: string; modulo: string };

const CERT_LABEL = { LIVRE: "Curso livre", EXTENSAO: "Extensão", CAPACITACAO: "Capacitação profissional" } as const;

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const p = await params;
  const tenant = await getTenant();
  const m = await getModuleBySlugs(tenant.id, p.nivel, p.segmento, p.modulo);
  return { title: m?.title ?? "Não encontrado", description: m?.summary ?? undefined };
}

function LevelFacts({ kind, config }: { kind: keyof typeof LEVELS; config: unknown }) {
  const facts: [string, string][] = [];
  if (kind === "MENTORIA") {
    const c = parseLevelConfig("MENTORIA", config);
    facts.push(
      ["Formato", c.sessionFormat === "GRUPO" ? "Em grupo" : "Individual"],
      ["Encontros previstos", String(c.plannedSessions)],
      ["Duração do encontro", `${c.sessionMinutes} min`],
    );
  } else if (kind === "TREINAMENTO") {
    const c = parseLevelConfig("TREINAMENTO", config);
    facts.push(
      ["Público", c.targetAudience || "Equipes e empresas"],
      ["Prazo de conclusão", `${c.deadlineDays} dias`],
      ["Meta da equipe", `${c.teamGoalPercent}% aprovados`],
    );
  } else if (kind === "CURSO") {
    const c = parseLevelConfig("CURSO", config);
    facts.push(
      ["Sequência", c.sequential ? "Módulos sequenciais" : "Livre"],
      ["Avaliação final", c.finalExam ? "Sim" : "Não"],
      ["Nota mínima", `${c.minScore}%`],
    );
  } else if (kind === "AULA") {
    const c = parseLevelConfig("AULA", config);
    facts.push(["Formato", c.format === "AO_VIVO" ? "Ao vivo" : "Gravada"]);
    if (c.format === "AO_VIVO" && c.liveAt)
      facts.push(["Data", new Date(c.liveAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })]);
  } else {
    const c = parseLevelConfig("CAPACITACAO", config);
    facts.push(["Frequência mínima", `${c.minAttendancePercent}%`], ["Nota mínima", `${c.minScore}%`]);
  }
  return (
    <dl className="grid gap-3 sm:grid-cols-3">
      {facts.map(([k, v]) => (
        <div key={k} className="rounded-md border border-border bg-bg p-3">
          <dt className="text-xs uppercase tracking-wide text-text-muted">{k}</dt>
          <dd className="mt-1 font-medium text-text">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export default async function ModulePage({ params }: { params: Promise<Params> }) {
  const p = await params;
  const tenant = await getTenant();
  const mod = await getModuleBySlugs(tenant.id, p.nivel, p.segmento, p.modulo);
  if (!mod) notFound();
  const viewer = await getViewer();
  const enrollment = viewer ? await getEnrollment(tenant.id, viewer.user.id, mod.id) : null;
  const completed = new Set(enrollment?.progress.filter((x) => x.status === "CONCLUIDO").map((x) => x.topicId) ?? []);
  const isStaff = Boolean(viewer && !viewer.disabled && can(viewer.roles, "content:manage"));
  const sheet = readSheet((await withTenant(tenant.id, (tx) => tx.module.findUnique({ where: { id: mod.id }, select: { courseSheet: true } })))?.courseSheet);
  const cfg = quizConfig(sheet);
  const bank = await withTenant(tenant.id, (tx) =>
    tx.question.groupBy({ by: ["topicId"], where: { tenantId: tenant.id, topicId: { in: mod.topics.map((t) => t.id) }, active: true }, _count: true }),
  );
  const quizTopics = mod.topics.filter((t) => bank.some((b) => b.topicId === t.id));
  const best = (id: string) => enrollment?.progress.find((x) => x.topicId === id)?.bestScore ?? null;
  const grade = quizTopics.length ? finalGrade(quizTopics.map((t) => best(t.id))) : null;
  const sheetFacts: [string, string | undefined][] = [
    ["Código", sheet.codigo],
    ["Público-alvo", sheet.publico],
    ["Pré-requisitos", sheet.pre_requisitos],
    ["Instrutor", sheet.instrutor],
    ["Revisão técnica", sheet.revisor],
    ["Versão", sheet.versao ? `${sheet.versao}${sheet.revisao ? ` · revisado em ${sheet.revisao}` : ""}` : undefined],
  ];
  const pct = mod.topics.length ? (completed.size / mod.topics.length) * 100 : 0;
  const first = mod.topics.find((t) => !completed.has(t.id)) ?? mod.topics[0];

  const mentorship = findFinancialMentorship(mod);
  if (mentorship) {
    const published = await withTenant(tenant.id, (tx) =>
      tx.module.findMany({
        where: { tenantId: tenant.id, status: "PUBLICADO", levelId: mod.levelId, segmentId: mod.segmentId, slug: { in: FINANCIAL_MENTORSHIPS.map((m) => m.slug) } },
        select: { slug: true, title: true },
      }),
    );
    return (
      <MentorshipPage
        m={mentorship}
        published={published}
        topics={mod.topics}
        workloadMinutes={mod.workloadMinutes}
        cta={<PixEnrollmentCta moduleId={mod.id} priceCents={mod.priceCents} loggedIn={Boolean(viewer)} needsConsent={Boolean(viewer?.needsConsent)} enabled={false} audience={mod.audience} courseSlug={mod.slug} />}
      />
    );
  }

  if (isTeamCourse(mod)) {
    const isStaff = Boolean(viewer && !viewer.disabled && can(viewer.roles, "content:manage"));
    const enrolled = enrollment?.status === "ATIVA";
    const isManager = Boolean(viewer && !viewer.disabled && !enrolled && (await managesCompanyCourse(tenant.id, viewer.user.id, mod.id)));
    return (
      <TeamScheduleCourse
        course={mod}
        completed={completed}
        enrolled={enrolled}
        canRead={Boolean(viewer && !viewer.disabled && !viewer.needsConsent && (enrolled || isStaff || isManager))}
        isStaff={isStaff}
        isManager={isManager}
        loggedIn={Boolean(viewer)}
        needsConsent={Boolean(viewer?.needsConsent)}
      />
    );
  }

  if (isBusinessCourse(mod) || isFinancialCourse(mod)) {
    const CoursePage = isFinancialCourse(mod) ? FinancialConsultingCourse : BusinessManagementCourse;
    const isStaff = Boolean(viewer && !viewer.disabled && can(viewer.roles, "content:manage"));
    const enrolled = enrollment?.status === "ATIVA";
    const canRead = Boolean(viewer && !viewer.disabled && !viewer.needsConsent && (enrolled || isStaff));
    return (
      <CoursePage
        course={mod}
        completed={completed}
        enrolled={enrolled}
        canRead={canRead}
        isStaff={isStaff}
        loggedIn={Boolean(viewer)}
        needsConsent={Boolean(viewer?.needsConsent)}
        paymentsEnabled={Boolean(process.env.ASAAS_API_KEY && process.env.ASAAS_WEBHOOK_TOKEN)}
      />
    );
  }

  return (
    <>
      <Breadcrumb
        items={[
          { href: "/", label: "Início" },
          { href: `/${mod.level.slug}`, label: mod.level.label },
          { href: levelPath(mod.level.slug, mod.segment.slug), label: mod.segment.name },
          { label: mod.title },
        ]}
      />
      <div className="grid gap-8 lg:grid-cols-[18rem_1fr]">
        <aside className="order-2 lg:order-1">
          <ModuleSideNav
            levelSlug={mod.level.slug}
            segmentSlug={mod.segment.slug}
            moduleSlug={mod.slug}
            moduleTitle={mod.title}
            topics={mod.topics}
            completed={completed}
          />
        </aside>
        <div className="order-1 min-w-0 space-y-8 lg:order-2">
          <PageHeader
            eyebrow={`${LEVELS[mod.level.kind].singular} · ${mod.segment.name}`}
            title={mod.title}
            description={mod.summary ?? undefined}
          />
          <div className="flex flex-wrap gap-2">
            <Badge tone="gold">Carga horária: {formatWorkload(mod.workloadMinutes)}</Badge>
            <Badge>{mod.topics.length} assuntos</Badge>
            <Badge tone="primary">{CERT_LABEL[mod.certificateType]}</Badge>
          </div>
          <LevelFacts kind={mod.level.kind} config={mod.levelConfig} />
          {sheet.objetivo_geral && (
            <Card>
              <h2 className="font-display text-xl text-text">Ficha do curso</h2>
              <p className="mt-2 text-text">{sheet.objetivo_geral}</p>
              <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                {sheetFacts
                  .filter(([, v]) => v)
                  .map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-xs uppercase tracking-wide text-text-muted">{k}</dt>
                      <dd className="mt-0.5 text-text">{v}</dd>
                    </div>
                  ))}
              </dl>
              {sheet.aviso && (
                <p className="mt-4 rounded-md border-l-4 border-warning bg-bg p-3 text-sm text-text" role="note">
                  {sheet.aviso}
                </p>
              )}
            </Card>
          )}
          {quizTopics.length > 0 && (
            <Card>
              <h2 className="font-display text-xl text-text">Como você é avaliado</h2>
              <ul className="mt-3 grid gap-2 text-sm text-text-muted sm:grid-cols-2">
                <li>• Uma prova por módulo, com {cfg.questionsPerQuiz} questões sorteadas do banco</li>
                <li>• Aprovação com {cfg.passPercent}% de acertos; módulos liberados em sequência</li>
                <li>• {cfg.maxAttempts} tentativas por ciclo, com {cfg.retryHours} h entre elas</li>
                <li>• Prova liberada após {cfg.minLessonsPercent}% das aulas do módulo</li>
                <li>• Nota final: média da melhor nota de cada módulo</li>
                <li>• Gabarito comentado após cada tentativa</li>
              </ul>
              {enrollment && (
                <div tabIndex={0} role="region" aria-label="Notas por módulo" className="mt-5 overflow-x-auto">
                  <table className="w-full text-sm">
                    <caption className="sr-only">Notas por módulo</caption>
                    <thead>
                      <tr className="border-b border-border text-left text-text-muted">
                        <th className="py-2 pr-3 font-medium">Módulo</th>
                        <th className="py-2 pr-3 font-medium">Melhor nota</th>
                        <th className="py-2 font-medium">Situação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quizTopics.map((t) => {
                        const b = best(t.id);
                        const ok = completed.has(t.id);
                        return (
                          <tr key={t.id} className="border-b border-border">
                            <td className="py-2 pr-3 text-text">{t.title}</td>
                            <td className="py-2 pr-3 text-text">{b === null ? "—" : `${b.toFixed(1)}%`}</td>
                            <td className={ok ? "py-2 text-success" : "py-2 text-text-muted"}>{ok ? "Aprovado" : b === null ? "Não iniciado" : "Em recuperação"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td className="py-2 pr-3 font-medium text-text">Nota final</td>
                        <td className="py-2 pr-3 font-medium text-text" colSpan={2}>
                          {grade === null ? "Disponível após a prova de todos os módulos" : `${grade.toFixed(1)}%`}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
              {isStaff && (
                <div className="mt-4">
                  <ButtonLink size="sm" variant="secondary" href={`/painel/conteudo/metricas/${mod.id}`}>
                    Métricas de ensino e aprendizagem
                  </ButtonLink>
                </div>
              )}
            </Card>
          )}
          <Card>
            {enrollment?.status === "ATIVA" ? (
              <div className="space-y-4">
                <ProgressBar value={pct} label="Seu progresso" />
                {first && (
                  <ButtonLink href={levelPath(mod.level.slug, mod.segment.slug, mod.slug, first.slug)}>
                    {completed.size ? "Continuar de onde parei" : "Começar agora"}
                  </ButtonLink>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <h2 className="font-display text-xl text-text">Acesso ao conteúdo</h2>
                <PixEnrollmentCta moduleId={mod.id} priceCents={mod.priceCents} loggedIn={Boolean(viewer)} needsConsent={Boolean(viewer?.needsConsent)} enabled={Boolean(process.env.ASAAS_API_KEY && process.env.ASAAS_WEBHOOK_TOKEN)} audience={mod.audience} courseSlug={mod.slug} />
              </div>
            )}
          </Card>
          {(sheet.intro ?? []).map((part, i) => (
            <section key={i} aria-labelledby={`intro-${i}`} className="rounded-xl border border-border bg-surface p-5 sm:p-8">
              <h2 id={`intro-${i}`} className="mb-4 font-display text-2xl text-text">{part.title}</h2>
              <div className="drap-content">
                {markdownToBlocks(part.markdown, `intro${i}`).map((b) => (
                  <BlockView key={b.id} block={b} />
                ))}
              </div>
            </section>
          ))}
          <section aria-labelledby="programa">
            <h2 id="programa" className="mb-3 font-display text-2xl text-text">
              Conteúdo programático
            </h2>
            <ol className="divide-y divide-border rounded-lg border border-border bg-surface">
              {mod.topics.map((t, i) => (
                <li key={t.id} className="flex items-center justify-between gap-4 p-4">
                  <Link
                    href={levelPath(mod.level.slug, mod.segment.slug, mod.slug, t.slug)}
                    className="text-text no-underline hover:text-primary-text"
                  >
                    <span className="mr-3 text-text-muted">{String(i + 1).padStart(2, "0")}</span>
                    {t.title}
                  </Link>
                  <span className="shrink-0 text-sm text-text-muted">{formatWorkload(t.durationMinutes)}</span>
                </li>
              ))}
            </ol>
          </section>
          <SlotPlaceholder
            title="Fórum geral do módulo"
            text="O fórum de discussão do módulo será ativado na Fase 3."
          />
        </div>
      </div>
    </>
  );
}
