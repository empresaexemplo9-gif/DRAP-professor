"use client";
import { useActionState, useState } from "react";
import type { LevelKind } from "@prisma/client";
import { saveModuleAction, type ActionState } from "./actions";
import { Button } from "@/components/ui/Button";
import { CheckboxField, SelectField, TextAreaField, TextField } from "@/components/ui/Field";
import { Alert } from "@/components/ui/misc";

type Option = { id: string; label: string; kind?: LevelKind };
type ModuleValues = {
  id?: string;
  levelId?: string;
  segmentId?: string;
  title?: string;
  slug?: string;
  summary?: string;
  workloadHours?: number;
  certificateType?: string;
  order?: number;
  levelConfig?: Record<string, unknown>;
};

export function ModuleForm({ levels, segments, values = {} }: { levels: Option[]; segments: Option[]; values?: ModuleValues }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveModuleAction, {});
  const [levelId, setLevelId] = useState(values.levelId ?? levels[0]?.id ?? "");
  const kind = levels.find((l) => l.id === levelId)?.kind;
  const fe = state.fieldErrors ?? {};
  const cfg = (values.levelId === levelId ? values.levelConfig : undefined) ?? {};
  const str = (k: string, d = "") => String(cfg[k] ?? d);
  return (
    <form action={action} className="space-y-6">
      {state.ok && <Alert tone="success">{state.message}</Alert>}
      {state.error && <Alert tone="danger">{state.error}</Alert>}
      {values.id && <input type="hidden" name="id" value={values.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField label="Nível" name="levelId" value={levelId} onChange={(e) => setLevelId(e.target.value)} error={fe.levelId}>
          {levels.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
        </SelectField>
        <SelectField label="Segmento" name="segmentId" defaultValue={values.segmentId} error={fe.segmentId}>
          {segments.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </SelectField>
      </div>
      <TextField label="Título" name="title" defaultValue={values.title} required error={fe.title} />
      <TextField label="Endereço (slug)" name="slug" defaultValue={values.slug} hint="Opcional — gerado a partir do título. Ao alterar, o endereço antigo redireciona para o novo." error={fe.slug} />
      <TextAreaField label="Resumo" name="summary" defaultValue={values.summary} error={fe.summary} />
      <div className="grid gap-4 sm:grid-cols-3">
        <TextField label="Carga horária (horas)" name="workloadHours" type="number" step="0.5" min={0} defaultValue={values.workloadHours ?? 0} error={fe.workloadHours} />
        <SelectField label="Tipo de certificado" name="certificateType" defaultValue={values.certificateType ?? "LIVRE"} hint="Declara corretamente a natureza do curso." error={fe.certificateType}>
          <option value="LIVRE">Curso livre</option>
          <option value="CAPACITACAO">Capacitação profissional</option>
          <option value="EXTENSAO">Extensão (só com IES parceira)</option>
        </SelectField>
        <TextField label="Ordem" name="order" type="number" min={0} defaultValue={values.order ?? 0} error={fe.order} />
      </div>

      <fieldset className="space-y-4 rounded-lg border border-border p-4">
        <legend className="px-2 font-display text-lg text-text">Configuração do nível</legend>
        {kind === "MENTORIA" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField label="Formato" name="cfg.sessionFormat" defaultValue={str("sessionFormat", "INDIVIDUAL")}>
              <option value="INDIVIDUAL">Individual</option>
              <option value="GRUPO">Em grupo</option>
            </SelectField>
            <TextField label="Encontros previstos" name="cfg.plannedSessions" type="number" min={1} defaultValue={str("plannedSessions", "4")} error={fe["cfg.plannedSessions"]} />
            <TextField label="Duração do encontro (min)" name="cfg.sessionMinutes" type="number" min={15} defaultValue={str("sessionMinutes", "60")} error={fe["cfg.sessionMinutes"]} />
            <TextField label="Link da videochamada" name="cfg.videoCallUrl" type="url" defaultValue={str("videoCallUrl")} error={fe["cfg.videoCallUrl"]} />
          </div>
        )}
        {kind === "TREINAMENTO" && (
          <div className="grid gap-4 sm:grid-cols-3">
            <TextField label="Público/equipe" name="cfg.targetAudience" defaultValue={str("targetAudience")} />
            <TextField label="Prazo de conclusão (dias)" name="cfg.deadlineDays" type="number" min={1} defaultValue={str("deadlineDays", "30")} error={fe["cfg.deadlineDays"]} />
            <TextField label="Meta da equipe (% aprovados)" name="cfg.teamGoalPercent" type="number" min={0} max={100} defaultValue={str("teamGoalPercent", "90")} error={fe["cfg.teamGoalPercent"]} />
          </div>
        )}
        {kind === "CURSO" && (
          <div className="grid gap-4 sm:grid-cols-3">
            <CheckboxField label="Assuntos sequenciais" name="cfg.sequential" defaultChecked={cfg.sequential !== false} />
            <CheckboxField label="Avaliação final" name="cfg.finalExam" defaultChecked={cfg.finalExam !== false} />
            <TextField label="Nota mínima (%)" name="cfg.minScore" type="number" min={0} max={100} defaultValue={str("minScore", "70")} error={fe["cfg.minScore"]} />
          </div>
        )}
        {kind === "AULA" && (
          <div className="grid gap-4 sm:grid-cols-3">
            <SelectField label="Formato" name="cfg.format" defaultValue={str("format", "GRAVADA")}>
              <option value="GRAVADA">Gravada</option>
              <option value="AO_VIVO">Ao vivo</option>
            </SelectField>
            <TextField label="Data e hora (ao vivo)" name="cfg.liveAt" type="datetime-local" defaultValue={str("liveAt")} />
            <TextField label="Link da transmissão" name="cfg.liveUrl" type="url" defaultValue={str("liveUrl")} error={fe["cfg.liveUrl"]} />
          </div>
        )}
        {kind === "CAPACITACAO" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Frequência mínima (%)" name="cfg.minAttendancePercent" type="number" min={0} max={100} defaultValue={str("minAttendancePercent", "75")} error={fe["cfg.minAttendancePercent"]} />
            <TextField label="Nota mínima (%)" name="cfg.minScore" type="number" min={0} max={100} defaultValue={str("minScore", "70")} error={fe["cfg.minScore"]} />
          </div>
        )}
      </fieldset>
      <Button type="submit" loading={pending}>{values.id ? "Salvar módulo" : "Criar módulo"}</Button>
    </form>
  );
}
