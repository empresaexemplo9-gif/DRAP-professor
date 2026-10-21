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
import { FinancialConsultingCourse } from "@/components/courses/FinancialConsultingCourse";
import { BusinessManagementCourse } from "@/components/courses/BusinessManagementCourse";
import { formatWorkload, LEVELS, parseLevelConfig } from "@/lib/levels";
import { Breadcrumb, PageHeader, ProgressBar } from "@/components/ui/misc";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SlotPlaceholder } from "@/content-blocks/BlockRenderer";
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
  const pct = mod.topics.length ? (completed.size / mod.topics.length) * 100 : 0;
  const first = mod.topics.find((t) => !completed.has(t.id)) ?? mod.topics[0];

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
                <PixEnrollmentCta moduleId={mod.id} priceCents={mod.priceCents} loggedIn={Boolean(viewer)} needsConsent={Boolean(viewer?.needsConsent)} enabled={Boolean(process.env.ASAAS_API_KEY && process.env.ASAAS_WEBHOOK_TOKEN)} />
              </div>
            )}
          </Card>
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
