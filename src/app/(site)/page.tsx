import Image from "next/image";
import Link from "next/link";
import { getTenant } from "@/lib/tenant";
import { withTenant } from "@/lib/db";
import { formatWorkload, LEVELS } from "@/lib/levels";
import { levelPath } from "@/lib/catalog-paths";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { AcademicHero } from "@/components/campus/AcademicHero";
import { FeaturedCourses } from "@/components/campus/FeaturedCourses";

const BENEFITS = [
  { icon: "graduation", title: "Ensino com propósito", text: "Formações que aproximam conhecimento e prática." },
  { icon: "openbook", title: "Saberes que se conectam", text: "Conteúdos organizados para ampliar seus horizontes." },
  { icon: "clock", title: "No seu tempo", text: "Seu percurso de aprendizagem, no ritmo da sua vida." },
  { icon: "globe", title: "Aprenda de onde estiver", text: "O ambiente acadêmico mais perto de você." },
];

export default async function HomePage() {
  const tenant = await getTenant();
  const data = await withTenant(tenant.id, async (tx) => {
    const published = { tenantId: tenant.id, status: "PUBLICADO" as const, level: { active: true } };
    const levels = await tx.level.findMany({ where: { tenantId: tenant.id, active: true }, orderBy: { order: "asc" } });
    const total = await tx.module.count({ where: published });
    const areas = await tx.segment.count({ where: { tenantId: tenant.id, modules: { some: published } } });
    const modules = await tx.module.findMany({
      where: published,
      include: { level: true, segment: true, _count: { select: { topics: { where: { status: "PUBLICADO" } } } } },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      take: 24,
    });
    const readings = await tx.topic.findMany({
      where: { tenantId: tenant.id, status: "PUBLICADO", module: published },
      include: { module: { include: { level: true, segment: true } } },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      take: 3,
    });
    return { levels, total, areas, modules, readings };
  });
  return (
    <div>
      <AcademicHero />
      <section
        aria-label="Nossa experiência de aprendizagem"
        className="-mx-5 grid grid-cols-2 border-b border-border bg-surface/60 px-5 py-6 sm:-mx-8 sm:px-8 xl:grid-cols-4"
      >
        {BENEFITS.map((benefit) => (
          <div
            key={benefit.title}
            className="flex gap-3 px-2 py-3 sm:px-4 xl:border-r xl:border-border xl:first:pl-0 xl:last:border-r-0"
          >
            <Icon name={benefit.icon} className="mt-0.5 size-7 shrink-0 text-accent-text" />
            <div>
              <h2 className="font-display text-sm font-semibold text-text">{benefit.title}</h2>
              <p className="mt-1.5 max-w-44 text-[10px] leading-relaxed text-text-muted">{benefit.text}</p>
            </div>
          </div>
        ))}
      </section>

      <section id="formacoes" className="academic-section pt-10" aria-labelledby="formacoes-title">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow mb-2">Conheça nossas formações</p>
            <h2 id="formacoes-title" className="academic-section-title font-display text-text">
              Novos saberes. Novas possibilidades.
            </h2>
          </div>
          <Link
            href="/buscar"
            className="inline-flex items-center gap-3 text-xs text-text no-underline hover:text-accent-text"
          >
            Explorar o catálogo
            <Icon name="arrow" className="size-4" />
          </Link>
        </div>
        <FeaturedCourses
          levels={data.levels.map(({ slug, label }) => ({ slug, label }))}
          courses={data.modules.map((module) => ({
            id: module.id,
            title: module.title,
            href: levelPath(module.level.slug, module.segment.slug, module.slug),
            segment: module.segment.name,
            segmentSlug: module.segment.slug,
            level: module.level.label,
            levelSlug: module.level.slug,
            workload: formatWorkload(module.workloadMinutes),
            topics: module._count.topics,
          }))}
        />
      </section>

      <section
        id="metodologia"
        className="academic-section mt-10 grid overflow-hidden rounded-md border border-border lg:grid-cols-[1.1fr_1fr]"
        aria-labelledby="metodologia-title"
      >
        <div className="relative overflow-hidden bg-campus px-7 py-9 text-campus-on-dark sm:px-9">
          <Icon
            name="graduation"
            className="pointer-events-none absolute -right-5 bottom-0 size-48 text-campus-on-dark/5"
          />
          <p className="mb-3 text-[9px] font-medium uppercase tracking-[0.2em] text-campus-gold">
            Nossa essência é ensinar
          </p>
          <h2 id="metodologia-title" className="max-w-sm font-display text-3xl leading-tight">
            Mais que conteúdo.
            <br />
            <span className="italic text-campus-gold">Um caminho de formação.</span>
          </h2>
          <p className="mt-4 max-w-sm text-xs leading-relaxed text-campus-muted">
            Acreditamos na educação que desperta a curiosidade, valoriza a experiência e transforma o jeito de olhar o
            mundo.
          </p>
          <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3">
            {[
              [data.total, "formações publicadas"],
              [data.areas, "áreas do conhecimento"],
              [data.levels.length, "formas de aprender"],
            ].map(([value, label]) => (
              <div key={label}>
                <span className="font-display text-2xl text-campus-gold">{value}</span>
                <p className="mt-1 text-[9px] text-campus-muted">{label}</p>
              </div>
            ))}
          </div>
        </div>
        <ol className="divide-y divide-border bg-surface px-7 py-2 sm:px-8">
          {[
            [
              "01",
              "Descubra o seu caminho",
              "Escolha uma área e conheça a proposta e o conteúdo programático de cada formação.",
            ],
            [
              "02",
              "Construa seu conhecimento",
              "Estude por assuntos, explore leituras e conecte novos conceitos ao seu dia a dia.",
            ],
            ["03", "Acompanhe sua evolução", "Retome de onde parou e registre cada etapa concluída na sua jornada."],
          ].map(([number, title, text]) => (
            <li key={number} className="flex gap-4 py-6">
              <span className="font-display text-xl italic text-accent-text">{number}</span>
              <div>
                <h3 className="font-display text-lg text-text">{title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-text-muted">{text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-10" aria-labelledby="formatos-title">
        <p className="eyebrow mb-2">Diferentes jeitos de ir além</p>
        <h2 id="formatos-title" className="academic-section-title font-display text-text">
          Uma formação para cada momento.
        </h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {data.levels.map((level, index) => (
            <li key={level.id}>
              <Link
                href={`/${level.slug}`}
                className="group block h-full rounded-md border border-border bg-surface px-4 py-5 text-text no-underline transition-colors hover:border-accent"
              >
                <div className="mb-5 flex items-center justify-between">
                  <Icon
                    name={["users", "layers", "graduation", "openbook", "award"][index % 5]!}
                    className="size-6 text-accent-text"
                  />
                  <Icon name="arrow" className="size-4 text-text-muted group-hover:text-accent-text" />
                </div>
                <h3 className="font-display text-lg text-text">{level.label}</h3>
                <p className="mt-2 text-[10px] leading-relaxed text-text-muted">
                  {level.description ?? LEVELS[level.kind].description}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section
        id="biblioteca"
        className="academic-section mt-10 grid overflow-hidden rounded-md border border-border md:grid-cols-[0.85fr_1.15fr]"
        aria-labelledby="biblioteca-title"
      >
        <div className="relative flex min-h-72 items-end overflow-hidden bg-campus p-7">
          <Image
            src="/images/library.jpg"
            alt="Estantes de livros em uma biblioteca"
            fill
            sizes="(min-width: 768px) 40vw, 100vw"
            className="object-cover"
          />
          <div className="library-image-wash absolute inset-0" />
          <div className="relative">
            <Icon name="openbook" className="mb-4 size-8 text-campus-gold" />
            <p className="mb-2 text-[9px] uppercase tracking-[0.2em] text-campus-gold">Biblioteca de saberes</p>
            <h2 id="biblioteca-title" className="font-display text-3xl text-campus-on-dark">
              A curiosidade é<br />o começo de tudo.
            </h2>
          </div>
        </div>
        <div className="bg-surface px-6 py-7 sm:px-8">
          <p className="mb-5 text-xs leading-relaxed text-text-muted">
            Uma prévia dos temas que você encontra nas nossas formações. Explore o programa e descubra a sua próxima
            leitura.
          </p>
          <ul className="divide-y divide-border">
            {data.readings.map((topic) => (
              <li key={topic.id}>
                <Link
                  href={`${levelPath(topic.module.level.slug, topic.module.segment.slug, topic.module.slug)}#programa`}
                  className="group flex items-center gap-4 py-4 text-text no-underline"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-raised text-accent-text">
                    <Icon name="book" className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="mb-1 text-[9px] uppercase tracking-widest text-text-muted">
                      {topic.module.segment.name} · {formatWorkload(topic.durationMinutes)}
                    </p>
                    <h3 className="font-display text-base group-hover:text-accent-text">{topic.title}</h3>
                  </div>
                  <Icon name="arrow" className="size-4 shrink-0 text-accent-text" />
                </Link>
              </li>
            ))}
          </ul>
          {data.readings.length === 0 && (
            <p className="py-8 text-sm text-text-muted">
              As leituras aparecerão aqui quando os primeiros conteúdos forem publicados.
            </p>
          )}
        </div>
      </section>

      <section
        id="comunidade"
        className="academic-section mt-10 flex flex-col items-start justify-between gap-6 border-y border-border py-8 sm:flex-row sm:items-center"
        aria-labelledby="comunidade-title"
      >
        <div className="flex gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full border border-accent/40 text-accent-text">
            <Icon name="users" className="size-6" />
          </span>
          <div>
            <p className="eyebrow mb-2">O seu lugar para aprender</p>
            <h2 id="comunidade-title" className="font-display text-2xl text-text">
              O próximo capítulo começa com você.
            </h2>
            <p className="mt-2 text-xs text-text-muted">
              Faça parte de um espaço que valoriza quem aprende e quem ensina.
            </p>
          </div>
        </div>
        <ButtonLink href="/cadastro" variant="gold" className="shrink-0 gap-5 text-xs">
          Quero fazer parte
          <Icon name="arrow" className="size-4" />
        </ButtonLink>
      </section>
    </div>
  );
}
