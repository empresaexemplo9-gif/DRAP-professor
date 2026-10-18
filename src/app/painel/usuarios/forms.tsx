"use client";
import { useActionState } from "react";
import type { Role } from "@prisma/client";
import { inviteAction, updateRolesAction, type UsersState } from "./actions";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { Alert } from "@/components/ui/misc";

const ROLES: { value: Role; label: string }[] = [
  { value: "ADMIN", label: "Administrador" },
  { value: "PEDAGOGICO", label: "Pedagógico" },
  { value: "INSTRUTOR", label: "Instrutor" },
  { value: "ALUNO", label: "Aluno" },
];

export function InviteForm() {
  const [state, action, pending] = useActionState<UsersState, FormData>(inviteAction, {});
  return (
    <form action={action} className="space-y-4">
      {state.error && <Alert tone="danger">{state.error}</Alert>}
      {state.ok && (
        <Alert tone="success">
          {state.message}
          <input readOnly value={state.inviteUrl} aria-label="Link do convite" className="mt-2 w-full rounded-sm border border-border bg-bg p-2 text-xs text-text" onFocus={(e) => e.currentTarget.select()} />
        </Alert>
      )}
      <TextField label="E-mail" name="email" type="email" required />
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-text">Perfis</legend>
        <div className="grid grid-cols-2 gap-2">
          {ROLES.map((r) => (
            <label key={r.value} className="flex min-h-11 items-center gap-2 text-sm text-text">
              <input type="checkbox" name="roles" value={r.value} defaultChecked={r.value === "ALUNO"} className="size-5 accent-[var(--drap-primary-strong)]" />
              {r.label}
            </label>
          ))}
        </div>
      </fieldset>
      <Button type="submit" loading={pending}>Gerar convite</Button>
    </form>
  );
}

export function RolesEditor({ membershipId, roles }: { membershipId: string; roles: Role[] }) {
  return (
    <form action={updateRolesAction} className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <input type="hidden" name="membershipId" value={membershipId} />
      {ROLES.map((r) => (
        <label key={r.value} className="flex items-center gap-1.5 text-xs text-text">
          <input type="checkbox" name="roles" value={r.value} defaultChecked={roles.includes(r.value)} className="size-4 accent-[var(--drap-primary-strong)]" />
          {r.label}
        </label>
      ))}
      <Button size="sm" variant="ghost" type="submit">Salvar</Button>
    </form>
  );
}
