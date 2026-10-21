import Link from "next/link";
import type { Viewer } from "@/lib/session";
import { navFor, ROLE_LABELS } from "@/lib/rbac";
import { FINANCIAL_COURSE_PATH } from "@/lib/courses/financial-consulting";
import { BUSINESS_COURSE_PATH } from "@/lib/courses/business-management";
import { SignOutButton } from "./SignOutButton";
import { CampusFooter, CampusSidebar, CampusTopbar } from "./CampusChrome";

export function AppShell({
  viewer,
  logoUrl,
  children,
  hasBusinessCourse = false,
  hasFinancialCourse = false,
  isCompanyManager = false,
}: {
  viewer: Viewer;
  logoUrl: string | null;
  children: React.ReactNode;
  hasBusinessCourse?: boolean;
  hasFinancialCourse?: boolean;
  isCompanyManager?: boolean;
}) {
  const items = navFor(viewer.roles).map(({ href, label, icon }) => ({ href, label, icon }));
  if (hasBusinessCourse)
    items.splice(3, 0, { href: BUSINESS_COURSE_PATH, label: "Gestão de Empresas", icon: "layers" });
  if (hasFinancialCourse)
    items.splice(hasBusinessCourse ? 4 : 3, 0, {
      href: FINANCIAL_COURSE_PATH,
      label: "Consultoria Financeira",
      icon: "book",
    });
  // Gestor de empresa cliente (Enterprise): aba logo após "Meu Aprendizado".
  if (isCompanyManager) items.splice(2, 0, { href: "/painel/empresa", label: "Minha empresa", icon: "briefcase" });
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
