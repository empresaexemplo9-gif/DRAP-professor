import Link from "next/link";
import type { Viewer } from "@/lib/session";
import { navFor, ROLE_LABELS } from "@/lib/rbac";
import { Brand } from "./Brand";
import { ThemeToggle } from "./ThemeToggle";
import { SignOutButton } from "./SignOutButton";
import { NavLinks } from "./NavLinks";
import { MobileNav } from "./MobileNav";

export function AppShell({ viewer, logoUrl, children }: { viewer: Viewer; logoUrl: string | null; children: React.ReactNode }) {
  const items = navFor(viewer.roles).map(({ href, label, icon }) => ({ href, label, icon }));
  const roleText = viewer.roles.map((r) => ROLE_LABELS[r]).join(" · ");
  const userBox = (
    <div className="space-y-3 border-t border-border p-4">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-text">{viewer.user.name}</p>
        <p className="truncate text-xs text-text-muted">{roleText}</p>
      </div>
      <ThemeToggle />
      <div className="flex gap-3 text-sm">
        <Link href="/painel/conta" className="text-text-muted hover:text-text">Minha conta</Link>
        <SignOutButton className="text-text-muted hover:text-text" />
      </div>
    </div>
  );
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[17rem_1fr]">
      <aside className="no-print sticky top-0 hidden h-dvh flex-col border-r border-border bg-surface lg:flex">
        <div className="p-4">
          <Brand name={viewer.tenant.name} logoUrl={logoUrl} />
        </div>
        <nav aria-label="Menu principal" className="flex-1 overflow-y-auto px-3">
          <NavLinks items={items} />
        </nav>
        {userBox}
      </aside>
      <div className="min-w-0">
        <header className="no-print sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border bg-bg/90 px-4 py-3 backdrop-blur lg:hidden">
          <Brand name={viewer.tenant.name} logoUrl={logoUrl} />
          <MobileNav items={items}>{userBox}</MobileNav>
        </header>
        <main id="conteudo" className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8 sm:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
