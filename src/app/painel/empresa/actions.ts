"use server";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { withTenant } from "@/lib/db";
import { clientIp, getViewer } from "@/lib/session";
import { audit } from "@/lib/audit";
import { sendEmail } from "@/lib/email";
import { canReleaseSeat, parseEmailList } from "@/lib/enterprise";
import { assertOrgManager, assignSeats } from "@/lib/enterprise-server";

export type SeatState = { error?: string; ok?: boolean; message?: string; details?: string[] };

const MAX_BATCH = 500;

async function baseUrl() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  return host ? `${h.get("x-forwarded-proto") ?? "https"}://${host}` : (process.env.BETTER_AUTH_URL ?? "");
}

function refresh(organizationId: string) {
  revalidatePath("/painel/empresa");
  revalidatePath(`/painel/empresas/${organizationId}`);
  revalidatePath("/painel/empresas");
}

export async function assignSeatsAction(_: SeatState, fd: FormData): Promise<SeatState> {
  const poolId = z.string().uuid().safeParse(fd.get("poolId"));
  if (!poolId.success) return { error: "Contrato inválido." };
  const { valid, invalid } = parseEmailList(String(fd.get("emails") ?? ""));
  if (!valid.length) return { error: invalid.length ? `Nenhum e-mail válido. Verifique: ${invalid.slice(0, 5).join(", ")}` : "Informe ao menos um e-mail." };
  if (valid.length > MAX_BATCH) return { error: `Envie no máximo ${MAX_BATCH} e-mails por vez.` };
  const team = z.string().trim().max(80).optional().transform((v) => v || null).safeParse(fd.get("team") ?? undefined);
  if (!team.success) return { error: "O nome da equipe aceita até 80 caracteres." };

  // O contrato informa a empresa; a permissão é checada contra ela, nunca contra o formulário.
  const probe = await getViewer();
  if (!probe) return { error: "Entre novamente." };
  const pool = await withTenant(probe.tenant.id, (tx) =>
    tx.licensePool.findFirst({
      where: { id: poolId.data, tenantId: probe.tenant.id },
      select: { organizationId: true, organization: { select: { name: true } }, module: { select: { title: true } } },
    }),
  );
  if (!pool) return { error: "Contrato não encontrado." };
  let viewer;
  try {
    viewer = await assertOrgManager(pool.organizationId);
  } catch {
    return { error: "Você não tem permissão para gerenciar esta empresa." };
  }

  const result = await assignSeats({ tenantId: viewer.tenant.id, poolId: poolId.data, emails: valid, team: team.data, actorId: viewer.user.id, ip: await clientIp() });
  if ("error" in result) return { error: result.error };

  const url = await baseUrl();
  const course = pool.module.title;
  const company = pool.organization.name;
  await Promise.all([
    ...result.activated.map((email) =>
      sendEmail(email, `Seu acesso ao curso ${course}`, `${company} liberou para você o curso "${course}" em ${viewer.tenant.name}.\n\nAcesse: ${url}/painel/aprendizado`),
    ),
    ...result.invited.map((email) =>
      sendEmail(
        email,
        `Convite de ${company}: ${course}`,
        `${company} reservou para você uma vaga no curso "${course}" em ${viewer.tenant.name}.\n\nCrie sua conta usando este mesmo e-mail (${email}) em ${url}/cadastro — a vaga é ativada automaticamente no primeiro acesso.`,
      ),
    ),
  ]);
  refresh(pool.organizationId);
  const details = [
    ...result.skipped.map((s) => `${s.email}: ${s.reason}`),
    ...invalid.map((e) => `${e}: e-mail inválido`),
  ];
  const parts = [
    result.activated.length && `${result.activated.length} acesso(s) liberado(s)`,
    result.invited.length && `${result.invited.length} convite(s) enviado(s) para quem ainda não tem conta`,
    details.length && `${details.length} não atribuído(s)`,
  ].filter(Boolean);
  return { ok: result.activated.length + result.invited.length > 0, error: result.activated.length + result.invited.length === 0 ? "Nenhuma vaga foi atribuída." : undefined, message: `${parts.join(" · ")}.`, details };
}

export async function revokeSeatAction(_: SeatState, fd: FormData): Promise<SeatState> {
  const id = z.string().uuid().safeParse(fd.get("assignmentId"));
  if (!id.success) return { error: "Vaga inválida." };
  const probe = await getViewer();
  if (!probe) return { error: "Entre novamente." };
  const tenantId = probe.tenant.id;
  const assignment = await withTenant(tenantId, (tx) =>
    tx.licenseAssignment.findFirst({ where: { id: id.data, tenantId }, include: { pool: { select: { organizationId: true, moduleId: true } } } }),
  );
  if (!assignment) return { error: "Vaga não encontrada." };
  let viewer;
  try {
    viewer = await assertOrgManager(assignment.pool.organizationId);
  } catch {
    return { error: "Você não tem permissão para gerenciar esta empresa." };
  }
  if (assignment.status === "REVOGADO") return { ok: true, message: "Esta vaga já estava liberada." };
  const ip = await clientIp();
  const result = await withTenant(tenantId, async (tx): Promise<SeatState> => {
    const completedTopics = assignment.userId
      ? await tx.topicProgress.count({
          where: { status: "CONCLUIDO", topic: { status: "PUBLICADO" }, enrollment: { userId: assignment.userId, moduleId: assignment.pool.moduleId } },
        })
      : 0;
    if (!canReleaseSeat({ status: assignment.status, completedTopics })) {
      return { error: "Este colaborador já avançou no curso; a vaga não pode ser repassada. Fale com o suporte se precisar encerrar o acesso." };
    }
    await tx.licenseAssignment.update({ where: { id: assignment.id }, data: { status: "REVOGADO", revokedAt: new Date() } });
    if (assignment.userId) {
      await tx.enrollment.updateMany({
        where: { userId: assignment.userId, moduleId: assignment.pool.moduleId, origin: "LICENCA", status: "ATIVA" },
        data: { status: "CANCELADA" },
      });
    }
    await audit(tx, { tenantId, actorId: viewer.user.id, action: "licenca.vaga_liberada", entity: "LicenseAssignment", entityId: assignment.id, data: { email: assignment.email }, ip });
    return { ok: true, message: `Vaga de ${assignment.email} liberada.` };
  });
  if (result.ok) refresh(assignment.pool.organizationId);
  return result;
}
