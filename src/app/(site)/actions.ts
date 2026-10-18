"use server";
import { revalidatePath } from "next/cache";
import { withTenant } from "@/lib/db";
import { getViewer } from "@/lib/session";

export async function markTopicAction(formData: FormData) {
  const viewer = await getViewer();
  if (!viewer) return;
  const topicId = String(formData.get("topicId"));
  const done = formData.get("done") === "1";
  const path = String(formData.get("path") ?? "/");
  await withTenant(viewer.tenant.id, async (tx) => {
    const topic = await tx.topic.findFirst({ where: { id: topicId, tenantId: viewer.tenant.id, status: "PUBLICADO" } });
    if (!topic) return;
    const enrollment = await tx.enrollment.findUnique({ where: { userId_moduleId: { userId: viewer.user.id, moduleId: topic.moduleId } } });
    if (!enrollment || enrollment.status !== "ATIVA") return;
    await tx.topicProgress.upsert({
      where: { enrollmentId_topicId: { enrollmentId: enrollment.id, topicId } },
      create: {
        tenantId: viewer.tenant.id,
        enrollmentId: enrollment.id,
        topicId,
        status: done ? "CONCLUIDO" : "EM_ANDAMENTO",
        percent: done ? 100 : 0,
        completedAt: done ? new Date() : null,
      },
      update: { status: done ? "CONCLUIDO" : "EM_ANDAMENTO", percent: done ? 100 : 0, completedAt: done ? new Date() : null },
    });
  });
  revalidatePath(path);
}
