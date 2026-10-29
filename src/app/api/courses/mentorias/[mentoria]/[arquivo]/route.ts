import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getViewer } from "@/lib/session";
import { withTenant } from "@/lib/db";
import { can } from "@/lib/rbac";
import { activeEnrollmentWhere } from "@/lib/enrollments";
import { managesCompanyCourse } from "@/lib/catalog";
import { FINANCIAL_MENTORSHIPS, MENTORSHIP_LEVEL, MENTORSHIP_SEGMENT } from "@/lib/mentorships";
import { MENTORSHIP_CONTENT } from "@/lib/courses/mentorship-content";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ mentoria: string; arquivo: string }> }) {
  const { mentoria, arquivo } = await params;
  const m = FINANCIAL_MENTORSHIPS.find((x) => x.key === mentoria);
  const download = m && MENTORSHIP_CONTENT[m.key]?.downloads.find((d) => d.id === arquivo);
  if (!m || !download) return NextResponse.json({ error: "Material não encontrado." }, { status: 404 });
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Entre na sua conta para acessar a apostila." }, { status: 401 });
  if (viewer.disabled || viewer.needsConsent) return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
  const course = await withTenant(viewer.tenant.id, (tx) =>
    tx.module.findFirst({
      where: { tenantId: viewer.tenant.id, slug: m.slug, status: "PUBLICADO", level: { slug: MENTORSHIP_LEVEL, active: true }, segment: { slug: MENTORSHIP_SEGMENT.slug } },
      select: { id: true },
    }),
  );
  if (!course) return NextResponse.json({ error: "Mentoria não encontrada." }, { status: 404 });
  const isStaff = can(viewer.roles, "content:manage");
  // Arquivos com gabarito de uso docente ficam restritos à equipe pedagógica.
  if (download.audience === "docente" && !isStaff)
    return NextResponse.json({ error: "Este arquivo contém gabaritos de uso docente." }, { status: 403 });
  // Participantes: vaga ativa da empresa contratante, gestor da empresa ou equipe pedagógica.
  const allowed =
    isStaff ||
    Boolean(
      await withTenant(viewer.tenant.id, (tx) =>
        tx.enrollment.findFirst({ where: { tenantId: viewer.tenant.id, moduleId: course.id, userId: viewer.user.id, ...activeEnrollmentWhere() }, select: { id: true } }),
      ),
    ) ||
    (await managesCompanyCourse(viewer.tenant.id, viewer.user.id, course.id));
  if (!allowed) return NextResponse.json({ error: "A apostila é exclusiva para empresas participantes da mentoria." }, { status: 403 });
  const file = await readFile(path.join(process.cwd(), MENTORSHIP_CONTENT[m.key]!.dir, download.file));
  const ascii = `${m.slug}.${download.file.split(".").pop()}`;
  return new NextResponse(new Uint8Array(file), {
    headers: {
      "Content-Type": download.contentType,
      "Content-Disposition": `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(download.fileName)}`,
      "Cache-Control": "private, no-store",
    },
  });
}
