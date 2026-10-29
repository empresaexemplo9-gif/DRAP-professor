import Image from "next/image";
import Link from "next/link";
import {
  FINANCIAL_COURSE,
  FINANCIAL_COURSE_PATH,
  FINANCIAL_DOWNLOAD_PATH,
  FINANCIAL_TRACKS,
} from "@/lib/courses/financial-consulting";
import { Breadcrumb, ProgressBar } from "@/components/ui/misc";
import { ButtonLink, buttonClass } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { formatWorkload } from "@/lib/levels";
import { PixEnrollmentCta } from "@/components/payments/PixEnrollmentCta";

type Topic = { id: string; title: string; slug: string; durationMinutes: number };
type Props = {
  course: { id: string; title: string; priceCents: number | null; topics: Topic[] };
  completed: Set<string>;
  enrolled: boolean;
  canRead: boolean;
  isStaff: boolean;
  loggedIn: boolean;
  needsConsent: boolean;
  paymentsEnabled: boolean;
};
export function FinancialConsultingCourse({
  course,
  completed,
  enrolled,
  canRead,
  isStaff,
  loggedIn,
  needsConsent,
  paymentsEnabled,
}: Props) {
  const topics = new Map(course.topics.map((t) => [t.slug, t]));
  const modules = FINANCIAL_COURSE.topics.filter((t) => t.kind === "module");
  const core = FINANCIAL_COURSE.topics
    .filter((t) => t.kind === "module" || t.kind === "project")
    .flatMap((t) => (topics.has(t.slug) ? [topics.get(t.slug)!] : []));
  const done = core.filter((t) => completed.has(t.id)).length;
  const next = done ? (core.find((t) => !completed.has(t.id)) ?? core[0]) : topics.get("apresentacao");
  return (
    <>
      <Breadcrumb
        items={[
          { href: "/", label: "Início" },
          { href: "/cursos", label: "Cursos" },
          { href: "/cursos/financas", label: "Finanças" },
          { label: "Consultoria Financeira" },
        ]}
      />
      <section
        className="relative isolate overflow-hidden rounded-lg border border-border bg-surface"
        aria-labelledby="financial-title"
      >
        <div className="absolute inset-y-0 right-0 -z-10 hidden w-1/2 md:block">
          <Image src="/images/library.jpg" alt="" fill priority sizes="50vw" className="object-cover" />
          <div className="absolute inset-0 bg-linear-to-r from-surface via-surface/80 to-surface/20" />
        </div>
        <div className="px-6 py-10 sm:px-9 md:max-w-[78%]">
          <p className="eyebrow mb-4 flex items-center gap-2">
            <Icon name="graduation" className="size-5 text-accent-text" />
            Finanças · Formação profissional
          </p>
          <h1 id="financial-title" className="max-w-2xl font-display text-3xl leading-tight text-text sm:text-4xl">
            {course.title}
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-relaxed text-text-muted">
            Transforme dados em diagnósticos e análises em decisões fundamentadas. Um percurso de estudo que conecta
            empresa, patrimônio, mercados, ética e prática de consultoria.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <ButtonLink href="#programa-financeiro" variant="gold" className="gap-3 text-sm">
              Conhecer o programa
              <Icon name="arrow" className="size-4" />
            </ButtonLink>
            <ButtonLink
              href={canRead && next ? `${FINANCIAL_COURSE_PATH}/${next.slug}` : "#acesso-financeiro"}
              variant="secondary"
              className="text-sm"
            >
              {canRead ? "Acessar meu curso" : "Como participar"}
            </ButtonLink>
          </div>
        </div>
      </section>
      <ul aria-label="Informações da formação" className="my-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["clock", "400 horas", "388 h de módulos + 12 h de projeto"],
          ["layers", "18 módulos", "Cinco trilhas de formação"],
          ["openbook", "18 exercícios resolvidos", "Resoluções e aprofundamento"],
          ["book", "162 questões discursivas", "Estudo, análise e rubricas"],
        ].map(([icon, value, label]) => (
          <li key={value} className="flex items-center gap-3 rounded-md border border-border bg-surface p-4">
            <Icon name={icon!} className="size-6 shrink-0 text-accent-text" />
            <div>
              <p className="text-[10px] text-text-muted">{label}</p>
              <p className="mt-1 font-display text-lg text-text">{value}</p>
            </div>
          </li>
        ))}
      </ul>
      <div className="grid items-start gap-7 xl:grid-cols-[minmax(0,1fr)_290px]">
        <div className="min-w-0 space-y-9">
          <section className="rounded-md border border-border bg-surface p-6" aria-labelledby="financial-proposta">
            <p className="eyebrow mb-2">Conhecimento com método</p>
            <h2 id="financial-proposta" className="font-display text-2xl text-text">
              Da pergunta certa à recomendação responsável.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-text-muted">
              Estude fundamentos, compare cenários, documente premissas e desenvolva uma visão integrada do trabalho de
              consultoria. Cada módulo reúne objetivos, conteúdo, caso prático, entregável, resolução comentada e
              questões de estudo.
            </p>
            <ul className="mt-5 grid gap-3 text-sm text-text sm:grid-cols-2">
              {[
                "Diagnóstico e desempenho empresarial",
                "Finanças corporativas e valuation",
                "Patrimônio, instrumentos e risco",
                "Governança, conformidade e implementação",
              ].map((v) => (
                <li key={v} className="flex items-start gap-2">
                  <Icon name="check" className="mt-0.5 size-4 shrink-0 text-accent-text" />
                  {v}
                </li>
              ))}
            </ul>
          </section>
          <section id="programa-financeiro" className="academic-section" aria-labelledby="financial-programa">
            <p className="eyebrow mb-2">Seu percurso de aprendizagem</p>
            <h2 id="financial-programa" className="font-display text-2xl text-text">
              Conteúdo programático
            </h2>
            <p className="mt-2 text-xs text-text-muted">
              18 módulos de estudo (388 h) e 12 h destinadas à revisão e defesa do projeto final. A carga de 20 h do
              laboratório integrado já está incluída nos módulos.
            </p>
            {topics.has("apresentacao") && (
              <Link
                href={`${FINANCIAL_COURSE_PATH}/apresentacao`}
                className="my-5 flex items-center justify-between gap-3 rounded-md border border-border bg-surface p-5 text-text no-underline"
              >
                <span>
                  <span className="eyebrow block mb-1">Comece por aqui</span>
                  <span className="font-display text-lg">Apresentação e orientações de estudo</span>
                </span>
                <Icon name="arrow" className="size-4 shrink-0 text-accent-text" />
              </Link>
            )}
            <div className="space-y-3">
              {FINANCIAL_TRACKS.map((track, index) => {
                const group = modules.filter(
                  (t) => typeof t.moduleNumber === "number" && track.numbers.includes(t.moduleNumber),
                );
                return (
                  <details
                    key={track.title}
                    open={index === 0}
                    className="group overflow-hidden rounded-md border border-border bg-surface"
                  >
                    <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4 marker:hidden">
                      <span className="font-display text-xl italic text-accent-text">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="min-w-0 flex-1 font-display text-lg text-text">{track.title}</span>
                      <span className="shrink-0 text-xs text-text-muted">
                        {group.reduce((n, t) => n + t.durationMinutes, 0) / 60} h
                      </span>
                      <Icon
                        name="chevron"
                        className="size-4 shrink-0 text-text-muted transition-transform group-open:rotate-90"
                      />
                    </summary>
                    <ol className="divide-y divide-border border-t border-border">
                      {group.map((meta) => {
                        const t = topics.get(meta.slug);
                        return t ? (
                          <li key={t.id}>
                            <Link
                              href={`${FINANCIAL_COURSE_PATH}/${t.slug}`}
                              className="flex items-start gap-3 px-5 py-4 text-text no-underline hover:bg-surface-raised"
                            >
                              <span className="mt-0.5 text-xs text-accent-text">
                                {completed.has(t.id)
                                  ? "✓"
                                  : "moduleNumber" in meta
                                    ? String(meta.moduleNumber).padStart(2, "0")
                                    : ""}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block text-sm">{t.title.replace(/^Módulo \d+ — /, "")}</span>
                                {"objective" in meta && (
                                  <span className="mt-1 block text-xs leading-relaxed text-text-muted">
                                    {meta.objective}
                                  </span>
                                )}
                              </span>
                              <span className="shrink-0 text-xs text-text-muted">
                                {formatWorkload(t.durationMinutes)}
                              </span>
                            </Link>
                          </li>
                        ) : null;
                      })}
                    </ol>
                  </details>
                );
              })}
            </div>
            {topics.has("projeto-final") && (
              <Link
                href={`${FINANCIAL_COURSE_PATH}/projeto-final`}
                className="mt-4 flex items-center gap-4 rounded-md border border-accent/50 bg-surface p-5 text-text no-underline"
              >
                <Icon name="award" className="size-7 shrink-0 text-accent-text" />
                <div className="min-w-0 flex-1">
                  <p className="eyebrow mb-1">Integre e defenda sua análise</p>
                  <h3 className="font-display text-xl">Projeto final e critérios de conclusão</h3>
                  <p className="mt-2 text-xs text-text-muted">
                    Entregáveis, rubrica, critérios de avaliação e orientações para a defesa.
                  </p>
                </div>
                <span className="shrink-0 text-sm text-accent-text">12 h</span>
              </Link>
            )}
          </section>
          <section aria-labelledby="financial-recursos">
            <p className="eyebrow mb-2">Fontes e materiais</p>
            <h2 id="financial-recursos" className="mb-4 font-display text-2xl text-text">
              Biblioteca da formação
            </h2>
            {topics.has("referencias") && (
              <ButtonLink href={`${FINANCIAL_COURSE_PATH}/referencias`} variant="secondary">
                Referências e fontes de consulta
              </ButtonLink>
            )}
            <p className="mt-4 text-sm leading-relaxed text-text-muted">
              Apostila e caderno de exercícios originais disponíveis para alunos matriculados. Os módulos já incluem as
              resoluções e as atividades da edição avançada.
            </p>
          </section>
        </div>
        <aside
          id="acesso-financeiro"
          className="academic-section rounded-md border border-border bg-surface p-6 xl:sticky xl:top-28"
          aria-labelledby="financial-acesso"
        >
          <Icon name="graduation" className="mb-4 size-9 text-accent-text" />
          <p className="eyebrow mb-2">Seu próximo aprendizado</p>
          <h2 id="financial-acesso" className="font-display text-2xl text-text">
            {enrolled ? "Seu percurso em finanças." : "Faça parte da formação."}
          </h2>
          {enrolled && (
            <div className="my-5">
              <ProgressBar
                value={core.length ? (done / core.length) * 100 : 0}
                label={`${done} de ${core.length} etapas de estudo`}
              />
            </div>
          )}
          <div className="mt-5 space-y-3">
            {needsConsent ? (
              <ButtonLink href="/aceite" className="w-full text-sm">
                Revisar os termos
              </ButtonLink>
            ) : canRead && next ? (
              <ButtonLink href={`${FINANCIAL_COURSE_PATH}/${next.slug}`} variant="gold" className="w-full text-sm">
                {done
                  ? "Retomar meus estudos"
                  : isStaff && !enrolled
                    ? "Pré-visualizar conteúdo"
                    : "Começar meus estudos"}
              </ButtonLink>
            ) : (
              <>
                <PixEnrollmentCta moduleId={course.id} priceCents={course.priceCents} loggedIn={loggedIn} needsConsent={needsConsent} enabled={paymentsEnabled} />
              </>
            )}
            {canRead && (
              <>
                <a
                  href={`${FINANCIAL_DOWNLOAD_PATH}/apostila`}
                  className={buttonClass("secondary", "md", "w-full text-xs")}
                >
                  Baixar apostila original
                </a>
                <a
                  href={`${FINANCIAL_DOWNLOAD_PATH}/caderno`}
                  className={buttonClass("secondary", "md", "w-full text-xs")}
                >
                  Baixar caderno de exercícios
                </a>
              </>
            )}
            {isStaff && (
              <ButtonLink href={`/painel/conteudo/modulos/${course.id}`} variant="ghost" className="w-full text-xs">
                Gerenciar conteúdo e matrículas
              </ButtonLink>
            )}
          </div>
          <div className="mt-6 space-y-4 border-t border-border pt-5 text-xs leading-relaxed text-text-muted">
            <p>
              <strong className="font-medium text-text">Para quem:</strong> estudantes e profissionais interessados em
              diagnóstico, finanças e consultoria.
            </p>
            <p>
              <strong className="font-medium text-text">Como estudar:</strong> leitura, casos, exercícios resolvidos,
              questões discursivas e construção do projeto final.
            </p>
            <p>
              <strong className="font-medium text-text">Seu caderno:</strong> os rascunhos são privados e ficam salvos
              na sua conta ao clicar em Salvar rascunho.
            </p>
            <p>
              <strong className="font-medium text-text">Avaliação e certificação:</strong> a conclusão de leituras e os
              rascunhos não atribuem nota ou emitem certificado. A avaliação do projeto e a certificação dependem da
              equipe pedagógica e dos critérios da apostila.
            </p>
            <p>
              Formação profissional livre. O certificado privado não equivale a diploma acadêmico nem concede
              autorização profissional regulatória.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
