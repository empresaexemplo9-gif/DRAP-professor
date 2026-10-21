"use client";
import { useActionState } from "react";
import { startPixCheckout, type PixCheckoutActionState } from "@/app/(site)/checkout-actions";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Alert } from "@/components/ui/misc";

function money(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

export function PixEnrollmentCta({
  moduleId,
  priceCents,
  loggedIn,
  needsConsent = false,
  enabled,
}: {
  moduleId: string;
  priceCents: number | null;
  loggedIn: boolean;
  needsConsent?: boolean;
  enabled: boolean;
}) {
  const [state, action, pending] = useActionState<PixCheckoutActionState, FormData>(startPixCheckout, {});
  if (priceCents == null || priceCents < 100) {
    return <p className="text-sm leading-relaxed text-text-muted">Matrículas Pix ainda não estão disponíveis para este curso.</p>;
  }
  if (!enabled) {
    return <p className="text-sm leading-relaxed text-text-muted">Pagamento Pix temporariamente indisponível. Tente novamente mais tarde.</p>;
  }
  if (!loggedIn) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-text-muted">Matricule-se por Pix em pagamento único de <strong className="text-text">{money(priceCents)}</strong>.</p>
        <ButtonLink href="/cadastro" variant="gold" className="w-full text-sm">Criar conta para se matricular</ButtonLink>
        <ButtonLink href="/entrar" variant="secondary" className="w-full text-sm">Já tenho conta</ButtonLink>
      </div>
    );
  }
  if (needsConsent) {
    return <ButtonLink href="/aceite" variant="gold" className="w-full text-sm">Aceitar termos para continuar</ButtonLink>;
  }
  return (
    <form action={action} className="space-y-3">
      {state.error && <Alert tone="danger">{state.error}</Alert>}
      <input type="hidden" name="moduleId" value={moduleId} />
      <p className="text-sm text-text-muted">Pagamento único de <strong className="text-text">{money(priceCents)}</strong>. O acesso é liberado após a confirmação do Pix.</p>
      <Button type="submit" variant="gold" className="w-full text-sm" loading={pending}>Matricular e pagar com Pix</Button>
    </form>
  );
}
