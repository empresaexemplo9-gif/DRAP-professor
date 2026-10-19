import Image from "next/image";
import Link from "next/link";
import {
  BUSINESS_COURSE,
  BUSINESS_COURSE_DOWNLOAD,
  BUSINESS_COURSE_PATH,
  BUSINESS_TRACKS,
} from "@/lib/courses/business-management";
import { formatWorkload } from "@/lib/levels";
import { Breadcrumb, ProgressBar } from "@/components/ui/misc";
import { ButtonLink, buttonClass } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

type Topic = { id: string; title: string; slug: string; durationMinutes: number };
type Props = {
  course: { id: string; title: string; summary: string | null; topics: Topic[] };
  completed: Set<string>;
  enrolled: boolean;
  canRead: boolean;
  isStaff: boolean;
  loggedIn: boolean;
  needsConsent: boolean;
};

function label(title: string) {
  return title.replace(/^Módulo \d+ — /, "").replace(/ \(\d+ h\)$/, "");
}

export function BusinessManagementCourse({
  course,
  completed,
  enrolled,
  canRead,
  isStaff,
  loggedIn,
  needsConsent,
}: Props) {
  const bySlug = new Map(course.topics.map((topic) => [topic.slug, topic]));
  const core = BUSINESS_COURSE.topics
    .filter((topic) => topic.kind === "module" || topic.kind === "project")
    .flatMap((topic) => (bySlug.has(topic.slug) ? [bySlug.get(topic.slug)!] : []));
  const done = core.filter((topic) => completed.has(topic.id)).length;
  const next = done ? (core.find((topic) => !completed.has(topic.id)) ?? core[0]) : bySlug.get("apresentacao");
  const resources = BUSINESS_COURSE.topics
    .filter((topic) => topic.kind === "resource")
    .flatMap((topic) => (bySlug.has(topic.slug) ? [bySlug.get(topic.slug)!] : []));

  return (
    <>
      <Breadcrumb
        items={[
          { href: "/", label: "Início" },
          { href: "/cursos", label: "Cursos" },
          { href: "/cursos/gestao-e-negocios", label: "Gestão e Negócios" },
          { label: "Gestão de Empresas" },
        ]}
      />
      <section
        className="relative isolate overflow-hidden rounded-lg border border-border bg-surface"
        aria-labelledby="business-title"
      >
        <div className="absolute inset-y-0 right-0 -z-10 hidden w-1/2 md:block">
          <Image src="/images/classroom.jpg" alt="" fill priority sizes="50vw" className="object-cover" />
          <div className="absolute inset-0 bg-linear-to-r from-surface via-surface/70 to-surface/10" />
        </div>
        <div className="px-6 py-9 sm:px-9 sm:py-12 md:max-w-[75%]">
          <p className="eyebrow mb-4 flex items-center gap-2">
            <Icon name="graduation" className="size-5 text-accent-text" />
            Gestão e Negócios · Formação profissional
          </p>
          <h1 id="business-title" className="max-w-2xl font-display text-3xl leading-tight text-text sm:text-4xl">
            {course.title === BUSINESS_COURSE.title ? (
              <>
                Curso Livre de
                <br />
                <span className="text-accent-text">Gestão de Empresas</span>
              </>
            ) : (
              course.title
            )}
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-relaxed text-text-muted">
            Da primeira decisão ao próximo ciclo de crescimento. Construa uma visão completa do negócio e transforme o
            conhecimento em um Plano de Gestão para uma empresa real ou idealizada.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <ButtonLink href="#programa" variant="gold" className="gap-4 text-sm">
              Conhecer o programa
              <Icon name="arrow" className="size-4" />
            </ButtonLink>
            <ButtonLink
              href={canRead && next ? `${BUSINESS_COURSE_PATH}/${next.slug}` : "#acesso"}
              variant="secondary"
              className="text-sm"
            >
              {canRead ? "Acessar meu curso" : "Como participar"}
            </ButtonLink>
          </div>
        </div>
      </section>
      <ul aria-label="Informações do curso" className="my-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["clock", "200 horas", "Carga horária total"],
          ["layers", "18 módulos", "7 trilhas com o projeto"],
          ["openbook", "36 questões", "Fixação com correção imediata"],
          ["graduation", "Curso livre", "Sem pré-requisito de graduação"],
        ].map(([icon, value, text]) => (
          <li key={value} className="flex items-center gap-3 rounded-md border border-border bg-surface p-4">
            <Icon name={icon!} className="size-6 shrink-0 text-accent-text" />
            <div>
              <p className="text-[10px] text-text-muted">{text}</p>
              <p className="mt-1 font-display text-lg text-text">{value}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="grid items-start gap-7 xl:grid-cols-[minmax(0,1fr)_290px]">
        <div className="min-w-0 space-y-9">
          <section aria-labelledby="curso-proposta" className="rounded-md border border-border bg-surface p-6">
            <p className="eyebrow mb-2">Conhecimento que se aplica</p>
            <h2 id="curso-proposta" className="font-display text-2xl text-text">
              Aprenda a enxergar a empresa por inteiro.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-text-muted">
              Estratégia, mercado, pessoas, operações e finanças se conectam nesta formação. Cada módulo reúne
              conceitos, exemplos, estudo de caso, atividades e leituras de referência. O projeto integrador transforma
              as etapas em um único plano de gestão.
            </p>
            <ul className="mt-5 grid gap-3 text-sm text-text sm:grid-cols-2">
              {[
                "Analisar o ambiente e definir a estratégia",
                "Organizar vendas, pessoas e operações",
                "Entender finanças, custos e indicadores",
                "Planejar inovação, riscos e crescimento",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <Icon name="check" className="mt-0.5 size-4 shrink-0 text-accent-text" />
                  {item}
                </li>
              ))}
            </ul>
          </section>
          <section id="programa" className="academic-section" aria-labelledby="programa-title">
            <div className="mb-5">
              <p className="eyebrow mb-2">Seu percurso de formação</p>
              <h2 id="programa-title" className="font-display text-2xl text-text">
                Conteúdo programático
              </h2>
              <p className="mt-2 text-xs text-text-muted">
                178 horas de módulos + 22 horas de projeto integrador. Apresentação e materiais de apoio complementam os
                estudos.
              </p>
            </div>
            {bySlug.has("apresentacao") && (
              <Link
                href={`${BUSINESS_COURSE_PATH}/apresentacao`}
                className="mb-4 flex items-center justify-between gap-3 rounded-md border border-border bg-surface p-4 text-text no-underline"
              >
                <span className="flex items-center gap-3">
                  <Icon name="openbook" className="size-5 text-accent-text" />
                  <span>
                    <span className="block text-xs text-text-muted">Comece por aqui</span>
                    <span className="font-display text-lg">Apresentação e orientações de estudo</span>
                  </span>
                </span>
                <Icon name="arrow" className="size-4 shrink-0 text-accent-text" />
              </Link>
            )}
            <div className="space-y-3">
              {BUSINESS_TRACKS.map((track, index) => (
                <details
                  key={track.title}
                  open={index === 0}
                  className="group overflow-hidden rounded-md border border-border bg-surface"
                >
                  <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 px-5 py-4 marker:hidden">
                    <span className="font-display text-xl italic text-accent-text">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="min-w-0 flex-1 font-display text-lg text-text">{track.title}</span>
                    <span className="shrink-0 text-xs text-text-muted">{track.hours} h</span>
                    <Icon
                      name="chevron"
                      className="size-4 shrink-0 text-text-muted transition-transform group-open:rotate-90"
                    />
                  </summary>
                  <ol className="divide-y divide-border border-t border-border">
                    {BUSINESS_COURSE.topics
                      .filter(
                        (topic) =>
                          "moduleNumber" in topic && track.numbers.some((number) => number === topic.moduleNumber),
                      )
                      .map((meta) => {
                        const topic = bySlug.get(meta.slug);
                        if (!topic) return null;
                        return (
                          <li key={topic.id}>
                            <Link
                              href={`${BUSINESS_COURSE_PATH}/${topic.slug}`}
                              className="flex items-center gap-3 px-5 py-4 text-text no-underline hover:bg-surface-raised"
                            >
                              <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border text-[10px] text-accent-text">
                                {completed.has(topic.id) ? (
                                  <Icon name="check" className="size-4" />
                                ) : "moduleNumber" in meta ? (
                                  String(meta.moduleNumber).padStart(2, "0")
                                ) : (
                                  ""
                                )}
                              </span>
                              <span className="min-w-0 flex-1 text-sm">{label(topic.title)}</span>
                              <span className="shrink-0 text-xs text-text-muted">
                                {formatWorkload(topic.durationMinutes)}
                              </span>
                            </Link>
                          </li>
                        );
                      })}
                  </ol>
                </details>
              ))}
            </div>
            {bySlug.has("projeto-integrador") && (
              <Link
                href={`${BUSINESS_COURSE_PATH}/projeto-integrador`}
                className="mt-4 flex items-center gap-4 rounded-md border border-accent/50 bg-surface px-5 py-5 text-text no-underline"
              >
                <Icon name="award" className="size-7 shrink-0 text-accent-text" />
                <div className="min-w-0 flex-1">
                  <p className="eyebrow mb-1">Trilha 07 · Integre o que aprendeu</p>
                  <h3 className="font-display text-xl">Projeto integrador: seu Plano de Gestão</h3>
                  <p className="mt-2 text-xs text-text-muted">
                    Entregas por módulo, apresentação final, rubrica e cronograma de estudo.
                  </p>
                </div>
                <span className="shrink-0 text-sm text-accent-text">22 h</span>
              </Link>
            )}
          </section>
          <section aria-labelledby="curso-recursos">
            <p className="eyebrow mb-2">Para consultar e praticar</p>
            <h2 id="curso-recursos" className="mb-5 font-display text-2xl text-text">
              Sua biblioteca do curso
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {resources.map((topic) => (
                <li key={topic.id}>
                  <Link
                    href={`${BUSINESS_COURSE_PATH}/${topic.slug}`}
                    className="flex h-full items-center gap-3 rounded-md border border-border bg-surface p-4 text-text no-underline hover:border-accent"
                  >
                    <Icon
                      name={topic.slug === "banco-de-questoes" ? "check" : "book"}
                      className="size-5 shrink-0 text-accent-text"
                    />
                    <span className="text-sm">{topic.title.replace(/^Anexo [A-F] — /, "")}</span>
                    <Icon name="arrow" className="ml-auto size-4 shrink-0 text-text-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
        <aside
          id="acesso"
          className="academic-section rounded-md border border-border bg-surface p-6 xl:sticky xl:top-28"
          aria-labelledby="curso-acesso"
        >
          <Icon name="graduation" className="mb-4 size-9 text-accent-text" />
          <p className="eyebrow mb-2">Seu próximo capítulo</p>
          <h2 id="curso-acesso" className="font-display text-2xl text-text">
            {enrolled ? "Sua jornada já começou." : "Faça parte desta formação."}
          </h2>
          {enrolled && (
            <div className="my-5">
              <ProgressBar
                value={core.length ? (done / core.length) * 100 : 0}
                label={`${done} de ${core.length} etapas formativas`}
              />
            </div>
          )}
          <div className="mt-5 space-y-3">
            {needsConsent ? (
              <ButtonLink href="/aceite" className="w-full text-sm">
                Revisar os termos para acessar
              </ButtonLink>
            ) : canRead && next ? (
              <ButtonLink href={`${BUSINESS_COURSE_PATH}/${next.slug}`} variant="gold" className="w-full text-sm">
                {isStaff && !enrolled
                  ? "Pré-visualizar conteúdo"
                  : done
                    ? "Retomar meus estudos"
                    : "Começar pela apresentação"}
                <Icon name="arrow" className="size-4" />
              </ButtonLink>
            ) : (
              <>
                <p className="text-sm leading-relaxed text-text-muted">
                  A matrícula é confirmada pela equipe pedagógica. Após a liberação, o curso aparece em Meu Aprendizado.
                </p>
                {!loggedIn && (
                  <>
                    <ButtonLink href="/cadastro" variant="gold" className="w-full text-sm">
                      Criar minha conta
                    </ButtonLink>
                    <ButtonLink href="/entrar" variant="secondary" className="w-full text-sm">
                      Já tenho conta
                    </ButtonLink>
                  </>
                )}
                {loggedIn && (
                  <ButtonLink href="/painel/aprendizado" variant="secondary" className="w-full text-sm">
                    Consultar minhas matrículas
                  </ButtonLink>
                )}
              </>
            )}
            {canRead && (
              <a href={BUSINESS_COURSE_DOWNLOAD} className={buttonClass("secondary", "md", "w-full text-xs")}>
                <Icon name="book" className="size-4" />
                Baixar apostila original
              </a>
            )}
            {isStaff && (
              <ButtonLink href={`/painel/conteudo/modulos/${course.id}`} variant="ghost" className="w-full text-xs">
                Gerenciar conteúdo e matrículas
              </ButtonLink>
            )}
          </div>
          <div className="mt-6 space-y-4 border-t border-border pt-5 text-xs leading-relaxed text-text-muted">
            <p>
              <strong className="font-medium text-text">Para quem é:</strong> empreendedores, gestores, líderes,
              profissionais em transição e interessados em administração.
            </p>
            <p>
              <strong className="font-medium text-text">Como estudar:</strong> leitura, estudos de caso, atividades
              práticas, exercícios de fixação e construção progressiva do projeto.
            </p>
            <p>
              <strong className="font-medium text-text">Avaliação:</strong> os quizzes são de fixação. A avaliação do
              projeto e a certificação dependem da validação da equipe pedagógica conforme os critérios da apostila.
            </p>
            <p>Curso livre de formação profissional. Não equivale a graduação, MBA ou curso técnico regulamentado.</p>
          </div>
        </aside>
      </div>
    </>
  );
}
