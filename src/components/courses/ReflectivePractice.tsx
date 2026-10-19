"use client";
import { useActionState, useState } from "react";
import { saveFinancialNotebookAction, type NotebookState } from "@/app/(site)/financial-actions";
import type { StudyQuestion } from "@/lib/courses/financial-practice";
import { Button } from "@/components/ui/Button";

export function ReflectivePractice({
  topicId,
  questions,
  answers,
  canSave,
}: {
  topicId: string;
  questions: StudyQuestion[];
  answers: Record<string, string>;
  canSave: boolean;
}) {
  const [state, action, pending] = useActionState<NotebookState, FormData>(saveFinancialNotebookAction, {});
  const [dirty, setDirty] = useState(false);
  const [drafts, setDrafts] = useState(answers);
  return (
    <section aria-labelledby="practice-title" className="my-10 rounded-lg border border-border bg-surface p-5 sm:p-7">
      <p className="eyebrow mb-2">Da leitura à análise</p>
      <h2 id="practice-title" className="font-display text-2xl text-text">
        Caderno de prática
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-text-muted">
        Escreva sua análise e compare com as orientações da apostila. As atividades são discursivas e de estudo; a
        avaliação formal exige revisão pedagógica. Salve o rascunho antes de mudar de página.
      </p>
      {!canSave && (
        <p className="mt-3 text-xs text-text-muted">
          Pré-visualização do conteúdo. O salvamento é exclusivo para alunos com matrícula ativa.
        </p>
      )}
      <form action={action} onChange={() => setDirty(true)} onSubmit={() => setDirty(false)} className="mt-7 space-y-7">
        <input type="hidden" name="topicId" value={topicId} />
        {questions.map((q, index) => (
          <div key={q.id} className="space-y-3">
            <p className="eyebrow">
              {String(index + 1).padStart(2, "0")} · {q.kind}
            </p>
            <label htmlFor={q.id} className="block text-sm font-medium leading-relaxed text-text">
              {q.prompt}
            </label>
            <textarea
              id={q.id}
              name={`answer.${q.id}`}
              value={drafts[q.id] ?? ""}
              onChange={(event) => setDrafts((current) => ({ ...current, [q.id]: event.target.value }))}
              maxLength={6000}
              rows={4}
              readOnly={!canSave}
              className="w-full rounded-md border border-border bg-bg p-3 text-sm leading-relaxed text-text"
            />
            <details className="rounded-md border border-border p-3">
              <summary className="cursor-pointer text-xs font-medium text-accent-text">
                Comparar com as orientações
              </summary>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-text-muted">{q.guidance}</p>
            </details>
          </div>
        ))}
        <div className="sticky bottom-3 rounded-md border border-border bg-surface p-4">
          {state.error && (
            <p role="alert" className="mb-3 text-sm text-danger">
              {state.error}
            </p>
          )}
          {state.message && !dirty && (
            <p role="status" className="mb-3 text-sm text-text">
              {state.message}
            </p>
          )}
          <Button type="submit" disabled={!canSave || pending}>
            {pending ? "Salvando…" : "Salvar rascunho"}
          </Button>
          <p className="mt-2 text-xs text-text-muted">
            Respostas privadas da sua conta. Use apenas dados fictícios ou anonimizados nos estudos de caso.
          </p>
        </div>
      </form>
    </section>
  );
}
