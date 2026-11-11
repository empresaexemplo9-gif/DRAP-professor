import { campusColors } from "@/theme/tokens";
import { formatBRL } from "@/lib/payments/pix-state";
import { formatWorkload } from "@/lib/levels";
import { proposalTotals, type ProposalItem } from "@/lib/proposals";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export type ProposalEmailInput = {
  tenantName: string;
  baseUrl: string;
  url: string;
  code: string;
  company: string;
  contactName: string;
  teamSize: number | null;
  items: ProposalItem[];
  validUntil: Date;
};

/** E-mail da proposta: brasão no topo, marca d'água ao fundo e resumo do que o cliente marcou. */
export function proposalEmail(input: ProposalEmailInput) {
  const c = campusColors;
  const totals = proposalTotals(input.items, input.teamSize);
  const valid = input.validUntil.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const logo = `${input.baseUrl}/brand/logo-mark.png`;
  const investment =
    totals.totalCents != null
      ? `${formatBRL(totals.totalCents)} para ${input.teamSize} pessoa(s)`
      : totals.perPersonCents != null
        ? `${formatBRL(totals.perPersonCents)} por pessoa`
        : "Sob consulta";
  const subject = `Proposta ${input.code} · ${input.tenantName} para ${input.company}`;

  const text = [
    `Olá, ${input.contactName}.`,
    "",
    `Preparamos a proposta ${input.code} para ${input.company}, com base no que você marcou:`,
    ...input.items.map((i) => `  • ${i.title} (${formatWorkload(i.workloadMinutes)}) — ${i.unitCents == null ? "sob consulta" : `${formatBRL(i.unitCents)} por pessoa`}`),
    "",
    `Investimento: ${investment}`,
    `Válida até ${valid}.`,
    "",
    `Veja a proposta completa e aceite online: ${input.url}`,
    "",
    input.tenantName,
  ].join("\n");

  const rows = input.items
    .map(
      (i, n) => `<tr>
<td style="padding:12px 0;border-bottom:1px solid ${c.gold}55;font-family:Georgia,serif;font-size:13px;color:${c.gold};vertical-align:top;width:34px">${String(n + 1).padStart(2, "0")}</td>
<td style="padding:12px 0;border-bottom:1px solid ${c.gold}55;vertical-align:top">
<div style="font-family:Georgia,serif;font-size:16px;color:${c.navy}">${esc(i.title)}</div>
<div style="font-size:12px;color:${c.line};margin-top:2px">${esc(i.level)} · ${esc(i.segment)} · ${esc(formatWorkload(i.workloadMinutes))}</div>
</td>
<td style="padding:12px 0;border-bottom:1px solid ${c.gold}55;vertical-align:top;text-align:right;font-size:13px;color:${c.navy};white-space:nowrap">${i.unitCents == null ? "sob consulta" : `${formatBRL(i.unitCents)}<br><span style="font-size:11px;color:${c.line}">por pessoa</span>`}</td>
</tr>`,
    )
    .join("");

  const html = `<!doctype html><html lang="pt-BR"><body style="margin:0;padding:0;background:${c.navy}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${c.navy};padding:32px 12px"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">
<tr><td align="center" style="padding:8px 0 0">
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td align="center" style="width:92px;height:104px;background:${c.cream};border:3px double ${c.gold};border-radius:14px 14px 46px 46px">
<img src="${logo}" width="52" height="52" alt="${esc(input.tenantName)}" style="display:block;border:0">
</td></tr></table>
<div style="font-family:Georgia,serif;font-size:11px;letter-spacing:4px;text-transform:uppercase;color:${c.gold};padding:14px 0 4px">${esc(input.tenantName)}</div>
<div style="font-family:Georgia,serif;font-size:30px;color:${c["on-navy"]};padding-bottom:22px">Proposta <span style="font-style:italic;color:${c.gold}">${esc(input.code)}</span></div>
</td></tr>
<tr><td background="${logo}" style="background:${c.cream} url('${logo}') no-repeat center 60px;background-size:340px;border-top:4px solid ${c.gold};border-radius:4px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${c.cream}f0"><tr><td style="padding:34px 34px 30px;font-family:Helvetica,Arial,sans-serif;color:${c.navy}">
<p style="margin:0 0 6px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${c.line}">Preparada para</p>
<p style="margin:0;font-family:Georgia,serif;font-size:24px">${esc(input.company)}</p>
<p style="margin:4px 0 22px;font-size:13px;color:${c.line}">Aos cuidados de ${esc(input.contactName)}${input.teamSize ? ` · equipe de ${input.teamSize} pessoa(s)` : ""}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;background:${c.navy};border-radius:4px"><tr>
<td style="padding:18px 20px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${c.muted}">Investimento${totals.unpricedCount ? `<br><span style="letter-spacing:0;text-transform:none">+ ${totals.unpricedCount} item(ns) sob consulta</span>` : ""}</td>
<td align="right" style="padding:18px 20px;font-family:Georgia,serif;font-size:20px;color:${c.gold}">${esc(investment)}</td>
</tr></table>
<p style="margin:26px 0 0" align="center"><a href="${input.url}" style="display:inline-block;background:${c.gold};color:${c.navy};text-decoration:none;font-weight:bold;font-size:14px;padding:14px 28px;border-radius:4px">Ver a proposta completa e aceitar</a></p>
<p style="margin:18px 0 0;font-size:12px;color:${c.line}" align="center">Válida até ${valid}. As matrículas da equipe são criadas no aceite; provas e certificados são liberados com a confirmação do pagamento.</p>
</td></tr></table>
</td></tr>
<tr><td align="center" style="padding:20px 0 0;font-family:Helvetica,Arial,sans-serif;font-size:11px;color:${c.muted}">${esc(input.tenantName)} · proposta gerada a partir do seu pedido em ${esc(input.baseUrl.replace(/^https?:\/\//, ""))}</td></tr>
</table></td></tr></table></body></html>`;

  return { subject, text, html };
}
