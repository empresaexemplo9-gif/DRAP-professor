import { getTenantTheme } from "@/theme/server";
import { getViewer } from "@/lib/session";
import { withTenant } from "@/lib/db";
import { ROLE_LABELS } from "@/lib/rbac";
import { BUSINESS_COURSE, BUSINESS_COURSE_PATH } from "@/lib/courses/business-management";
import { CampusFooter, CampusSidebar, CampusTopbar } from "./CampusChrome";

export async function PublicShell({ children }: { children: React.ReactNode }) {
  const { tenant, logoUrl } = await getTenantTheme();
  const viewer = await getViewer();
  const { levels, hasBusinessCourse } = await withTenant(tenant.id, async (tx) => {
    const levels = await tx.level.findMany({
      where: { tenantId: tenant.id, active: true },
      orderBy: { order: "asc" },
      select: { slug: true, label: true },
    });
    const hasBusinessCourse = Boolean(
      await tx.module.findFirst({
        where: {
          tenantId: tenant.id,
          slug: BUSINESS_COURSE.slug,
          status: "PUBLICADO",
          level: { slug: "cursos", active: true },
          segment: { slug: BUSINESS_COURSE.segment.slug },
        },
        select: { id: true },
      }),
    );
    return { levels, hasBusinessCourse };
  });
  const items = [
    { href: "/", label: "Início", icon: "home" },
    { href: "/#formacoes", label: "Nossas formações", icon: "graduation" },
    ...(hasBusinessCourse ? [{ href: BUSINESS_COURSE_PATH, label: "Gestão de Empresas", icon: "layers" }] : []),
    { href: "/#biblioteca", label: "Biblioteca de saberes", icon: "openbook" },
    { href: "/#metodologia", label: "Proposta pedagógica", icon: "layers" },
    { href: "/#comunidade", label: "Nossa comunidade", icon: "users" },
    { href: viewer ? "/painel" : "/entrar", label: "Portal do aluno", icon: "book" },
  ];
  const props = { name: tenant.name, logoUrl, items };
  return (
    <div className="campus-layout min-h-dvh lg:grid lg:grid-cols-[224px_minmax(0,1fr)]">
      <CampusSidebar {...props} />
      <div className="flex min-w-0 flex-col">
        <CampusTopbar
          {...props}
          levels={levels}
          user={
            viewer
              ? { name: viewer.user.name, role: viewer.roles.map((role) => ROLE_LABELS[role]).join(" · ") }
              : undefined
          }
        />
        <main id="conteudo" className="min-w-0 flex-1 px-5 py-8 sm:px-8">
          {children}
        </main>
        <CampusFooter name={tenant.name} />
      </div>
    </div>
  );
}
