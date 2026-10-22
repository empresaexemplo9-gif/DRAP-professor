import Image from "next/image";
import Link from "next/link";
import { TEAM_COURSE, TEAM_COURSE_BANNER, TEAM_COURSE_DOWNLOAD, TEAM_COURSE_PATH } from "@/lib/courses/team-schedules";
import { formatWorkload } from "@/lib/levels";
import { Breadcrumb, ProgressBar } from "@/components/ui/misc";
import { ButtonLink, buttonClass } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

type Topic = { id: string; title: string; slug: string; durationMinutes: number };
type Props = {
  course: { id: string; title: string; slug: string; summary: string | null; topics: Topic[] };
  completed: Set<string>;
  enrolled: boolean;
  canRead: boolean;
  isStaff: boolean;
  isManager: boolean;
  loggedIn: boolean;
  needsConsent: boolean;
};

const HIGHLIGHTS = [
  {
    icon: "calendar",
    title: "Escala clara e previsível",
    text: "Ferramenta de organização, continuidade operacional, justiça e proteção do descanso. Mudanças frequentes ou critérios pouco claros desgastam a equipe; a escala não é a única causa de desligamentos, mas é um fator de gestão que o líder pode corrigir.",
  },
  {
    icon: "shield",
    title: "Saúde mental e riscos psicossociais",
    text: "Descanso, pausas, sobrecarga e previsibilidade entram no planejamento. O líder escuta, reduz riscos sob seu controle e encaminha pelos canais adequados, sem diagnosticar colaboradores.",
  },
  {
    icon: "users",
    title: "Gestão justa de pessoas",
    text: "Critérios transparentes, comunicação de mudanças, delegação, feedback, conflitos e integração de quem está chegando.",
  },
  {
    icon: "log",
    title: "Aplicação na rotina",
    text: "Modelo de escala, lista de verificação, checklists diário e semanal, indicadores e plano de aplicação de 30 dias.",
  },
];

function label(title: string) {
  return title.replace(/^Módulo \d+ — /, "");
}

