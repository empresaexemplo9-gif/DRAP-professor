import { redirect } from "next/navigation";
import { requireViewer } from "@/lib/session";
import { getTenantTheme } from "@/theme/server";
import { withTenant } from "@/lib/db";
import { FINANCIAL_COURSE } from "@/lib/courses/financial-consulting";
import { BUSINESS_COURSE } from "@/lib/courses/business-management";
import { AppShell } from "@/components/shell/AppShell";

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireViewer();
  if (viewer.needsConsent) redirect("/aceite");
  const { logoUrl } = await getTenantTheme();
  const hasBusinessCourse = await withTenant(viewer.tenant.id, async (tx) =>
    Boolean(
      await tx.module.findFirst({
        where: {
          tenantId: viewer.tenant.id,
          slug: BUSINESS_COURSE.slug,
          status: "PUBLICADO",
          level: { slug: "cursos", active: true },
          segment: { slug: BUSINESS_COURSE.segment.slug },
        },
        select: { id: true },
      }),
    ),
  );
  const hasFinancialCourse = await withTenant(viewer.tenant.id, async (tx) =>
    Boolean(
      await tx.module.findFirst({
        where: {
          tenantId: viewer.tenant.id,
          slug: FINANCIAL_COURSE.slug,
          status: "PUBLICADO",
          level: { slug: "cursos", active: true },
          segment: { slug: FINANCIAL_COURSE.segment.slug },
        },
        select: { id: true },
      }),
    ),
  );
  return (
    <AppShell
      viewer={viewer}
      logoUrl={logoUrl}
      hasBusinessCourse={hasBusinessCourse}
      hasFinancialCourse={hasFinancialCourse}
    >
      {children}
    </AppShell>
  );
}
