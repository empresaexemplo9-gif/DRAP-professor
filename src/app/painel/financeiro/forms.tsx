"use client";
import { useActionState } from "react";
import { cancelCheckoutAction, confirmCheckoutAction, syncCheckoutAction, updatePriceAction, type FinanceState } from "./actions";
import { Button } from "@/components/ui/Button";

const small = "min-h-9 rounded-md border border-border-strong bg-bg px-2 text-xs text-text";

function Feedback({ state }: { state: FinanceState }) {
  if (state.error) return <span role="alert" className="block text-xs text-danger">{state.error}</span>;
  if (state.ok) return <span role="status" className="block text-xs text-success">{state.message}</span>;
  return null;
}

export function CheckoutActions({ checkoutId, status, canSync }: { checkoutId: string; status: string; canSync: boolean }) {
  const [syncState, sync, syncing] = useActionState<FinanceState, FormData>(syncCheckoutAction, {});
  const [cancelState, cancel, cancelling] = useActionState<FinanceState, FormData>(cancelCheckoutAction, {});
  const [confirmState, confirm, confirming] = useActionState<FinanceState, FormData>(confirmCheckoutAction, {});
  if (status === "PAID") {
    return (
      <div className="min-w-64">
        <Feedback state={confirmState.ok ? confirmState : syncState} />
        {!confirmState.ok && !syncState.ok && <span className="text-xs text-text-muted">—</span>}
      </div>
    );
  }
  return (
    <div className="min-w-64 space-y-2">
      <div className="flex flex-wrap gap-1">
        {canSync && (
          <form action={sync}>
            <input type="hidden" name="checkoutId" value={checkoutId} />
            <Button size="sm" variant="secondary" type="submit" loading={syncing}>Verificar no Asaas</Button>
          </form>
        )}
        {status === "PENDING" && (
          <form
            action={cancel}
            onSubmit={(e) => {
              if (!window.confirm("Cancelar esta cobrança Pix? O QR Code deixará de aceitar pagamento.")) e.preventDefault();
            }}
          >
            <input type="hidden" name="checkoutId" value={checkoutId} />
            <Button size="sm" variant="ghost" type="submit" loading={cancelling}>Cancelar</Button>
          </form>
        )}
      </div>
      <details className="text-xs">
        <summary className="cursor-pointer text-text-muted hover:text-text">Confirmar pagamento manualmente</summary>
        <form action={confirm} className="mt-2 space-y-2">
          <input type="hidden" name="checkoutId" value={checkoutId} />
          <label className="flex flex-col gap-1 text-text-muted">
            Justificativa (fica na auditoria)
            <input name="note" required minLength={5} maxLength={500} placeholder="Ex.: comprovante recebido por e-mail" className={small} />
          </label>
          <Button size="sm" variant="gold" type="submit" loading={confirming}>Confirmar e liberar matrícula</Button>
        </form>
      </details>
      <Feedback state={syncState} />
      <Feedback state={cancelState} />
      <Feedback state={confirmState} />
    </div>
  );
}

export function PriceEditor({ moduleId, priceCents }: { moduleId: string; priceCents: number | null }) {
  const [state, action, pending] = useActionState<FinanceState, FormData>(updatePriceAction, {});
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="moduleId" value={moduleId} />
      <span className="text-xs text-text-muted">R$</span>
      <input
        name="price"
        aria-label="Preço em reais"
        inputMode="decimal"
        defaultValue={priceCents == null ? "" : (priceCents / 100).toFixed(2).replace(".", ",")}
        placeholder="sem checkout"
        className={`${small} w-28`}
      />
      <Button size="sm" variant="ghost" type="submit" loading={pending}>Salvar</Button>
      <Feedback state={state} />
    </form>
  );
}
