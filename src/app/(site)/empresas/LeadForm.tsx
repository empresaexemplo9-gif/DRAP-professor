"use client";
import { useActionState } from "react";
import { requestProposalAction, type LeadState } from "./actions";
import { Button } from "@/components/ui/Button";
import { TextAreaField, TextField } from "@/components/ui/Field";
import { Alert } from "@/components/ui/misc";

export function LeadForm({ themes }: { themes: string[] }) {
  const [state, action, pending] = useActionState<LeadState, FormData>(requestProposalAction, {});
  if (state.ok) {
    return <Alert tone="success">Recebemos seu pedido. Nossa equipe entrará em contato em até 1 dia útil com uma proposta para a sua empresa.</Alert>;
  }
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4">
      {state.error && <Alert tone="danger">{state.error}</Alert>}
      <div className="grid gap-4 md:grid-cols-2">
        <TextField label="Empresa" name="company" required autoComplete="organization" error={fe.company} />
        <TextField label="Seu nome" name="contactName" required autoComplete="name" error={fe.contactName} />
        <TextField label="E-mail corporativo" name="email" type="email" required autoComplete="email" error={fe.email} />
        <TextField label="Telefone / WhatsApp" name="phone" autoComplete="tel" error={fe.phone} />
        <TextField label="Quantas pessoas treinar?" name="teamSize" type="number" min={1} error={fe.teamSize} />
      </div>
      {themes.length > 0 && (
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-text">Temas de interesse</legend>
          <div className="grid gap-x-4 sm:grid-cols-2 xl:grid-cols-3">
            {themes.map((t) => (
              <label key={t} className="flex min-h-11 items-center gap-2 text-sm text-text">
                <input type="checkbox" name="interests" value={t} className="size-5 accent-[var(--drap-primary-strong)]" />
                {t}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <TextAreaField label="Conte sobre a necessidade da equipe" name="message" rows={3} maxLength={2000} error={fe.message} />
      <div aria-hidden className="hidden">
        <label>Site <input name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>
      <Button type="submit" variant="gold" loading={pending}>Solicitar proposta</Button>
    </form>
  );
}
