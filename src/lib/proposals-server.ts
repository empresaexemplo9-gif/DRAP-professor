import "server-only";
import { randomBytes } from "node:crypto";
import { headers } from "next/headers";
import type { Prisma, Proposal } from "@prisma/client";
import { withTenant, type Tx } from "./db";
import { audit } from "./audit";
import { sendEmail } from "./email";
import { assignSeats } from "./enterprise-server";
import { proposalEmail } from "./proposal-email";
import { buildProposalItems, proposalCode, proposalTotals, proposalValidUntil, readProposalItems, type ProposalModule } from "./proposals";

/** Origem pública da requisição atual, para montar links enviados por e-mail. */
export async function requestBaseUrl() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  return host ? `${h.get("x-forwarded-proto") ?? "https"}://${host}` : (process.env.BETTER_AUTH_URL ?? "");
}

export const proposalPath = (token: string) => `/proposta/${token}`;

/** Cursos que podem entrar numa proposta: tudo o que está publicado em níveis ativos. */
export function proposalCatalog(tx: Tx, tenantId: string) {
  return tx.module.findMany({
    where: { tenantId, status: "PUBLICADO", level: { active: true } },
    orderBy: [{ level: { order: "asc" } }, { order: "asc" }, { title: "asc" }],
    select: {
      id: true, title: true, slug: true, summary: true, workloadMinutes: true, audience: true, enterprisePriceCents: true,
      level: { select: { id: true, label: true, slug: true } },
      segment: { select: { name: true, slug: true } },
    },
  });
}

type LeadForProposal = { id: string; company: string; contactName: string; email: string; teamSize: number | null; message: string | null };

