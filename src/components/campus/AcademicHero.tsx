import Image from "next/image";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

export function AcademicHero({ firstName }: { firstName?: string }) {
  return (
    <section
      className={`academic-hero relative isolate -mx-5 -mt-8 overflow-hidden border-b border-border sm:-mx-8 ${firstName ? "academic-hero-compact" : ""}`}
      aria-labelledby="campus-title"
    >
      <Image
        src="/images/campus-students.jpg"
        alt="Estudantes compartilhando ideias e estudando juntos em uma biblioteca"
        fill
        priority
        sizes="(min-width: 1024px) 75vw, 100vw"
        className="hero-photograph object-cover object-[center_58%]"
      />
      <div className="hero-wash absolute inset-0" />
      <div className="relative z-10 max-w-[620px] px-5 py-12 sm:px-8 lg:py-14">
        <p className="eyebrow mb-5 flex items-center gap-2.5">
          <span className="h-px w-6 bg-accent" />
          {firstName ? "Seu espaço de descoberta e evolução" : "Seu campus digital. Seu próximo capítulo."}
        </p>
        <h1 id="campus-title" className="hero-title font-display text-text">
          {firstName ? (
            <>
              <span className="mb-2 block text-lg">Olá, {firstName}.</span>Aprender hoje.
              <br />
              <span className="text-accent-text">Transformar o amanhã.</span>
            </>
          ) : (
            <>
              O conhecimento
              <br />
              abre portas.
              <br />
              <span className="text-accent-text">A educação, caminhos.</span>
            </>
          )}
        </h1>
        <p className="mt-5 max-w-[385px] text-sm leading-relaxed text-text-muted">
          {firstName
            ? "Cada aula é uma nova possibilidade. Continue sua jornada, amplie seus saberes e construa o seu futuro."
            : "Um lugar para descobrir, aprender e ir além. Formações que conectam o saber à prática, no seu tempo e de onde você estiver."}
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <ButtonLink href={firstName ? "/painel/aprendizado" : "#formacoes"} variant="gold" className="gap-5 text-xs">
            {firstName ? "Continuar aprendendo" : "Conhecer as formações"}
            <Icon name="arrow" className="size-4" />
          </ButtonLink>
          <ButtonLink
            href={firstName ? "/painel/catalogo" : "#metodologia"}
            variant="secondary"
            className="bg-surface/70 text-xs"
          >
            <Icon name={firstName ? "graduation" : "openbook"} className="size-4" />
            {firstName ? "Explorar o catálogo" : "Nossa proposta de ensino"}
          </ButtonLink>
        </div>
      </div>
      <div className="hero-caption absolute bottom-6 right-7 z-10 hidden items-center gap-3 rounded-md border border-campus-on-dark/30 bg-campus/90 px-5 py-3 text-campus-on-dark xl:flex">
        <Icon name="graduation" className="size-8 text-campus-gold" />
        <p className="text-xs leading-relaxed">
          Mais que uma plataforma.
          <br />
          <span className="font-display text-lg">Uma comunidade de saberes.</span>
        </p>
      </div>
    </section>
  );
}
