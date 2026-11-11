"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getTenant } from "@/lib/tenant";
import { clientIp } from "@/lib/session";
import { sendEmail } from "@/lib/email";
import { parseEmailList } from "@/lib/enterprise";
import { acceptProposal, assignProposalSeats, proposalPath, requestBaseUrl } from "@/lib/proposals-server";

export type AcceptState = { error?: string; ok?: boolean };

const token = z.string().regex(/^[A-Za-z0-9_-]{20,64}$/);

/** Aceite da proposta pelo cliente: cria empresa, contratos de vagas e, se informados, as matrículas da equipe. */
export async function acceptProposalAction(_: AcceptState, fd: FormData): Promise<AcceptState> {
  const t = token.safeParse(fd.get("token"));
  if (!t.success) return { error: "Proposta inválida." };
  const name = z.string().trim().min(3).max(120).safeParse(fd.get("name"));
  if (!name.success) return { error: "Informe o nome completo de quem aceita a proposta." };
  const seats = z.coerce.number().int().min(1).max(100_000).safeParse(fd.get("seats"));
  if (!seats.success) return { error: "Informe o número de participantes." };
  if (fd.get("agree") !== "on") return { error: "Marque a confirmação de aceite para continuar." };
  const { valid, invalid } = parseEmailList(String(fd.get("emails") ?? ""));
  if (invalid.length) return { error: `Verifique estes e-mails: ${invalid.slice(0, 5).join(", ")}` };
  if (valid.length > seats.data) return { error: `Há ${valid.length} e-mails para ${seats.data} vaga(s). Aumente o número de participantes ou reduza a lista.` };

  const tenant = await getTenant();
  const ip = await clientIp();
  const result = await acceptProposal(tenant.id, t.data, { name: name.data, seats: seats.data, ip });
  if ("error" in result) return { error: result.error };

  const url = await requestBaseUrl();
  if (valid.length) {
    const { activated, invited } = await assignProposalSeats(tenant.id, result.pools, valid, ip);
    const courses = result.pools.map((p) => `"${p.title}"`).join(", ");
    await Promise.all([
      ...activated.map((email) => sendEmail(email, `Seu acesso em ${tenant.name}`, `Sua empresa liberou para você: ${courses}.\n\nAcesse: ${url}/painel/aprendizado`)),
      ...invited.map((email) =>
        sendEmail(email, `Convite para estudar em ${tenant.name}`, `Sua empresa reservou para você uma vaga em: ${courses}.\n\nCrie sua conta usando este mesmo e-mail (${email}) em ${url}/cadastro — a matrícula é ativada no primeiro acesso.`),
      ),
    ]);
  }
  const notify = process.env.ENTERPRISE_LEADS_EMAIL || process.env.SEED_ADMIN_EMAIL;
  if (notify) {
    await sendEmail(
      notify,
      `Proposta aceita por ${name.data}`,
      `A proposta foi aceita com ${seats.data} vaga(s) em ${result.pools.length} curso(s). A empresa e os contratos foram criados com pagamento pendente.\n\nConfirme o pagamento em: ${url}/painel/empresas/${result.organizationId}`,
    );
  }
  revalidatePath(proposalPath(t.data));
  revalidatePath("/painel/empresas");
  return { ok: true };
}
