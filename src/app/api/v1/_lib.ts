import "server-only";
import { NextResponse } from "next/server";
import { getViewer, type Viewer } from "@/lib/session";
import { can, type Permission } from "@/lib/rbac";

/** Erros no formato RFC 9457 (application/problem+json). */
export function problem(status: number, title: string, detail?: string) {
  return NextResponse.json({ type: "about:blank", title, status, detail }, { status, headers: { "Content-Type": "application/problem+json" } });
}

export async function guard(permission?: Permission): Promise<Viewer | NextResponse> {
  const viewer = await getViewer();
  if (!viewer || viewer.disabled) return problem(401, "Não autenticado");
  if (permission && !can(viewer.roles, permission)) return problem(403, "Sem permissão");
  return viewer;
}
