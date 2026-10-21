import { NextResponse } from "next/server";
import { getViewer } from "@/lib/session";
import { withTenant } from "@/lib/db";
import { syncPixCheckout } from "@/lib/payments/asaas";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await getViewer();
  if (!viewer || viewer.disabled) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const checkout = await withTenant(viewer.tenant.id, (tx) => tx.pixCheckout.findFirst({
    where: { id, userId: viewer.user.id },
    select: { id: true, status: true, module: { select: { level: { select: { slug: true } }, segment: { select: { slug: true } }, slug: true } }, expiresAt: true },
  }));
  if (!checkout) return NextResponse.json({ error: "not_found" }, { status: 404 });
  let status = checkout.status;
  if (status === "PENDING") {
    status = (await syncPixCheckout(viewer.tenant.id, checkout.id)) ?? "PENDING";
  }
  if (status === "PENDING" && checkout.expiresAt && checkout.expiresAt <= new Date()) status = "EXPIRED";
  const coursePath = `/${checkout.module.level.slug}/${checkout.module.segment.slug}/${checkout.module.slug}`;
  return NextResponse.json({ status, coursePath, expiresAt: checkout.expiresAt?.toISOString() ?? null }, { headers: { "Cache-Control": "no-store" } });
}
