import { NextResponse, type NextRequest } from "next/server";
import { withTenant } from "@/lib/db";
import { can } from "@/lib/rbac";
import { guard, problem } from "../_lib";

/** GET /api/v1/modules?level=cursos&segment=financas&cursor=<id>&limit=20 */
export async function GET(req: NextRequest) {
  const v = await guard("learn:study");
  if (v instanceof NextResponse) return v;
  const sp = req.nextUrl.searchParams;
  const limit = Math.min(Number(sp.get("limit") ?? 20) || 20, 100);
  const cursor = sp.get("cursor");
  if (cursor && !/^[0-9a-f-]{36}$/i.test(cursor)) return problem(400, "Cursor inválido");
  const staff = can(v.roles, "content:manage");
  const rows = await withTenant(v.tenant.id, (tx) =>
    tx.module.findMany({
      where: {
        tenantId: v.tenant.id,
        ...(staff ? {} : { status: "PUBLICADO" }),
        ...(sp.get("level") ? { level: { slug: sp.get("level")! } } : {}),
        ...(sp.get("segment") ? { segment: { slug: sp.get("segment")! } } : {}),
      },
      orderBy: { id: "asc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: { id: true, title: true, slug: true, summary: true, status: true, workloadMinutes: true, certificateType: true, level: { select: { slug: true, kind: true } }, segment: { select: { slug: true, name: true } } },
    }),
  );
  const data = rows.slice(0, limit);
  return NextResponse.json({ data, nextCursor: rows.length > limit ? data[data.length - 1]?.id : null });
}
