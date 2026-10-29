"use client";
import { useActionState } from "react";
import {
  addManagerAction,
  createOrganizationAction,
  createPoolAction,
  updateOrganizationAction,
  updatePoolAction,
  type EnterpriseState,
} from "./actions";
import { Button } from "@/components/ui/Button";
import { SelectField, TextAreaField, TextField } from "@/components/ui/Field";
import { Alert } from "@/components/ui/misc";

type OrgValues = {
  id?: string;
  name?: string;
  legalName?: string | null;
  cnpj?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  notes?: string | null;
  status?: "ACTIVE" | "SUSPENDED";
};

function Feedback({ state }: { state: EnterpriseState }) {
  if (state.error) return <Alert tone="danger">{state.error}</Alert>;
  if (state.ok) return <Alert tone="success">{state.message}</Alert>;
  return null;
}

export function OrganizationForm({ values }: { values?: OrgValues }) {
  const editing = Boolean(values?.id);
  const [state, action, pending] = useActionState<EnterpriseState, FormData>(editing ? updateOrganizationAction : createOrganizationAction, {});
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4">
      <Feedback state={state} />
      {editing && <input type="hidden" name="organizationId" value={values!.id} />}
      <div className="grid gap-4 md:grid-cols-2">
        <TextField label="Nome da empresa" name="name" required defaultValue={values?.name} error={fe.name} />
        <TextField label="CNPJ" name="cnpj" inputMode="numeric" defaultValue={values?.cnpj ?? ""} error={fe.cnpj} placeholder="00.000.000/0000-00" />
        <TextField label="Razão social" name="legalName" defaultValue={values?.legalName ?? ""} error={fe.legalName} />
        <TextField label="Contato principal" name="contactName" defaultValue={values?.contactName ?? ""} error={fe.contactName} />
        <TextField label="E-mail do contato" name="contactEmail" type="email" defaultValue={values?.contactEmail ?? ""} error={fe.contactEmail} />
        <TextField label="Telefone" name="contactPhone" defaultValue={values?.contactPhone ?? ""} error={fe.contactPhone} />
      </div>
      <TextAreaField label="Observações internas" name="notes" rows={2} defaultValue={values?.notes ?? ""} maxLength={1000} />
      {editing && (
        <SelectField label="Situação" name="status" defaultValue={values?.status} hint="Suspender pausa todos os acessos por licença desta empresa.">
          <option value="ACTIVE">Ativa</option>
          <option value="SUSPENDED">Suspensa</option>
        </SelectField>
      )}
      <Button type="submit" loading={pending}>{editing ? "Salvar empresa" : "Cadastrar empresa"}</Button>
    </form>
  );
}

export function AddManagerForm({ organizationId }: { organizationId: string }) {
  const [state, action, pending] = useActionState<EnterpriseState, FormData>(addManagerAction, {});
  return (
    <form action={action} className="space-y-3">
      <Feedback state={state} />
      <input type="hidden" name="organizationId" value={organizationId} />
      <TextField label="E-mail do gestor" name="email" type="email" required hint="A pessoa precisa ter conta. Ela verá a aba Minha empresa no painel." />
      <Button type="submit" variant="secondary" loading={pending}>Adicionar gestor</Button>
    </form>
  );
}

type ModuleOption = { id: string; title: string; group: string };

export function CreatePoolForm({ organizationId, modules }: { organizationId: string; modules: ModuleOption[] }) {
  const [state, action, pending] = useActionState<EnterpriseState, FormData>(createPoolAction, {});
  const groups = [...new Set(modules.map((m) => m.group))];
  return (
    <form action={action} className="space-y-4">
      <Feedback state={state} />
      <input type="hidden" name="organizationId" value={organizationId} />
      <SelectField label="Curso, treinamento ou capacitação" name="moduleId" required defaultValue="">
        <option value="" disabled>Selecione…</option>
        {groups.map((g) => (
          <optgroup key={g} label={g}>
            {modules.filter((m) => m.group === g).map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
          </optgroup>
        ))}
      </SelectField>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <TextField label="Vagas" name="seats" type="number" min={1} max={100000} required defaultValue={10} />
        <TextField label="Meta da equipe (%)" name="goalPercent" type="number" min={0} max={100} defaultValue={90} />
        <TextField label="Valor do contrato (R$)" name="contract" inputMode="decimal" placeholder="opcional" />
        <TextField label="Acesso até" name="endsAt" type="date" hint="Vazio = sem prazo final." />
        <TextField label="Concluir até" name="dueAt" type="date" hint="Prazo da meta da equipe." />
      </div>
      <TextAreaField label="Observação" name="note" rows={2} maxLength={500} />
      <Button type="submit" loading={pending}>Adicionar vagas</Button>
    </form>
  );
}

const small = "min-h-9 rounded-md border border-border-strong bg-bg px-2 text-xs text-text";

export function PoolEditor({
  pool,
}: {
  pool: { id: string; seats: number; goalPercent: number; endsAt: string; dueAt: string; contract: string; note: string; status: "ACTIVE" | "CANCELED" };
}) {
  const [state, action, pending] = useActionState<EnterpriseState, FormData>(updatePoolAction, {});
  return (
    <details className="rounded-md border border-border p-3 text-sm">
      <summary className="cursor-pointer font-medium text-text">Editar contrato</summary>
      <form action={action} className="mt-3 flex flex-wrap items-end gap-3">
        <input type="hidden" name="poolId" value={pool.id} />
        {[
          ["Vagas", "seats", "number", String(pool.seats)],
          ["Meta (%)", "goalPercent", "number", String(pool.goalPercent)],
          ["Acesso até", "endsAt", "date", pool.endsAt],
          ["Concluir até", "dueAt", "date", pool.dueAt],
          ["Valor (R$)", "contract", "text", pool.contract],
        ].map(([label, name, type, value]) => (
          <label key={name} className="flex flex-col gap-1 text-xs text-text-muted">
            {label}
            <input name={name} type={type} defaultValue={value} className={`${small} ${type === "number" ? "w-24" : ""}`} />
          </label>
        ))}
        <label className="flex flex-col gap-1 text-xs text-text-muted">
          Situação
          <select name="status" defaultValue={pool.status} className={small}>
            <option value="ACTIVE">Ativo</option>
            <option value="CANCELED">Cancelado</option>
          </select>
        </label>
        <label className="flex grow flex-col gap-1 text-xs text-text-muted">
          Observação
          <input name="note" defaultValue={pool.note} maxLength={500} className={small} />
        </label>
        <Button size="sm" type="submit" loading={pending}>Salvar contrato</Button>
        <div className="w-full"><Feedback state={state} /></div>
      </form>
    </details>
  );
}
