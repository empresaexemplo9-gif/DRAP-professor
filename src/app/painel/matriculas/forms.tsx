"use client";
import { useActionState } from "react";
import { createEnrollmentAction, updateEnrollmentAction, type EnrollmentState } from "./actions";
import { ENROLLMENT_ORIGIN_LABEL, ENROLLMENT_STATUS_LABEL } from "@/lib/enrollments";
import { Button } from "@/components/ui/Button";
import { SelectField, TextAreaField, TextField } from "@/components/ui/Field";
import { Alert } from "@/components/ui/misc";

type ModuleOption = { id: string; title: string; group: string };

const ORIGINS = Object.entries(ENROLLMENT_ORIGIN_LABEL);
const CREATE_ORIGINS = ORIGINS.filter(([value]) => value !== "LICENCA");
const STATUSES = Object.entries(ENROLLMENT_STATUS_LABEL);
const small = "min-h-9 rounded-md border border-border-strong bg-bg px-2 text-xs text-text";

export function CreateEnrollmentForm({ modules, defaultEmail }: { modules: ModuleOption[]; defaultEmail?: string }) {
  const [state, action, pending] = useActionState<EnrollmentState, FormData>(createEnrollmentAction, {});
  const groups = [...new Set(modules.map((m) => m.group))];
  return (
    <form action={action} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {(state.error || state.ok) && (
        <div className="md:col-span-2 xl:col-span-4">
          {state.error ? <Alert tone="danger">{state.error}</Alert> : <Alert tone="success">{state.message}</Alert>}
        </div>
      )}
      <TextField label="E-mail do aluno" name="email" type="email" required defaultValue={defaultEmail} />
      <SelectField label="Curso" name="moduleId" required defaultValue="">
        <option value="" disabled>Selecione…</option>
        {groups.map((g) => (
          <optgroup key={g} label={g}>
            {modules.filter((m) => m.group === g).map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
          </optgroup>
        ))}
      </SelectField>
      <SelectField label="Origem" name="origin" defaultValue="ATRIBUICAO">
        {CREATE_ORIGINS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </SelectField>
      <TextField label="Acesso até" name="endsAt" type="date" hint="Deixe vazio para acesso sem prazo." />
      <div className="md:col-span-2 xl:col-span-3">
        <TextAreaField label="Observação interna" name="note" maxLength={500} rows={2} className="min-h-11" hint="Ex.: pagamento recebido por transferência, bolsa, turma." />
      </div>
      <div className="flex items-start pt-7">
        <Button type="submit" loading={pending}>Matricular</Button>
      </div>
    </form>
  );
}

export function EnrollmentEditor({
  enrollment,
}: {
  enrollment: { id: string; status: keyof typeof ENROLLMENT_STATUS_LABEL; origin: keyof typeof ENROLLMENT_ORIGIN_LABEL; endsAt: string; note: string };
}) {
  const [state, action, pending] = useActionState<EnrollmentState, FormData>(updateEnrollmentAction, {});
  return (
    <form action={action} className="flex min-w-[26rem] flex-wrap items-end gap-2">
      <input type="hidden" name="enrollmentId" value={enrollment.id} />
      <label className="flex flex-col gap-1 text-xs text-text-muted">
        Situação
        <select name="status" defaultValue={enrollment.status} className={small}>
          {STATUSES.map(([value, s]) => <option key={value} value={value}>{s.label}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-text-muted">
        Origem
        <select name="origin" defaultValue={enrollment.origin} className={small}>
          {ORIGINS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-text-muted">
        Acesso até
        <input type="date" name="endsAt" defaultValue={enrollment.endsAt} className={small} />
      </label>
      <label className="flex grow flex-col gap-1 text-xs text-text-muted">
        Observação
        <input name="note" defaultValue={enrollment.note} maxLength={500} className={small} />
      </label>
      <Button size="sm" variant="ghost" type="submit" loading={pending}>Salvar</Button>
      {state.error && <span role="alert" className="w-full text-xs text-danger">{state.error}</span>}
      {state.ok && <span role="status" className="w-full text-xs text-success">{state.message}</span>}
    </form>
  );
}
