import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { requireViewer } from "@/lib/session";
import { withTenant } from "@/lib/db";
import { can } from "@/lib/rbac";
import { activeEnrollmentWhere } from "@/lib/enrollments";
import { formatWorkload } from "@/lib/levels";
import { levelPath } from "@/lib/catalog-paths";
import { Alert, EmptyState, ProgressBar } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { AcademicHero } from "@/components/campus/AcademicHero";
import { academicImage, courseBanner } from "@/components/campus/academic-media";

export const metadata: Metadata = { title: "Meu campus" };

export default async function PainelHome({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  const viewer = await requireViewer();
  const t = viewer.tenant.id;
  const data = await withTenant(t, async (tx) => {
    const enrollments = await tx.enrollment.findMany({
      where: {
        tenantId: t,
        userId: viewer.user.id,
        ...activeEnrollmentWhere(),
        module: { status: "PUBLICADO", level: { active: true } },
      },
      include: {
        module: {
          include: {
            level: true,
            segment: true,
            topics: { where: { status: "PUBLICADO" }, orderBy: { order: "asc" }, select: { id: true, slug: true } },
          },
        },
        progress: { where: { status: "CONCLUIDO" }, select: { topicId: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 6,
    });
    const active = await tx.enrollment.count({ where: { tenantId: t, userId: viewer.user.id, ...activeEnrollmentWhere() } });
    const completed = await tx.enrollment.count({
      where: { tenantId: t, userId: viewer.user.id, status: "CONCLUIDA" },
    });
    const topics = await tx.topicProgress.count({
      where: {
        tenantId: t,
        enrollment: { userId: viewer.user.id },
        status: "CONCLUIDO",
        topic: { status: "PUBLICADO" },
      },
    });
    const published = await tx.module.count({ where: { tenantId: t, status: "PUBLICADO", level: { active: true } } });
    const stats = can(viewer.roles, "content:manage")
      ? {
          modules: await tx.module.count({ where: { tenantId: t } }),
          topics: await tx.topic.count({ where: { tenantId: t } }),
          members: await tx.membership.count({ where: { tenantId: t, status: "ACTIVE" } }),
          enrollments: await tx.enrollment.count({ where: { tenantId: t, status: "ATIVA" } }),
        }
      : null;
    return { enrollments, active, completed, topics, published, stats };
  });
  const firstName = viewer.user.name.split(" ")[0] || "estudante";
  return (
    <>
      <AcademicHero firstName={firstName} />
      {erro === "sem-permissao" && (
        <div className="mt-6">
          <Alert tone="warning">Você não tem permissão para acessar aquela área.</Alert>
        </div>
      )}
      <section
        aria-label="Sua jornada acadêmica em números"
        className="-mx-5 mb-9 grid grid-cols-2 border-b border-border bg-surface/60 px-5 py-5 sm:-mx-8 sm:px-8 xl:grid-cols-4"
      >
        {[
          { icon: "book", value: data.active, label: "Formações em andamento" },
          { icon: "check", value: data.topics, label: "Assuntos concluídos" },
          { icon: "graduation", value: data.completed, label: "Formações concluídas" },
          { icon: "globe", value: data.published, label: "Possibilidades no catálogo" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="flex items-center gap-3 px-2 py-3 xl:border-r xl:border-border xl:last:border-0"
          >
            <Icon name={stat.icon} className="size-7 shrink-0 text-accent-text" />
            <div>
              <p className="font-display text-2xl leading-none text-text">{stat.value}</p>
              <p className="mt-2 text-[10px] text-text-muted">{stat.label}</p>
            </div>
          </div>
        ))}
      </section>
      <div className="grid items-start gap-7 xl:grid-cols-[minmax(0,1fr)_270px]">
        <section aria-labelledby="continuar">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow mb-2">Um passo de cada vez</p>
              <h2 id="continuar" className="academic-section-title font-display text-text">
                Seu próximo aprendizado.
              </h2>
            </div>
            <Link href="/painel/aprendizado" className="shrink-0 text-xs text-text">
              Ver tudo <span aria-hidden>→</span>
            </Link>
          </div>
          {data.enrollments.length === 0 ? (
            <EmptyState
              title="Todo caminho começa com uma descoberta"
              text="Conheça nossas formações e encontre o tema que desperta a sua curiosidade. Suas matrículas aparecerão aqui."
              action={
                <ButtonLink href="/painel/catalogo" variant="gold" className="text-sm">
                  Explorar as formações
                  <Icon name="arrow" className="size-4" />
                </ButtonLink>
              }
            />
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2">
              {data.enrollments.map((enrollment) => {
                const program = enrollment.module;
                const completed = new Set(enrollment.progress.map((progress) => progress.topicId));
                const done = program.topics.filter((topic) => completed.has(topic.id)).length;
                const total = program.topics.length;
                const next = program.topics.find((topic) => !completed.has(topic.id));
                return (
                  <li key={enrollment.id} className="overflow-hidden rounded-md border border-border bg-surface">
                    {courseBanner(program.slug) ? (
                      <Image
                        src={courseBanner(program.slug)!.src}
                        alt=""
                        width={courseBanner(program.slug)!.width}
                        height={courseBanner(program.slug)!.height}
                        unoptimized
                        className="h-auto w-full"
                      />
                    ) : (
                      <div className="relative aspect-[8/3]">
                        <Image
                          src={academicImage(program.segment.slug)}
                          alt=""
                          fill
                          sizes="(min-width: 1280px) 30vw, (min-width: 640px) 50vw, 100vw"
                          className="object-cover"
                        />
                        <span className="absolute bottom-3 left-4 rounded-sm bg-campus/90 px-2 py-1 text-[9px] uppercase tracking-widest text-campus-on-dark">
                          {program.level.label}
                        </span>
                      </div>
                    )}
                    <div className="p-5">
                      <p className="mb-2 text-[9px] uppercase tracking-widest text-accent-text">
                        {program.segment.name} · {formatWorkload(program.workloadMinutes)}
                      </p>
                      <h3 className="mb-5 min-h-12 font-display text-xl leading-snug text-text">{program.title}</h3>
                      <ProgressBar value={total ? (done / total) * 100 : 0} label={`${done} de ${total} assuntos`} />
                      <ButtonLink
                        className="mt-5 w-full text-xs"
                        variant="secondary"
                        href={levelPath(program.level.slug, program.segment.slug, program.slug, next?.slug)}
                      >
                        <Icon name={next ? "play" : "check"} className="size-4" />
                        {next ? "Continuar aprendendo" : "Revisitar a formação"}
                      </ButtonLink>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
        <aside aria-label="Espaço do estudante" className="overflow-hidden rounded-md border border-border bg-surface">
          <div className="border-b border-border px-5 py-5">
            <p className="eyebrow mb-2">Sempre por perto</p>
            <h2 className="font-display text-xl text-text">Espaço do estudante</h2>
          </div>
          <ul className="divide-y divide-border px-5">
            {[
              { href: "/painel/aprendizado", icon: "book", title: "Meu percurso", text: "Matrículas e evolução" },
              {
                href: "/#biblioteca",
                icon: "openbook",
                title: "Biblioteca de saberes",
                text: "Descubra novos assuntos",
              },
              {
                href: "/painel/catalogo",
                icon: "graduation",
                title: "Novas formações",
                text: "Encontre seu próximo caminho",
              },
              { href: "/painel/conta", icon: "users", title: "Meu perfil acadêmico", text: "Seus dados e sua conta" },
            ].map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="group flex items-center gap-3 py-5 text-text no-underline">
                  <Icon name={item.icon} className="size-5 shrink-0 text-accent-text" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-medium group-hover:text-accent-text">{item.title}</span>
                    <span className="mt-1 block text-[10px] text-text-muted">{item.text}</span>
                  </span>
                  <Icon name="chevron" className="size-3.5 text-text-muted" />
                </Link>
              </li>
            ))}
          </ul>
          <div className="m-3 rounded-sm bg-surface-raised px-4 py-5">
            <p className="font-display text-lg italic text-text">
              Aprender é abrir espaço
              <br />
              para novas possibilidades.
            </p>
            <span className="mt-4 block h-px w-7 bg-accent" />
          </div>
        </aside>
      </div>
      {data.stats && (
        <section aria-labelledby="gestao-title" className="mt-10 border-t border-border pt-8">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="eyebrow mb-2">Visão da equipe pedagógica</p>
              <h2 id="gestao-title" className="font-display text-2xl text-text">
                Sua comunidade de aprendizagem.
              </h2>
            </div>
            <Link href="/painel/conteudo" className="text-xs">
              Gerenciar conteúdo <span aria-hidden>→</span>
            </Link>
          </div>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              ["Módulos", data.stats.modules],
              ["Assuntos", data.stats.topics],
              ["Pessoas", data.stats.members],
              ["Matrículas ativas", data.stats.enrollments],
            ].map(([label, value]) => (
              <div key={label} className="rounded-md border border-border bg-surface p-5">
                <dt className="text-[10px] text-text-muted">{label}</dt>
                <dd className="mt-2 font-display text-3xl text-text">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </>
  );
}
