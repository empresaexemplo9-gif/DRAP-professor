import { NextResponse } from "next/server";
import { withTenant } from "@/lib/db";
import { guard } from "../_lib";

export async function GET() {
  const v = await guard("learn:study");
  if (v instanceof NextResponse) return v;
  const data = await withTenant(v.tenant.id, (tx) =>
    tx.level.findMany({ where: { tenantId: v.tenant.id }, orderBy: { order: "asc" }, select: { id: true, kind: true, label: true, slug: true, description: true, active: true } }),
  );
  return NextResponse.json({ data });
}
