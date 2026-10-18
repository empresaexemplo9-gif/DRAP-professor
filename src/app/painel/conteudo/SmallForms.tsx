"use client";
import { useActionState } from "react";
import { addStaffAction, createTopicAction, enrollByEmailAction, type ActionState } from "./actions";
import { Button } from "@/components/ui/Button";
import { SelectField, TextField } from "@/components/ui/Field";
import { Alert } from "@/components/ui/misc";

export function NewTopicForm({ moduleId }: { moduleId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(createTopicAction, {});
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[1fr_9rem_auto] sm:items-end">
      <input type="hidden" name="moduleId" value={moduleId} />
      <TextField label="Título do novo assunto" name="title" required error={fe.title ?? fe.slug} />
      <TextField label="Duração (min)" name="durationMinutes" type="number" min={0} defaultValue={30} />
      <Button type="submit" loading={pending}>Adicionar</Button>
    </form>
  );
}

export function EnrollForm({ moduleId }: { moduleId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(enrollByEmailAction, {});
  return (
    <form action={action} className="space-y-3">
      {state.ok && <Alert tone="success">{state.message}</Alert>}
      <input type="hidden" name="moduleId" value={moduleId} />
      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <TextField label="E-mail do aluno" name="email" type="email" required error={state.fieldErrors?.email} />
        <Button type="submit" loading={pending}>Matricular</Button>
      </div>
    </form>
  );
}

export function StaffForm({ moduleId }: { moduleId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(addStaffAction, {});
  return (
    <form action={action} className="space-y-3">
      {state.ok && <Alert tone="success">{state.message}</Alert>}
      <input type="hidden" name="moduleId" value={moduleId} />
      <div className="grid gap-3 sm:grid-cols-[1fr_10rem_auto] sm:items-end">
        <TextField label="E-mail" name="email" type="email" required error={state.fieldErrors?.email} />
        <SelectField label="Função" name="role" defaultValue="INSTRUTOR">
          <option value="AUTOR">Autor</option>
          <option value="INSTRUTOR">Instrutor</option>
          <option value="MENTOR">Mentor</option>
        </SelectField>
        <Button type="submit" loading={pending}>Adicionar</Button>
      </div>
    </form>
  );
}
