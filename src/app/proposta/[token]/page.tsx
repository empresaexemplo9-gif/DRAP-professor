import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTenant } from "@/lib/tenant";
import { withTenant } from "@/lib/db";
import { getViewer } from "@/lib/session";
import { can } from "@/lib/rbac";
import { formatWorkload } from "@/lib/levels";
import { formatBRL } from "@/lib/payments/pix-state";
import { proposalCode, proposalTotals, readProposalItems } from "@/lib/proposals";
import { Crest } from "@/components/proposal/Crest";
import { AcceptForm, PrintButton } from "./AcceptForm";

export const metadata: Metadata = { title: "Proposta", robots: { index: false, follow: false } };

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX"];
const day = (d: Date) => d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "long", year: "numeric" });

const JOURNEY = [
  ["Aceite", "Você confirma a proposta nesta página, sem papel."],
  ["Matrículas", "A empresa e as vagas são criadas na hora; cada pessoa recebe o acesso por e-mail."],
  ["Apostilas", "Conteúdo e apostilas ficam disponíveis para a equipe desde o primeiro dia."],
  ["Pagamento", "Nossa equipe envia a cobrança do contrato e confirma o recebimento."],
  ["Provas e certificado", "Com o pagamento confirmado, as provas e os certificados são liberados."],
] as const;

