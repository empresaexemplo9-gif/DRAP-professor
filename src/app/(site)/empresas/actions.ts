"use server";
import { z } from "zod";
import { withTenant } from "@/lib/db";
import { getTenant } from "@/lib/tenant";
import { sendEmail } from "@/lib/email";

export type LeadState = { error?: string; ok?: boolean; fieldErrors?: Record<string, string> };

const leadSchema = z.object({
  company: z.string().trim().min(2, "Informe a empresa").max(120),
  contactName: z.string().trim().min(2, "Informe seu nome").max(120),
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  phone: z.string().trim().max(30).optional().transform((v) => v || null),
  teamSize: z.preprocess((v) => (v === "" || v == null ? null : v), z.coerce.number().int().min(1, "Mínimo 1").max(1_000_000).nullable()),
  interests: z.array(z.string().trim().max(80)).max(30),
  message: z.string().trim().max(2000).optional().transform((v) => v || null),
});

export async function requestProposalAction(_: LeadState, fd: FormData): Promise<LeadState> {
  // Campo invisível: robôs preenchem, pessoas não.
  if (String(fd.get("website") ?? "").trim()) return { ok: true };
  const parsed = leadSchema.safeParse({
    company: fd.get("company"),
    contactName: fd.get("contactName"),
    email: fd.get("email"),
    phone: fd.get("phone") ?? undefined,
    teamSize: fd.get("teamSize"),
    interests: fd.getAll("interests").map(String),
    message: fd.get("message") ?? undefined,
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { error: "Revise os campos destacados.", fieldErrors };
  }
  const tenant = await getTenant();
  const recent = await withTenant(tenant.id, (tx) =>
    tx.enterpriseLead.count({ where: { tenantId: tenant.id, email: parsed.data.email, createdAt: { gt: new Date(Date.now() - 10 * 60 * 1000) } } }),
  );
  if (recent >= 3) return { ok: true };
  await withTenant(tenant.id, (tx) => tx.enterpriseLead.create({ data: { tenantId: tenant.id, ...parsed.data } }));
  const notify = process.env.ENTERPRISE_LEADS_EMAIL ?? process.env.SEED_ADMIN_EMAIL;
  if (notify) {
    await sendEmail(
      notify,
      `Novo pedido de proposta Enterprise: ${parsed.data.company}`,
      `${parsed.data.contactName} <${parsed.data.email}>${parsed.data.phone ? ` · ${parsed.data.phone}` : ""}\nEquipe: ${parsed.data.teamSize ?? "não informado"}\nInteresses: ${parsed.data.interests.join(", ") || "—"}\n\n${parsed.data.message ?? ""}\n\nVeja em Painel › Empresas › Pedidos de proposta.`,
    );
  }
  return { ok: true };
}
