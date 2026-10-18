"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getViewer } from "@/lib/session";

/** Encerra uma sessão do próprio usuário (nunca a atual, nunca de outra pessoa). */
export async function revokeSessionAction(sessionId: string) {
  const viewer = await getViewer();
  if (!viewer) return;
  const id = z.string().min(1).parse(sessionId);
  if (id === viewer.sessionId) return;
  await prisma.session.deleteMany({ where: { id, userId: viewer.user.id } });
  revalidatePath("/painel/conta");
}

export async function revokeOtherSessionsAction() {
  const viewer = await getViewer();
  if (!viewer) return;
  await prisma.session.deleteMany({ where: { userId: viewer.user.id, id: { not: viewer.sessionId } } });
  revalidatePath("/painel/conta");
}
