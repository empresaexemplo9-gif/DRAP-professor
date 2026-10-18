import { NextResponse } from "next/server";
import { guard } from "../_lib";

export async function GET() {
  const v = await guard();
  if (v instanceof NextResponse) return v;
  return NextResponse.json({ user: { id: v.user.id, name: v.user.name, email: v.user.email }, tenant: v.tenant, roles: v.roles });
}
