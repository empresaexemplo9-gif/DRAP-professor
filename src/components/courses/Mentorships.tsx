import Image from "next/image";
import Link from "next/link";
import { FINANCIAL_MENTORSHIPS, mentorshipPath, type FinancialMentorship } from "@/lib/mentorships";
import { levelPath } from "@/lib/catalog-paths";
import { formatWorkload } from "@/lib/levels";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Breadcrumb, LinkTabs, PageHeader } from "@/components/ui/misc";

type Published = { slug: string; title: string };
type OtherModule = { id: string; title: string; slug: string; summary: string | null; workloadMinutes: number; segment: { name: string; slug: string } };

/** Banner do cliente; enquanto não houver arquivo, a mesma composição é exibida só com texto. */
export function MentorshipHero({ m, heading = "h2", id }: { m: FinancialMentorship; heading?: "h1" | "h2"; id?: string }) {
  const Title = heading;
  return (
    <section aria-labelledby={id} className="overflow-hidden rounded-lg border border-border bg-surface">
      {m.banner ? (
        <>
          <Image
            src={m.banner}
            alt={`${m.title}: ${m.summary} ${m.porte}.`}
            width={1600}
            height={600}
            priority
            sizes="(min-width: 1280px) 1100px, 100vw"
            className="h-auto w-full"
          />
          <Title id={id} className="sr-only">{m.title}</Title>
        </>
      ) : (
        <div className="grid md:grid-cols-[1.4fr_1fr]">
          <div className="relative flex min-h-48 items-end bg-campus p-6 md:min-h-72">
            <Icon name="wallet" className="pointer-events-none absolute right-6 top-6 size-24 text-campus-on-dark/10" />
            <span className="rounded-md bg-campus-gold px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-campus">{m.porte}</span>
          </div>
          <div className="p-6 sm:p-8">
            <p className="eyebrow mb-3">Mentoria financeira</p>
            <Title id={id} className="font-display text-3xl leading-tight text-text sm:text-4xl">
              Mentoria financeira
              <span className="mt-1 block text-2xl text-text-muted">{m.subtitle}</span>
            </Title>
            <p className="mt-4 text-sm leading-relaxed text-text-muted">{m.summary}</p>
          </div>
        </div>
      )}
    </section>
  );
}

function mentorshipTabs(published: Published[], extra: boolean, hrefFor: (key: string) => string) {
  const items: { key: string; label: string; href: string }[] = FINANCIAL_MENTORSHIPS.filter((m) => published.some((p) => p.slug === m.slug)).map((m) => ({ key: m.key, label: m.tab, href: hrefFor(m.key) }));
  if (extra) items.push({ key: "outras", label: "Outras mentorias", href: hrefFor("outras") });
  return items;
}

/** /mentorias: uma aba por tipo de mentoria. */
export function MentorshipsHub({ published, others, tipo }: { published: Published[]; others: OtherModule[]; tipo?: string }) {
  const tabs = mentorshipTabs(published, others.length > 0, (key) => `/mentorias?tipo=${key}`);
  const current: string = tabs.find((t) => t.key === tipo)?.key ?? tabs[0]?.key ?? "";
  const m = FINANCIAL_MENTORSHIPS.find((x) => x.key === current);
  return (
    <>
      <Breadcrumb items={[{ href: "/", label: "Início" }, { label: "Mentorias" }]} />
      <PageHeader
        eyebrow="Mentorias"
        title="Mentorias"
        description="Acompanhamento próximo de um mentor para decisões que pedem experiência. Escolha o tipo de mentoria adequado ao porte da sua empresa."
      />
      <LinkTabs items={tabs} current={current} />
      {m ? (
        <div className="space-y-6" role="region" aria-label={m.tab}>
          <MentorshipHero m={m} id={`mentoria-${m.key}`} />
          <div className="flex flex-col gap-4 rounded-md border border-border bg-surface p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-2 flex flex-wrap gap-2">
                <Badge tone="primary">Para empresas</Badge>
                <Badge tone="gold">{m.porte}</Badge>
              </div>
              <p className="max-w-xl text-sm text-text-muted">
                Contratada pela empresa: formato, número de encontros e agenda são definidos na proposta, conforme o momento do negócio.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <ButtonLink href={mentorshipPath(m)} variant="secondary">Conhecer a mentoria</ButtonLink>
              <ButtonLink href={`/empresas?curso=${encodeURIComponent(m.slug)}#proposta`} variant="gold">Solicitar proposta</ButtonLink>
            </div>
          </div>
        </div>
      ) : current === "outras" ? (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {others.map((o) => (
            <li key={o.id}>
              <Link href={levelPath("mentorias", o.segment.slug, o.slug)} className="block h-full rounded-md border border-border bg-surface p-5 text-text no-underline hover:border-accent">
                <p className="text-xs text-text-muted">{o.segment.name} · {formatWorkload(o.workloadMinutes)}</p>
                <h2 className="mt-1 font-display text-xl">{o.title}</h2>
                {o.summary && <p className="mt-2 text-sm text-text-muted">{o.summary}</p>}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-text-muted">Ainda não há mentorias publicadas.</p>
      )}
    </>
  );
}

/** Página de uma mentoria financeira, com as abas dos outros tipos. */
export function MentorshipPage({
  m,
  published,
  topics,
  cta,
}: {
  m: FinancialMentorship;
  published: Published[];
  topics: { id: string; title: string; slug: string; durationMinutes: number }[];
  cta: React.ReactNode;
}) {
  const tabs = mentorshipTabs(published, false, (key) => mentorshipPath(FINANCIAL_MENTORSHIPS.find((x) => x.key === key)!));
  return (
    <>
      <Breadcrumb items={[{ href: "/", label: "Início" }, { href: "/mentorias", label: "Mentorias" }, { label: m.tab }]} />
      <LinkTabs items={tabs} current={m.key} />
      <MentorshipHero m={m} heading="h1" id="mentoria-title" />
      <div className="mt-7 grid items-start gap-7 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-6">
          <section aria-labelledby="mentoria-sobre" className="rounded-md border border-border bg-surface p-6">
            <p className="eyebrow mb-2">{m.porte}</p>
            <h2 id="mentoria-sobre" className="font-display text-2xl text-text">{m.summary}</h2>
            <p className="mt-4 text-sm leading-relaxed text-text-muted">
              A mentoria é contratada pela empresa e conduzida em encontros com o mentor. Formato, número de encontros e agenda
              são definidos na proposta, de acordo com o porte e o momento do negócio.
            </p>
          </section>
          {topics.length > 0 && (
            <section aria-labelledby="mentoria-roteiro">
              <h2 id="mentoria-roteiro" className="mb-3 font-display text-2xl text-text">Roteiro</h2>
              <ol className="divide-y divide-border rounded-md border border-border bg-surface">
                {topics.map((t, i) => (
                  <li key={t.id} className="flex items-center justify-between gap-4 p-4">
                    <Link href={`${mentorshipPath(m)}/${t.slug}`} className="text-text no-underline">
                      <span className="mr-3 text-text-muted">{String(i + 1).padStart(2, "0")}</span>
                      {t.title}
                    </Link>
                    <span className="shrink-0 text-sm text-text-muted">{formatWorkload(t.durationMinutes)}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>
        <aside aria-labelledby="mentoria-contratar" className="rounded-md border border-border bg-surface p-6">
          <Icon name="briefcase" className="mb-4 size-9 text-accent-text" />
          <h2 id="mentoria-contratar" className="mb-4 font-display text-2xl text-text">Contratar para sua empresa</h2>
          {cta}
        </aside>
      </div>
    </>
  );
}
