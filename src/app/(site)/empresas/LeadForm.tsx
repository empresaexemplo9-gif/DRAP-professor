"use client";
import { useActionState } from "react";
import Link from "next/link";
import { requestProposalAction, type LeadState } from "./actions";
import { Button } from "@/components/ui/Button";
import { TextAreaField, TextField } from "@/components/ui/Field";
import { Alert } from "@/components/ui/misc";

export type LeadChoiceGroup = { label: string; options: { id: string; title: string; hint: string }[] };

export function LeadForm({ groups, preselected }: { groups: LeadChoiceGroup[]; preselected?: string }) {
  const [state, action, pending] = useActionState<LeadState, FormData>(requestProposalAction, {});
  if (state.ok) {
    return state.proposalUrl ? (
      <Alert tone="success">
        Recebemos seu pedido. A proposta {state.proposalCode} já está pronta e foi enviada para o seu e-mail.{" "}
        <Link href={state.proposalUrl} className="font-medium">Abrir minha proposta</Link>
      </Alert>
    ) : (
      <Alert tone="success">Recebemos seu pedido. Nossa equipe entrará em contato em até 1 dia útil com uma proposta para a sua empresa.</Alert>
    );
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
      {groups.length > 0 && (
        <div className="space-y-4">
          <p className="text-sm font-medium text-text">Marque os treinamentos e cursos que entram na proposta</p>
          {groups.map((g) => (
            <fieldset key={g.label}>
              <legend className="mb-1 text-xs font-medium uppercase tracking-widest text-accent-text">{g.label}</legend>
              <div className="grid gap-x-4 sm:grid-cols-2 xl:grid-cols-3">
                {g.options.map((o) => (
                  <label key={o.id} className="flex min-h-11 items-center gap-2 py-1 text-sm text-text">
                    <input type="checkbox" name="modules" value={o.id} defaultChecked={o.id === preselected} className="size-5 shrink-0 accent-[var(--drap-primary-strong)]" />
                    <span>
                      {o.title}
                      <span className="block text-xs text-text-muted">{o.hint}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
      )}
      <TextAreaField label="Conte sobre a necessidade da equipe" name="message" rows={3} maxLength={2000} error={fe.message} />
      <div aria-hidden className="hidden">
        <label>Site <input name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>
      <Button type="submit" variant="gold" loading={pending}>Solicitar proposta</Button>
    </form>
  );
}
