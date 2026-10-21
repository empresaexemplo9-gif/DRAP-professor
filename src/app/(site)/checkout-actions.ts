"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getViewer } from "@/lib/session";
import { withTenant } from "@/lib/db";
import { createPixCharge } from "@/lib/payments/asaas";
import { isPastEnd } from "@/lib/enrollments";

export type PixCheckoutActionState = { error?: string };

export async function startPixCheckout(_: PixCheckoutActionState, formData: FormData): Promise<PixCheckoutActionState> {
  const viewer = await getViewer();
  if (!viewer || viewer.disabled) return { error: "Entre na sua conta para se matricular." };
  if (viewer.needsConsent) return { error: "Aceite os termos da plataforma antes de comprar." };
  if (!process.env.ASAAS_API_KEY || !process.env.ASAAS_WEBHOOK_TOKEN) {
    return { error: "O pagamento por Pix ainda não foi configurado. Tente novamente mais tarde." };
  }
  const moduleId = z.string().uuid().safeParse(formData.get("moduleId"));
  if (!moduleId.success) return { error: "Curso inválido." };

  const tenantId = viewer.tenant.id;
  const course = await withTenant(tenantId, async (tx) => {
    const mod = await tx.module.findFirst({
      where: { id: moduleId.data, tenantId, status: "PUBLICADO" },
      select: { id: true, title: true, priceCents: true, audience: true, level: { select: { slug: true } }, segment: { select: { slug: true } }, slug: true },
    });
    if (!mod) return null;
    const enrollment = await tx.enrollment.findUnique({ where: { userId_moduleId: { userId: viewer.user.id, moduleId: mod.id } }, select: { status: true, endsAt: true } });
    if (enrollment?.status === "ATIVA" && !isPastEnd(enrollment)) return { ...mod, alreadyEnrolled: true };
    return { ...mod, alreadyEnrolled: false };
  });
  if (!course) return { error: "Este curso não está disponível para matrícula." };
  const coursePath = `/${course.level.slug}/${course.segment.slug}/${course.slug}`;
  if (course.alreadyEnrolled) redirect(coursePath);
  if (course.audience === "EMPRESA") return { error: "Este treinamento é contratado pela empresa. Solicite uma proposta em Para empresas." };
  if (!course.priceCents || course.priceCents < 100) return { error: "Este curso ainda não tem preço configurado." };

  const now = new Date();
  let checkout: { id: string; reused: boolean; ready: boolean };
  try {
    checkout = await withTenant(tenantId, async (tx) => {
      // Serializa dois cliques/dispositivos do mesmo aluno para evitar cobranças Pix duplicadas.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`${tenantId}:${viewer.user.id}:${course.id}`}, 0))`;
      await tx.pixCheckout.updateMany({
        where: { tenantId, userId: viewer.user.id, moduleId: course.id, status: "PENDING", expiresAt: { lte: now } },
        data: { status: "EXPIRED" },
      });
      const existing = await tx.pixCheckout.findFirst({
        where: { tenantId, userId: viewer.user.id, moduleId: course.id, status: "PENDING", expiresAt: { gt: now } },
        select: { id: true, providerPaymentId: true },
      });
      if (existing) return { id: existing.id, reused: true, ready: Boolean(existing.providerPaymentId) };
      const created = await tx.pixCheckout.create({
        data: { tenantId, userId: viewer.user.id, moduleId: course.id, amountCents: course.priceCents!, expiresAt: new Date(Date.now() + 30 * 60 * 1000) },
        select: { id: true },
      });
      return { ...created, reused: false, ready: false };
    });
  } catch {
    return { error: "Não foi possível iniciar o pagamento. Tente novamente." };
  }
  if (checkout.reused) {
    if (checkout.ready) redirect(`/checkout/pix/${checkout.id}`);
    return { error: "Já estamos preparando um Pix para este curso. Aguarde alguns segundos e tente novamente." };
  }

  try {
    const pix = await createPixCharge({
      checkoutId: checkout.id,
      userId: viewer.user.id,
      name: viewer.user.name,
      email: viewer.user.email,
      moduleTitle: course.title,
      amountCents: course.priceCents,
    });
    await withTenant(tenantId, (tx) => tx.pixCheckout.update({
      where: { id: checkout.id },
      data: { providerPaymentId: pix.providerPaymentId, pixPayload: pix.payload, pixImageDataUrl: pix.imageDataUrl, expiresAt: pix.expiresAt },
    }));
  } catch {
    await withTenant(tenantId, (tx) => tx.pixCheckout.updateMany({ where: { id: checkout.id, status: "PENDING" }, data: { status: "FAILED" } }));
    return { error: "O Pix não pôde ser gerado agora. Nenhuma matrícula foi liberada; tente novamente." };
  }
  redirect(`/checkout/pix/${checkout.id}`);
}