/** Gera (ou regenera, enquanto não aceita) a proposta de um pedido com os preços atuais do catálogo. */
export async function upsertProposal(tx: Tx, tenantId: string, lead: LeadForProposal, moduleIds: readonly string[], catalog: readonly ProposalModule[]) {
  const items = buildProposalItems(moduleIds, catalog);
  const now = new Date();
  const data = {
    company: lead.company,
    contactName: lead.contactName,
    email: lead.email,
    teamSize: lead.teamSize,
    message: lead.message,
    items: items as unknown as Prisma.InputJsonValue,
    totalCents: proposalTotals(items, lead.teamSize).totalCents,
    validUntil: proposalValidUntil(now),
  };
  const existing = await tx.proposal.findUnique({ where: { leadId: lead.id } });
  if (existing) return existing.acceptedAt ? existing : tx.proposal.update({ where: { id: existing.id }, data });
  // Numeração sequencial por tenant, sem buracos entre pedidos simultâneos.
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`proposal-number:${tenantId}`}, 0))`;
  const last = await tx.proposal.aggregate({ where: { tenantId }, _max: { number: true } });
  return tx.proposal.create({ data: { tenantId, leadId: lead.id, number: (last._max.number ?? 0) + 1, token: randomBytes(24).toString("base64url"), ...data } });
}

/** Envia a proposta ao cliente (e-mail com identidade própria) e registra o envio. */
export async function sendProposal(tenant: { id: string; name: string }, proposal: Proposal, baseUrl: string) {
  const mail = proposalEmail({
    tenantName: tenant.name,
    baseUrl,
    url: `${baseUrl}${proposalPath(proposal.token)}`,
    code: proposalCode(proposal.number, proposal.createdAt),
    company: proposal.company,
    contactName: proposal.contactName,
    teamSize: proposal.teamSize,
    items: readProposalItems(proposal.items),
    validUntil: proposal.validUntil,
  });
  await sendEmail(proposal.email, mail.subject, mail.text, mail.html);
  await withTenant(tenant.id, (tx) => tx.proposal.update({ where: { id: proposal.id }, data: { sentAt: new Date() } }));
}

export type AcceptResult =
  | { error: string }
  | { ok: true; organizationId: string; managerLinked: boolean; pools: { id: string; title: string }[] };

/**
 * Aceite pelo link público: cria a empresa, um contrato de vagas por curso com preço (pagamento
 * pendente) e liga o contato como gestor. As matrículas nascem das vagas; enquanto o contrato
 * não é pago, elas leem conteúdo e apostilas, mas provas e certificado ficam bloqueados.
 */
export async function acceptProposal(tenantId: string, token: string, input: { name: string; seats: number; ip: string | null }): Promise<AcceptResult> {
  return withTenant(tenantId, async (tx): Promise<AcceptResult> => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`proposal:${token}`}, 0))`;
    const proposal = await tx.proposal.findFirst({ where: { tenantId, token } });
    if (!proposal) return { error: "Proposta não encontrada." };
    if (proposal.acceptedAt) return { error: "Esta proposta já foi aceita." };
    if (proposal.validUntil <= new Date()) return { error: "Esta proposta expirou. Solicite uma nova em Para empresas." };
    const priced = readProposalItems(proposal.items).filter((i) => i.unitCents != null);
    const modules = await tx.module.findMany({ where: { tenantId, id: { in: priced.map((i) => i.moduleId) }, status: { not: "ARQUIVADO" } }, select: { id: true } });
    const available = priced.filter((i) => modules.some((m) => m.id === i.moduleId));
    if (!available.length) return { error: "Os itens desta proposta ainda dependem de definição de valores. Nossa equipe entrará em contato." };

    const code = proposalCode(proposal.number, proposal.createdAt);
    const org = await tx.organization.create({
      data: { tenantId, name: proposal.company, contactName: proposal.contactName, contactEmail: proposal.email, notes: `Criada pelo aceite da proposta ${code}.` },
    });
    const pools = [];
    for (const item of available) {
      const pool = await tx.licensePool.create({
        data: { tenantId, organizationId: org.id, moduleId: item.moduleId, seats: input.seats, contractCents: item.unitCents! * input.seats, paidAt: null, note: `Proposta ${code}` },
      });
      pools.push({ id: pool.id, title: item.title });
    }

    // O contato vira gestor agora se já tem conta ativa; senão, no primeiro acesso ao painel.
    const user = await tx.user.findUnique({ where: { email: proposal.email }, select: { id: true } });
    let managerLinked = false;
    if (user) {
      const membership = await tx.membership.findUnique({ where: { tenantId_userId: { tenantId, userId: user.id } } });
      if (membership?.status !== "DISABLED") {
        if (!membership) await tx.membership.create({ data: { tenantId, userId: user.id, roles: ["ALUNO"] } });
        await tx.organizationMember.create({ data: { tenantId, organizationId: org.id, userId: user.id, role: "GESTOR" } });
        managerLinked = true;
      }
    }

    await tx.proposal.update({
      where: { id: proposal.id },
      data: {
        acceptedAt: new Date(), acceptedByName: input.name, acceptedIp: input.ip, acceptedSeats: input.seats, organizationId: org.id,
        totalCents: available.reduce((n, i) => n + i.unitCents! * input.seats, 0),
      },
    });
    await tx.enterpriseLead.update({ where: { id: proposal.leadId }, data: { status: "FECHADO" } });
    await audit(tx, {
      tenantId, actorId: user?.id ?? null, action: "proposta.aceita", entity: "Proposal", entityId: proposal.id,
      data: { code, seats: input.seats, organizationId: org.id, pools: pools.length, acceptedBy: input.name }, ip: input.ip,
    });
    return { ok: true, organizationId: org.id, managerLinked, pools };
  });
}

/** Distribui as vagas dos contratos recém-criados para os e-mails informados no aceite. */
export async function assignProposalSeats(tenantId: string, pools: { id: string }[], emails: string[], ip: string | null) {
  const activated = new Set<string>();
  const invited = new Set<string>();
  for (const pool of pools) {
    const r = await assignSeats({ tenantId, poolId: pool.id, emails, team: null, actorId: null, ip });
    if ("error" in r) continue;
    r.activated.forEach((e) => activated.add(e));
    r.invited.forEach((e) => invited.add(e));
  }
  return { activated: [...activated], invited: [...invited].filter((e) => !activated.has(e)) };
}

/** Quem aceitou uma proposta antes de ter conta vira gestor da empresa no primeiro acesso ao painel. */
export async function claimProposalManagement(tenantId: string, user: { id: string; email: string }) {
  await withTenant(tenantId, async (tx) => {
    const pending = await tx.proposal.findMany({
      where: { tenantId, email: user.email.toLowerCase(), acceptedAt: { not: null }, organization: { status: "ACTIVE", members: { none: { role: "GESTOR" } } } },
      select: { organizationId: true },
    });
    for (const p of pending) {
      if (!p.organizationId) continue;
      await tx.organizationMember.upsert({
        where: { organizationId_userId: { organizationId: p.organizationId, userId: user.id } },
        create: { tenantId, organizationId: p.organizationId, userId: user.id, role: "GESTOR" },
        update: { role: "GESTOR" },
      });
    }
  });
}
