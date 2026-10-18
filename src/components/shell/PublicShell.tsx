import Link from "next/link";
import { getTenantTheme } from "@/theme/server";
import { getViewer } from "@/lib/session";
import { withTenant } from "@/lib/db";
import { Brand } from "./Brand";
import { ThemeToggle } from "./ThemeToggle";
import { ButtonLink } from "@/components/ui/Button";

export async function PublicShell({ children }: { children: React.ReactNode }) {
  const { tenant, logoUrl } = await getTenantTheme();
  const viewer = await getViewer();
  const levels = await withTenant(tenant.id, (tx) =>
    tx.level.findMany({ where: { tenantId: tenant.id, active: true }, orderBy: { order: "asc" }, select: { slug: true, label: true } }),
  );
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="no-print sticky top-0 z-30 border-b border-border bg-bg/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <Brand name={tenant.name} logoUrl={logoUrl} />
          <div className="flex items-center gap-2">
            <div className="hidden sm:block">
              <ThemeToggle />
            </div>
            {viewer ? (
              <ButtonLink href="/painel" size="sm">
                Meu painel
              </ButtonLink>
            ) : (
              <>
                <ButtonLink href="/entrar" variant="ghost" size="sm">
                  Entrar
                </ButtonLink>
                <ButtonLink href="/cadastro" size="sm">
                  Criar conta
                </ButtonLink>
              </>
            )}
          </div>
        </div>
        <nav aria-label="Níveis" className="mx-auto max-w-7xl overflow-x-auto px-4">
          <ul className="flex min-w-max gap-1">
            {levels.map((l) => (
              <li key={l.slug}>
                <Link href={`/${l.slug}`} className="inline-flex min-h-11 items-center px-3 text-sm font-medium text-text-muted no-underline hover:text-text">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main id="conteudo" className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:py-12">
        {children}
      </main>
      <footer className="no-print border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-sm text-text-muted sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} {tenant.name}</p>
          <nav aria-label="Documentos legais" className="flex gap-4">
            <Link href="/termos" className="text-text-muted">Termos de uso</Link>
            <Link href="/privacidade" className="text-text-muted">Privacidade</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
