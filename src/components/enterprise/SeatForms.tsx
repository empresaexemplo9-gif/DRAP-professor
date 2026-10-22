"use client";
import { useActionState } from "react";
import { assignSeatsAction, revokeSeatAction, type SeatState } from "@/app/painel/empresa/actions";
import { Button } from "@/components/ui/Button";
import { TextAreaField, TextField } from "@/components/ui/Field";
import { Alert } from "@/components/ui/misc";

export function AssignSeatsForm({ poolId, free, teams }: { poolId: string; free: number; teams: string[] }) {
  const [state, action, pending] = useActionState<SeatState, FormData>(assignSeatsAction, {});
  const listId = `teams-${poolId}`;
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="poolId" value={poolId} />
      {state.error && <Alert tone="danger">{state.error}</Alert>}
      {state.ok && (
        <Alert tone="success">
          {state.message}
          {state.details && state.details.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-xs text-text-muted">
              {state.details.slice(0, 20).map((d) => <li key={d}>{d}</li>)}
              {state.details.length > 20 && <li>e mais {state.details.length - 20}…</li>}
            </ul>
          )}
        </Alert>
      )}
      <TextAreaField
        label="E-mails dos colaboradores"
        name="emails"
        required
        rows={4}
        placeholder={"ana@empresa.com.br\njoao@empresa.com.br"}
        hint={`Cole a lista da equipe (um por linha, ou separados por vírgula). ${free} vaga(s) disponível(is). Quem ainda não tem conta recebe convite por e-mail.`}
      />
      <TextField label="Equipe / área (opcional)" name="team" maxLength={80} list={listId} placeholder="Ex.: Vendas, Filial Campinas" />
      <datalist id={listId}>{teams.map((t) => <option key={t} value={t} />)}</datalist>
      <Button type="submit" loading={pending} disabled={free <= 0}>Atribuir vagas</Button>
    </form>
  );
}

export function RevokeSeatButton({ assignmentId, email }: { assignmentId: string; email: string }) {
  const [state, action, pending] = useActionState<SeatState, FormData>(revokeSeatAction, {});
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(`Liberar a vaga de ${email}? O acesso ao curso será encerrado.`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="assignmentId" value={assignmentId} />
      <Button size="sm" variant="ghost" type="submit" loading={pending}>Liberar vaga</Button>
      {state.error && <span role="alert" className="block max-w-56 text-xs text-danger">{state.error}</span>}
    </form>
  );
}
