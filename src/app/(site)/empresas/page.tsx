import type { Metadata } from "next";
import Link from "next/link";
import { getTenant } from "@/lib/tenant";
import { withTenant } from "@/lib/db";
import { levelPath } from "@/lib/catalog-paths";
import { formatWorkload } from "@/lib/levels";
import { Icon } from "@/components/ui/Icon";
import { Card } from "@/components/ui/Card";
import { LeadForm } from "./LeadForm";

export const metadata: Metadata = {
  title: "Para empresas",
  description: "Treinamentos, cursos e capacitações para equipes inteiras, com painel do gestor, metas e relatórios.",
};

const FEATURES = [
  { icon: "users", title: "Equipes inteiras", text: "Contrate vagas por curso e distribua para toda a equipe colando a lista de e-mails." },
  { icon: "briefcase", title: "Painel do gestor", text: "O gestor da sua empresa acompanha quem começou, quem concluiu e o progresso de cada pessoa." },
  { icon: "calendar", title: "Metas e prazos", text: "Defina um prazo de conclusão e a meta da equipe (ex.: 90% concluindo até o fim do trimestre)." },
  { icon: "log", title: "Relatórios", text: "Exporte o relatório da equipe em planilha (CSV) a qualquer momento, filtrando por área ou filial." },
  { icon: "award", title: "Certificado individual", text: "Cada colaborador conclui no seu ritmo e recebe o próprio certificado." },
  { icon: "shield", title: "Gestão de vagas", text: "Vaga de quem ainda não começou pode ser repassada para outra pessoa da equipe." },
];

export default async function EnterpriseLandingPage() {
  const tenant = await getTenant();
  const levels = await withTenant(tenant.id, (tx) =>
    tx.level.findMany({
      where: { tenantId: tenant.id, active: true, modules: { some: { status: "PUBLICADO" } } },
      orderBy: { order: "asc" },
      select: {
        id: true, label: true, slug: true, description: true,
        modules: {
          where: { status: "PUBLICADO" },
          orderBy: [{ order: "asc" }, { title: "asc" }],
          select: { id: true, title: true, slug: true, workloadMinutes: true, segment: { select: { name: true, slug: true } } },
        },
      },
    }),
  );
  const themes = [...new Set(levels.flatMap((l) => l.modules.map((m) => m.segment.name)))].sort((a, b) => a.localeCompare(b, "pt-BR"));

  return (
    <div className="space-y-12">
      <section className="relative overflow-hidden rounded-md bg-campus px-7 py-10 text-campus-on-dark sm:px-10 sm:py-14" aria-labelledby="enterprise-title">
        <Icon name="briefcase" className="pointer-events-none absolute -right-6 -bottom-6 size-56 text-campus-on-dark/5" />
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-campus-gold">{tenant.name} Enterprise</p>
        <h1 id="enterprise-title" className="max-w-2xl font-display text-4xl leading-tight sm:text-5xl">
          Capacitação para equipes inteiras, <span className="italic text-campus-gold">em todos os temas.</span>
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-campus-muted">
          Treinamentos, cursos, mentorias e capacitações para a sua empresa — com vagas por colaborador, painel do gestor, metas, prazos e relatórios.
        </p>
        <a href="#proposta" className="mt-7 inline-flex min-h-11 items-center gap-3 rounded-md bg-campus-gold px-5 text-sm font-medium text-campus no-underline">
          Solicitar proposta <Icon name="arrow" className="size-4" />
        </a>
      </section>

      <section aria-labelledby="como-funciona">
        <h2 id="como-funciona" className="mb-6 font-display text-3xl text-text">Como funciona</h2>
        <ol className="grid gap-4 md:grid-cols-3">
          {[
            ["01", "Escolha os temas", "Selecione os cursos e treinamentos e quantas vagas sua empresa precisa."],
            ["02", "Distribua as vagas", "O gestor cola a lista de e-mails da equipe; cada pessoa recebe o acesso ou um convite."],
            ["03", "Acompanhe os resultados", "Progresso por colaborador e por equipe, meta e prazo, relatório em planilha."],
          ].map(([n, title, text]) => (
            <li key={n}>
              <Card className="h-full">
                <span className="font-display text-2xl text-accent-text">{n}</span>
                <h3 className="mt-2 font-medium text-text">{title}</h3>
                <p className="mt-1 text-sm text-text-muted">{text}</p>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="recursos">
        <h2 id="recursos" className="mb-6 font-display text-3xl text-text">O que sua empresa recebe</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="flex gap-3 rounded-md border border-border bg-surface p-4">
              <Icon name={f.icon} className="mt-0.5 size-6 shrink-0 text-accent-text" />
              <div>
                <h3 className="font-medium text-text">{f.title}</h3>
                <p className="mt-1 text-sm text-text-muted">{f.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="temas">
        <h2 id="temas" className="font-display text-3xl text-text">Todos os temas disponíveis para empresas</h2>
        <p className="mt-2 max-w-2xl text-text-muted">Qualquer formação do catálogo pode ser contratada para a sua equipe.</p>
        <div className="mt-6 space-y-8">
          {levels.map((level) => (
            <div key={level.id}>
              <h3 className="mb-3 text-sm font-medium uppercase tracking-widest text-accent-text">{level.label}</h3>
              <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {level.modules.map((m) => (
                  <li key={m.id} className="rounded-md border border-border bg-surface p-4">
                    <p className="text-xs text-text-muted">{m.segment.name}</p>
                    <Link href={levelPath(level.slug, m.segment.slug, m.slug)} className="font-medium">{m.title}</Link>
                    <p className="mt-1 text-xs text-text-muted">Carga horária: {formatWorkload(m.workloadMinutes)}</p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section id="proposta" aria-labelledby="proposta-title" className="scroll-mt-24">
        <Card>
          <h2 id="proposta-title" className="font-display text-3xl text-text">Solicite uma proposta</h2>
          <p className="mb-6 mt-2 text-text-muted">Conte quantas pessoas e quais temas; respondemos com valores por vaga e condições para a sua empresa.</p>
          <LeadForm themes={themes} />
        </Card>
      </section>
    </div>
  );
}
