import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getViewer } from "@/lib/session";
import { withTenant } from "@/lib/db";
import { can } from "@/lib/rbac";
import { activeEnrollmentWhere } from "@/lib/enrollments";
import { managesCompanyCourse } from "@/lib/catalog";
import { TEAM_COURSE, TEAM_COURSE_LEVEL } from "@/lib/courses/team-schedules";

export const runtime = "nodejs";

export async function GET() {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Entre na sua conta para acessar a apostila." }, { status: 401 });
  if (viewer.disabled || viewer.needsConsent) return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
  const course = await withTenant(viewer.tenant.id, (tx) =>
    tx.module.findFirst({
      where: { tenantId: viewer.tenant.id, slug: TEAM_COURSE.slug, status: "PUBLICADO", level: { slug: TEAM_COURSE_LEVEL, active: true }, segment: { slug: TEAM_COURSE.segment.slug } },
      select: { id: true },
    }),
  );
  if (!course) return NextResponse.json({ error: "Treinamento não encontrado." }, { status: 404 });
  // Acesso: vaga ativa (matrícula LICENCA ou outra ativa), gestor da empresa contratante ou equipe pedagógica.
  const allowed =
    can(viewer.roles, "content:manage") ||
    Boolean(
      await withTenant(viewer.tenant.id, (tx) =>
        tx.enrollment.findFirst({ where: { tenantId: viewer.tenant.id, moduleId: course.id, userId: viewer.user.id, ...activeEnrollmentWhere() }, select: { id: true } }),
      ),
    ) ||
    (await managesCompanyCourse(viewer.tenant.id, viewer.user.id, course.id));
  if (!allowed) return NextResponse.json({ error: "A apostila é exclusiva para equipes de empresas contratantes." }, { status: 403 });
  const file = await readFile(path.join(process.cwd(), "content/courses/gestao-justa-de-equipes/source.docx"));
  return new NextResponse(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="gestao-justa-de-equipes-e-escalas.docx"; filename*=UTF-8''${encodeURIComponent("Curso livre - Gestão justa de equipes e escalas.docx")}`,
      "Cache-Control": "private, no-store",
    },
  });
}
