import { NextResponse } from "next/server";
import { withTenant } from "@/lib/db";
import { can } from "@/lib/rbac";
import { guard, problem } from "../../../_lib";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const v = await guard("learn:study");
  if (v instanceof NextResponse) return v;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return problem(400, "Identificador inválido");
  const staff = can(v.roles, "content:manage");
  const data = await withTenant(v.tenant.id, (tx) =>
    tx.topic.findMany({
      where: { tenantId: v.tenant.id, moduleId: id, ...(staff ? {} : { status: "PUBLICADO", module: { status: "PUBLICADO" } }) },
      orderBy: { order: "asc" },
      select: { id: true, title: true, slug: true, order: true, durationMinutes: true, status: true },
    }),
  );
  return NextResponse.json({ data });
}