export default async function ProposalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) notFound();
  const tenant = await getTenant();
  const viewer = await getViewer();
  const isStaff = Boolean(viewer && !viewer.disabled && can(viewer.roles, "enterprise:manage"));
  const proposal = await withTenant(tenant.id, async (tx) => {
    const p = await tx.proposal.findFirst({ where: { tenantId: tenant.id, token } });
    // A primeira abertura pelo cliente fica registrada para o acompanhamento comercial.
    if (p && !p.viewedAt && !isStaff) await tx.proposal.update({ where: { id: p.id }, data: { viewedAt: new Date() } });
    return p;
  });
  if (!proposal) notFound();

  const items = readProposalItems(proposal.items);
  const seats = proposal.acceptedSeats ?? proposal.teamSize;
  const totals = proposalTotals(items, seats);
  const code = proposalCode(proposal.number, proposal.createdAt);
  const expired = !proposal.acceptedAt && proposal.validUntil <= new Date();
  const total = proposal.acceptedAt ? proposal.totalCents : totals.totalCents;

  return (
    <main id="conteudo" className="proposal-stage">
      <div className="proposal-topbar no-print">
        <Link href="/">{tenant.name}</Link>
        <PrintButton />
      </div>

      <article className="proposal-sheet">
        <span aria-hidden className="proposal-watermark" />
        <span aria-hidden className="proposal-corner tl" />
        <span aria-hidden className="proposal-corner tr" />
        <span aria-hidden className="proposal-corner bl" />
        <span aria-hidden className="proposal-corner br" />

        <header className="proposal-head">
          <Crest name={tenant.name} />
          <p className="proposal-kicker">Proposta de capacitação corporativa</p>
          <h1 className="proposal-title">
            Para <em>{proposal.company}</em>
          </h1>
          <p className="proposal-meta">
            Nº {code} · emitida em {day(proposal.createdAt)} · aos cuidados de {proposal.contactName}
          </p>
          {proposal.acceptedAt ? (
            <p className="proposal-seal accepted">Aceita em {day(proposal.acceptedAt)}</p>
          ) : (
            <p className={`proposal-seal${expired ? " expired" : ""}`}>{expired ? "Validade encerrada" : `Válida até ${day(proposal.validUntil)}`}</p>
          )}
        </header>

        {proposal.message && (
          <section aria-labelledby="pedido" className="proposal-quote">
            <h2 id="pedido">O que você nos contou</h2>
            <blockquote>{proposal.message}</blockquote>
          </section>
        )}

        <section aria-labelledby="escopo">
          <h2 id="escopo" className="proposal-h2">O programa que você escolheu</h2>
          <ol className="proposal-items">
            {items.map((item, i) => (
              <li key={item.moduleId}>
                <span aria-hidden className="numeral">{ROMAN[i] ?? i + 1}</span>
                <div className="body">
                  <h3>{item.title}</h3>
                  <p className="tags">{item.level} · {item.segment} · {formatWorkload(item.workloadMinutes)}</p>
                  {item.summary && <p className="summary">{item.summary}</p>}
                </div>
                <p className="price">
                  {item.unitCents == null ? (
                    <span>sob consulta</span>
                  ) : (
                    <>
                      <strong>{formatBRL(item.unitCents)}</strong>
                      <span>por pessoa</span>
                    </>
                  )}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="investimento" className="proposal-plaque">
          <div>
            <h2 id="investimento">Investimento</h2>
            <p>
              {items.length} {items.length === 1 ? "formação" : "formações"} · {formatWorkload(totals.workloadMinutes)} de conteúdo
              {seats ? ` · ${seats} ${seats === 1 ? "participante" : "participantes"}` : ""}
            </p>
            {totals.unpricedCount > 0 && <p>{totals.unpricedCount} item(ns) sob consulta, fora da soma: nossa equipe envia os valores.</p>}
          </div>
          <p className="amount">
            {total != null ? (
              <strong>{formatBRL(total)}</strong>
            ) : totals.perPersonCents != null ? (
              <>
                <strong>{formatBRL(totals.perPersonCents)}</strong>
                <span>por pessoa</span>
              </>
            ) : (
              <strong>Sob consulta</strong>
            )}
          </p>
        </section>

        <section aria-labelledby="jornada">
          <h2 id="jornada" className="proposal-h2">Do aceite ao certificado</h2>
          <ol className="proposal-journey">
            {JOURNEY.map(([title, text], i) => (
              <li key={title}>
                <span aria-hidden className="step">{i + 1}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="aceite" className="proposal-accept no-print-form">
          <h2 id="aceite" className="proposal-h2">{proposal.acceptedAt ? "Proposta aceita" : "Aceite"}</h2>
          {proposal.acceptedAt ? (
            <div className="space-y-3 text-sm">
              <p>
                Aceita por <strong>{proposal.acceptedByName}</strong> para {proposal.acceptedSeats} participante(s). A empresa e as vagas já estão criadas, e as apostilas estão disponíveis para a equipe.
              </p>
              <p>
                Para distribuir vagas e acompanhar a equipe, entre com o e-mail <strong>{proposal.email}</strong> e abra <strong>Painel › Minha empresa</strong>. Ainda não tem conta? Crie uma com esse mesmo e-mail.
              </p>
              <p className="no-print flex flex-wrap gap-3">
                <Link href="/painel/empresa" className="proposal-cta">Abrir o painel da empresa</Link>
                <Link href="/cadastro" className="proposal-ghost">Criar conta</Link>
              </p>
            </div>
          ) : expired ? (
            <p className="text-sm">
              O prazo desta proposta terminou. <Link href="/empresas#proposta">Solicite uma nova</Link> com os valores atuais.
            </p>
          ) : totals.perPersonCents == null ? (
            <p className="text-sm">Os itens desta proposta estão sob consulta. Nossa equipe entrará em contato com os valores para concluir o aceite.</p>
          ) : (
            <>
            <p className="print-only text-sm">O aceite é feito online, pelo link desta proposta enviado ao e-mail {proposal.email}.</p>
            <AcceptForm token={token} perPersonCents={totals.perPersonCents} defaultSeats={proposal.teamSize} contactName={proposal.contactName} />
            </>
          )}
        </section>

        <footer className="proposal-foot">
          <span aria-hidden className="rule" />
          <p>{tenant.name}</p>
          <p>Documento gerado a partir do pedido de {proposal.contactName} · {code}</p>
        </footer>
      </article>
    </main>
  );
}
