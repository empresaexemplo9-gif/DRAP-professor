import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getViewer } from "@/lib/session";
import { withTenant } from "@/lib/db";
import { can } from "@/lib/rbac";
import { BUSINESS_COURSE } from "@/lib/courses/business-management";

export const runtime = "nodejs";

export async function GET() {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Entre na sua conta para acessar a apostila." }, { status: 401 });
  if (viewer.disabled || viewer.needsConsent)
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
  const allowed = await withTenant(viewer.tenant.id, async (tx) => {
    const course = await tx.module.findFirst({
      where: {
        tenantId: viewer.tenant.id,
        slug: BUSINESS_COURSE.slug,
        status: "PUBLICADO",
        level: { slug: "cursos", active: true },
        segment: { slug: BUSINESS_COURSE.segment.slug },
      },
      select: { id: true },
    });
    if (!course) return null;
    if (can(viewer.roles, "content:manage")) return true;
    return Boolean(
      await tx.enrollment.findFirst({
        where: { tenantId: viewer.tenant.id, moduleId: course.id, userId: viewer.user.id, status: "ATIVA" },
        select: { id: true },
      }),
    );
  });
  if (allowed === null) return NextResponse.json({ error: "Curso não encontrado." }, { status: 404 });
  if (!allowed)
    return NextResponse.json({ error: "A apostila é exclusiva para alunos matriculados." }, { status: 403 });
  const file = await readFile(path.join(process.cwd(), "content/courses/gestao-de-empresas/source.docx"));
  return new NextResponse(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="gestao-de-empresas-apostila.docx"; filename*=UTF-8''${encodeURIComponent("Curso Livre de Gestão de Empresas — Apostila Completa.docx")}`,
      "Cache-Control": "private, no-store",
    },
  });
}
