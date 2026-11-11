"use client";
import { useActionState, useState } from "react";
import { acceptProposalAction, type AcceptState } from "./actions";

const brl = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

export function AcceptForm({ token, perPersonCents, defaultSeats, contactName }: { token: string; perPersonCents: number; defaultSeats: number | null; contactName: string }) {
  const [state, action, pending] = useActionState<AcceptState, FormData>(acceptProposalAction, {});
  const [seats, setSeats] = useState(defaultSeats ? String(defaultSeats) : "");
  const n = Number(seats);
  const total = Number.isInteger(n) && n > 0 ? perPersonCents * n : null;
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      {state.error && <p role="alert" className="proposal-notice">{state.error}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="proposal-field">
          Nome de quem aceita
          <input name="name" required minLength={3} maxLength={120} defaultValue={contactName} autoComplete="name" />
        </label>
        <label className="proposal-field">
          Número de participantes
          <input name="seats" type="number" required min={1} value={seats} onChange={(e) => setSeats(e.target.value)} />
        </label>
      </div>
      <label className="proposal-field">
        E-mails da equipe (opcional)
        <textarea name="emails" rows={3} placeholder="Cole os e-mails separados por vírgula, espaço ou linha. As matrículas são criadas na hora; quem faltar pode ser incluído depois, no painel da empresa." />
      </label>
      <p className="text-sm" aria-live="polite">
        Investimento com este número de participantes: <strong className="font-display text-lg">{total == null ? "informe os participantes" : brl(total)}</strong>
      </p>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" name="agree" required className="mt-0.5 size-5 shrink-0 accent-[var(--drap-campus-navy)]" />
        <span>Aceito esta proposta em nome da empresa. As matrículas e as apostilas são liberadas agora; provas e certificados, após a confirmação do pagamento.</span>
      </label>
      <button type="submit" disabled={pending} className="proposal-cta">
        {pending ? "Registrando aceite…" : "Aceitar proposta"}
      </button>
    </form>
  );
}

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="proposal-ghost no-print">
      Imprimir ou salvar em PDF
    </button>
  );
}