export function TeamScheduleCourse({ course, completed, enrolled, canRead, isStaff, isManager, loggedIn, needsConsent }: Props) {
  const bySlug = new Map(course.topics.map((topic) => [topic.slug, topic]));
  const modules = TEAM_COURSE.topics
    .filter((topic) => topic.kind === "module")
    .flatMap((meta) => (bySlug.has(meta.slug) ? [{ meta, topic: bySlug.get(meta.slug)! }] : []));
  const resources = TEAM_COURSE.topics
    .filter((topic) => topic.kind === "resource")
    .flatMap((topic) => (bySlug.has(topic.slug) ? [bySlug.get(topic.slug)!] : []));
  const done = modules.filter(({ topic }) => completed.has(topic.id)).length;
  const next = done ? (modules.find(({ topic }) => !completed.has(topic.id))?.topic ?? modules[0]?.topic) : bySlug.get("apresentacao");
  const proposal = `/empresas?curso=${encodeURIComponent(course.slug)}#proposta`;

  return (
    <>
      <Breadcrumb
        items={[
          { href: "/", label: "Início" },
          { href: "/empresas", label: "Para empresas" },
          { href: "/treinamentos/gestao-e-pessoas", label: "Gestão e Pessoas" },
          { label: course.title },
        ]}
      />
      <section aria-labelledby="team-title" className="overflow-hidden rounded-lg border border-border bg-surface">
        <Image
          src={TEAM_COURSE_BANNER}
          alt="Gestor apresenta a escala de trabalho semanal da equipe comercial em uma tela, durante reunião com a equipe. Gestão e Pessoas: Gestão justa de equipes e escalas — organização, previsibilidade e descanso para equipes que entregam melhor. Curso livre, 12 horas, 8 módulos."
          width={1600}
          height={600}
          priority
          // Arquivo do cliente sem recompressão; proporção real e nunca ampliado além de 1600 px.
          unoptimized
          className="mx-auto h-auto w-full max-w-[1600px]"
        />
        <div className="px-6 py-7 sm:px-9">
          <p className="eyebrow mb-3 flex flex-wrap items-center gap-2">
            <Icon name="briefcase" className="size-5 text-accent-text" />
            Treinamento para empresas · Gestão e Pessoas · Curso livre
          </p>
          <h1 id="team-title" className="font-display text-3xl leading-tight text-text sm:text-4xl">{course.title}</h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-text-muted">
            Como manter a operação funcionando com clareza, previsibilidade, descanso e respeito às pessoas. Para gestores,
            encarregados, supervisores e líderes de turno.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {canRead && next ? (
              <ButtonLink href={`${TEAM_COURSE_PATH}/${next.slug}`} variant="gold" className="gap-3 text-sm">
                {done ? "Retomar o treinamento" : "Começar pela apresentação"}
                <Icon name="arrow" className="size-4" />
              </ButtonLink>
            ) : (
              <ButtonLink href={proposal} variant="gold" className="gap-3 text-sm">
                Solicitar proposta para minha empresa
                <Icon name="arrow" className="size-4" />
              </ButtonLink>
            )}
            <ButtonLink href="#programa" variant="secondary" className="text-sm">Conhecer os 8 módulos</ButtonLink>
          </div>
        </div>
      </section>

      <ul aria-label="Informações do treinamento" className="my-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["clock", "12 horas", "Carga horária sugerida"],
          ["layers", "8 módulos", "Explicação, debate e exercício"],
          ["users", "Equipes inteiras", "Vagas contratadas pela empresa"],
          ["graduation", "Curso livre", "Certificado conforme a contratante"],
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

      <div className="grid items-start gap-7 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-9">
          <section aria-labelledby="team-pilares">
            <p className="eyebrow mb-2">O que a equipe de liderança aprende</p>
            <h2 id="team-pilares" className="mb-5 font-display text-2xl text-text">Organizar o trabalho e cuidar de quem o realiza.</h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {HIGHLIGHTS.map((h) => (
                <li key={h.title} className="flex gap-3 rounded-md border border-border bg-surface p-5">
                  <Icon name={h.icon} className="mt-0.5 size-6 shrink-0 text-accent-text" />
                  <div>
                    <h3 className="font-display text-lg text-text">{h.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-text-muted">{h.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section id="programa" className="academic-section" aria-labelledby="team-programa">
            <p className="eyebrow mb-2">Roteiro e carga horária</p>
            <h2 id="team-programa" className="font-display text-2xl text-text">Conteúdo programático</h2>
            <p className="mt-2 text-xs text-text-muted">
              Aplicação sugerida em dois dias ou quatro encontros de 3 horas. Cada módulo combina explicação, debate, exercício e
              evidência prática.
            </p>
            {bySlug.has("apresentacao") && (
              <Link
                href={`${TEAM_COURSE_PATH}/apresentacao`}
                className="mt-5 flex items-center justify-between gap-3 rounded-md border border-border bg-surface p-4 text-text no-underline"
              >
                <span className="flex items-center gap-3">
                  <Icon name="openbook" className="size-5 text-accent-text" />
                  <span>
                    <span className="block text-xs text-text-muted">Comece por aqui</span>
                    <span className="font-display text-lg">Apresentação, resultados de aprendizagem e roteiro</span>
                  </span>
                </span>
                <Icon name="arrow" className="size-4 shrink-0 text-accent-text" />
              </Link>
            )}
            <ol className="mt-4 divide-y divide-border overflow-hidden rounded-md border border-border bg-surface">
              {modules.map(({ meta, topic }) => (
                <li key={topic.id}>
                  <Link
                    href={`${TEAM_COURSE_PATH}/${topic.slug}`}
                    className="flex items-center gap-3 px-5 py-4 text-text no-underline hover:bg-surface-raised"
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border text-xs text-accent-text">
                      {completed.has(topic.id) ? <Icon name="check" className="size-4" /> : String(meta.moduleNumber).padStart(2, "0")}
                    </span>
                    <span className="min-w-0 flex-1 text-sm">{label(topic.title)}</span>
                    <span className="shrink-0 text-xs text-text-muted">{formatWorkload(topic.durationMinutes)}</span>
                  </Link>
                </li>
              ))}
            </ol>
          </section>

          <section aria-labelledby="team-recursos">
            <p className="eyebrow mb-2">Para levar à rotina</p>
            <h2 id="team-recursos" className="mb-5 font-display text-2xl text-text">Ferramentas e referências</h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {resources.map((topic) => (
                <li key={topic.id}>
                  <Link
                    href={`${TEAM_COURSE_PATH}/${topic.slug}`}
                    className="flex h-full items-center gap-3 rounded-md border border-border bg-surface p-4 text-text no-underline hover:border-accent"
                  >
                    <Icon name={topic.slug === "ferramentas-de-aplicacao" ? "check" : "book"} className="size-5 shrink-0 text-accent-text" />
                    <span className="text-sm">{topic.title}</span>
                    <Icon name="arrow" className="ml-auto size-4 shrink-0 text-text-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside id="acesso" className="academic-section rounded-md border border-border bg-surface p-6 xl:sticky xl:top-28" aria-labelledby="team-acesso">
          <Icon name="briefcase" className="mb-4 size-9 text-accent-text" />
          <p className="eyebrow mb-2">{canRead ? "Seu acesso" : "Como contratar"}</p>
          <h2 id="team-acesso" className="font-display text-2xl text-text">
            {enrolled ? "Seu treinamento já começou." : isManager ? "Material da sua empresa." : canRead ? "Acesso da equipe pedagógica." : "Treine toda a sua liderança."}
          </h2>
          {enrolled && (
            <div className="my-5">
              <ProgressBar value={modules.length ? (done / modules.length) * 100 : 0} label={`${done} de ${modules.length} módulos`} />
            </div>
          )}
          <div className="mt-5 space-y-3">
            {needsConsent ? (
              <ButtonLink href="/aceite" className="w-full text-sm">Revisar os termos para acessar</ButtonLink>
            ) : canRead && next ? (
              <ButtonLink href={`${TEAM_COURSE_PATH}/${next.slug}`} variant="gold" className="w-full text-sm">
                {enrolled ? (done ? "Retomar o treinamento" : "Começar pela apresentação") : "Ler o conteúdo"}
                <Icon name="arrow" className="size-4" />
              </ButtonLink>
            ) : (
              <>
                <p className="text-sm leading-relaxed text-text-muted">
                  Vendido para empresas. A empresa contrata as vagas e cada colaborador recebe o acesso pelo e-mail corporativo,
                  sem matrícula ou pagamento individual. O gestor acompanha progresso, meta e prazo da equipe.
                </p>
                <ButtonLink href={proposal} variant="gold" className="w-full text-sm">Solicitar proposta</ButtonLink>
                {!loggedIn && (
                  <ButtonLink href="/entrar" variant="secondary" className="w-full text-sm">Sou colaborador(a): entrar</ButtonLink>
                )}
              </>
            )}
            {canRead && (
              <a href={TEAM_COURSE_DOWNLOAD} className={buttonClass("secondary", "md", "w-full text-xs")}>
                <Icon name="book" className="size-4" />
                Baixar apostila completa (DOCX)
              </a>
            )}
            {isManager && (
              <ButtonLink href="/painel/empresa" variant="ghost" className="w-full text-xs">Acompanhar minha equipe</ButtonLink>
            )}
            {isStaff && (
              <ButtonLink href={`/painel/conteudo/modulos/${course.id}`} variant="ghost" className="w-full text-xs">Gerenciar conteúdo</ButtonLink>
            )}
          </div>
          <div className="mt-6 space-y-4 border-t border-border pt-5 text-xs leading-relaxed text-text-muted">
            <p><strong className="font-medium text-text">Para quem é:</strong> gestores, encarregados, supervisores e líderes de turno.</p>
            <p><strong className="font-medium text-text">Resultado esperado:</strong> aplicar rotina de liderança, construir escala objetiva e acompanhar riscos, desempenho e bem-estar.</p>
            <p>
              Material educacional: não substitui análise jurídica, convenções e acordos coletivos, medicina e segurança do trabalho ou
              políticas internas. Curso livre; eventual certificado depende de quem o oferece.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
