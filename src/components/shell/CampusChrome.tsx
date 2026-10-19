import Link from "next/link";
import type { ReactNode } from "react";
import { Brand } from "./Brand";
import { NavLinks, type NavLinkItem } from "./NavLinks";
import { MobileNav } from "./MobileNav";
import { ThemeToggle } from "./ThemeToggle";
import { Icon } from "@/components/ui/Icon";
import { ButtonLink } from "@/components/ui/Button";

type CampusProps = { name: string; logoUrl: string | null; items: NavLinkItem[]; account?: ReactNode };

export function CampusSidebar({ name, logoUrl, items, account }: CampusProps) {
  return (
    <aside className="campus-sidebar no-print sticky top-0 hidden h-dvh flex-col lg:flex">
      <div className="px-7 pb-9 pt-8">
        <Brand name={name} logoUrl={logoUrl} />
      </div>
      <p className="px-6 pb-3 text-[9px] font-medium uppercase tracking-[0.2em] text-text-muted">
        Seu espaço de aprendizagem
      </p>
      <nav aria-label="Menu principal" className="min-h-0 flex-1 overflow-y-auto px-3">
        <NavLinks items={items} />
      </nav>
      <div className="sidebar-motto mx-6 mb-6 mt-8 border-t border-border pt-6">
        <Icon name="graduation" className="mb-3 size-7 text-accent" />
        <p className="font-display text-lg italic leading-relaxed text-text">
          Conhecimento
          <br />
          que transforma.
          <br />
          Educação que aproxima.
        </p>
        <span className="mt-4 block h-px w-8 bg-accent" />
      </div>
      <div className="border-t border-border px-5 py-4">
        {account}
        <ThemeToggle />
      </div>
    </aside>
  );
}

export function CampusTopbar({
  name,
  logoUrl,
  items,
  account,
  user,
  levels,
}: CampusProps & {
  user?: { name: string; role: string };
  levels?: { slug: string; label: string }[];
}) {
  const initials = user?.name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("");
  return (
    <header className="campus-topbar no-print sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur-md">
      <div className="flex min-h-[76px] flex-wrap items-center justify-between gap-x-4 gap-y-3 px-5 py-3 sm:px-8">
        <div className="lg:hidden">
          <Brand name={name} logoUrl={logoUrl} />
        </div>
        <form
          role="search"
          action="/buscar"
          className="campus-search order-3 flex w-full items-center gap-3 rounded-full bg-bg px-4 lg:order-none lg:max-w-[510px]"
        >
          <Icon name="search" className="size-4 shrink-0 text-text-muted" />
          <label htmlFor="campus-search" className="sr-only">
            Pesquisar formações e conteúdos
          </label>
          <input
            id="campus-search"
            name="q"
            type="search"
            maxLength={120}
            placeholder="O que você quer aprender hoje?"
            className="min-h-10 min-w-0 flex-1 bg-transparent text-xs text-text placeholder:text-text-muted focus:outline-none"
          />
          <button
            type="submit"
            aria-label="Buscar"
            className="inline-flex size-8 items-center justify-center rounded-full text-text-muted hover:bg-surface-raised hover:text-text"
          >
            <Icon name="arrow" className="size-4" />
          </button>
        </form>
        <div className="ml-auto flex items-center gap-3 sm:gap-5">
          <span className="hidden items-center gap-2 border-r border-border pr-5 text-[10px] uppercase tracking-widest text-text-muted xl:inline-flex">
            <Icon name="graduation" className="size-5 text-accent-text" />
            Campus digital
          </span>
          {user ? (
            <Link href="/painel/conta" aria-label={`Minha conta: ${user.name}`} className="flex items-center gap-3 text-text no-underline">
              <span
                aria-hidden
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-campus text-xs text-campus-on-dark"
              >
                {initials}
              </span>
              <span className="hidden sm:block">
                <span className="block max-w-48 truncate text-xs font-medium">{user.name}</span>
                <span className="block text-[10px] text-text-muted">{user.role}</span>
              </span>
            </Link>
          ) : (
            <ButtonLink href="/entrar" variant="secondary" size="sm" className="gap-2 text-xs">
              <Icon name="graduation" className="size-4" />
              <span className="hidden sm:inline">Portal do aluno</span>
              <span className="sm:hidden">Entrar</span>
            </ButtonLink>
          )}
          <div className="lg:hidden">
            <MobileNav items={items}>
              <div className="border-t border-border p-4">
                {account}
                <ThemeToggle />
              </div>
            </MobileNav>
          </div>
        </div>
      </div>
      {levels && (
        <nav aria-label="Níveis" className="overflow-x-auto border-t border-border/60 px-5 sm:px-8">
          <ul className="flex min-w-max items-center gap-5 py-2">
            <li className="mr-1 hidden text-[9px] uppercase tracking-[0.15em] text-text-muted sm:block">
              Descubra seu caminho
            </li>
            {levels.map((level) => (
              <li key={level.slug}>
                <Link
                  href={`/${level.slug}`}
                  className="inline-flex min-h-7 items-center text-[11px] text-text-muted no-underline hover:text-accent-text"
                >
                  {level.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}

export function CampusFooter({ name }: { name: string }) {
  return (
    <footer className="no-print mx-5 mt-12 flex flex-col gap-4 border-t border-border py-6 text-[10px] text-text-muted sm:mx-8 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <span className="font-medium uppercase tracking-widest text-text">{name}</span>
        <span>© {new Date().getFullYear()} · Educação para novos futuros.</span>
      </div>
      <nav aria-label="Documentos legais" className="flex flex-wrap gap-5">
        <Link href="/termos" className="text-text-muted">
          Termos de uso
        </Link>
        <Link href="/privacidade" className="text-text-muted">
          Política de privacidade
        </Link>
      </nav>
    </footer>
  );
}
