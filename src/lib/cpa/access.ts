import "server-only";
import { withTenant } from "@/lib/db";
import { can } from "@/lib/rbac";
import { activeEnrollmentWhere } from "@/lib/enrollments";
import type { Viewer } from "@/lib/session";
import { CPA_MODULE } from "./module";

export { CPA_MODULE };

export type CpaAccess = { allowed: boolean; staff: boolean; enrolled: boolean; reason?: "LOGIN" | "CONSENT" | "DISABLED" | "ENROLLMENT" };

/** Acesso ao ambiente do aluno: equipe pedagógica ou matrícula ativa no módulo do preparatório. */
export async function cpaAccess(viewer: Viewer | null): Promise<CpaAccess> {
  if (!viewer) return { allowed: false, staff: false, enrolled: false, reason: "LOGIN" };
  if (viewer.disabled) return { allowed: false, staff: false, enrolled: false, reason: "DISABLED" };
  if (viewer.needsConsent) return { allowed: false, staff: false, enrolled: false, reason: "CONSENT" };
  const staff = can(viewer.roles, "content:manage");
  const enrolled = Boolean(
    await withTenant(viewer.tenant.id, (tx) =>
      tx.enrollment.findFirst({
        where: { tenantId: viewer.tenant.id, userId: viewer.user.id, module: { slug: CPA_MODULE.slug }, ...activeEnrollmentWhere() },
        select: { id: true },
      }),
    ),
  );
  return { allowed: staff || enrolled, staff, enrolled, reason: staff || enrolled ? undefined : "ENROLLMENT" };
}
