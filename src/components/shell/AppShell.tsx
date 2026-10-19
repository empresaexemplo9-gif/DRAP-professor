import Link from "next/link";
import type { Viewer } from "@/lib/session";
import { navFor, ROLE_LABELS } from "@/lib/rbac";
import { SignOutButton } from "./SignOutButton";
import { CampusFooter, CampusSidebar, CampusTopbar } from "./CampusChrome";

export function AppShell({
  viewer,
  logoUrl,
  children,
}: {
  viewer: Viewer;
  logoUrl: string | null;
  children: React.ReactNode;
}) {
  const items = navFor(viewer.roles).map(({ href, label, icon }) => ({ href, label, icon }));
  const account = (
    <div className="mb-4 flex items-center justify-between gap-3 text-xs">
      <Link href="/painel/conta" className="text-text-muted">
        Minha conta
      </Link>
      <SignOutButton className="text-text-muted hover:text-text" />
    </div>
  );
  const props = { name: viewer.tenant.name, logoUrl, items, account };
  return (
    <div className="campus-layout min-h-dvh lg:grid lg:grid-cols-[224px_minmax(0,1fr)]">
      <CampusSidebar {...props} />
      <div className="flex min-w-0 flex-col">
        <CampusTopbar
          {...props}
          user={{ name: viewer.user.name, role: viewer.roles.map((role) => ROLE_LABELS[role]).join(" · ") }}
        />
        <main id="conteudo" className="min-w-0 flex-1 px-5 py-8 sm:px-8">
          {children}
        </main>
        <CampusFooter name={viewer.tenant.name} />
      </div>
    </div>
  );
}
