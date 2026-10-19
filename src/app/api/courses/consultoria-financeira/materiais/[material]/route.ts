import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getViewer } from "@/lib/session";
import { withTenant } from "@/lib/db";
import { can } from "@/lib/rbac";
import { FINANCIAL_COURSE } from "@/lib/courses/financial-consulting";

export const runtime = "nodejs";

const MATERIALS = {
  apostila: { file: "apostila.docx", name: "Consultoria Financeira - Apostila.docx" },
  caderno: { file: "caderno.docx", name: "Consultoria Financeira - Caderno de Exercicios.docx" },
} as const;

export async function GET(_: Request, { params }: { params: Promise<{ material: string }> }) {
  const { material } = await params;
  if (!(material in MATERIALS)) return NextResponse.json({ error: "Material não encontrado." }, { status: 404 });
  const asset = MATERIALS[material as keyof typeof MATERIALS];
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Entre na sua conta para acessar a apostila." }, { status: 401 });
  if (viewer.disabled || viewer.needsConsent)
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
  const allowed = await withTenant(viewer.tenant.id, async (tx) => {
    const course = await tx.module.findFirst({
      where: {
        tenantId: viewer.tenant.id,
        slug: FINANCIAL_COURSE.slug,
        status: "PUBLICADO",
        level: { slug: "cursos", active: true },
        segment: { slug: FINANCIAL_COURSE.segment.slug },
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
  const file = await readFile(path.join(process.cwd(), "content/courses/consultoria-financeira/originals", asset.file));
  return new NextResponse(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${asset.file}"; filename*=UTF-8''${encodeURIComponent(asset.name)}`,
      "Cache-Control": "private, no-store",
    },
  });
}
