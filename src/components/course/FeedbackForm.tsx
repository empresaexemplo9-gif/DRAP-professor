import { feedbackAction } from "@/app/(site)/quiz-actions";
import { Button } from "@/components/ui/Button";

const QUESTIONS = [
  { name: "clarity", label: "O conteúdo foi claro?" },
  { name: "applicability", label: "Consigo aplicar no meu trabalho?" },
  { name: "overall", label: "Avaliação geral do módulo" },
] as const;

/** Avaliação de reação (Kirkpatrick nível 1) — alimenta o painel de desempenho do curso. */
export function FeedbackForm({
  topicId,
  path,
  existing,
}: {
  topicId: string;
  path: string;
  existing: { clarity: number; applicability: number; overall: number; comment: string | null } | null;
}) {
  return (
    <section aria-labelledby="avaliacao" className="rounded-xl border border-border bg-surface p-5 sm:p-8">
      <h2 id="avaliacao" className="font-display text-xl text-text">Avalie este módulo</h2>
      <p className="mt-1 text-sm text-text-muted">{existing ? "Obrigado! Você pode atualizar sua avaliação." : "Leva 20 segundos e ajuda a melhorar o curso."}</p>
      <form action={feedbackAction} className="mt-4 space-y-4">
        <input type="hidden" name="topicId" value={topicId} />
        <input type="hidden" name="path" value={path} />
        {QUESTIONS.map((q) => (
          <fieldset key={q.name}>
            <legend className="mb-2 text-sm font-medium text-text">{q.label}</legend>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5].map((v) => (
                <label key={v} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-border px-3 text-sm text-text has-[:checked]:border-primary has-[:checked]:bg-surface-raised">
                  <input type="radio" name={q.name} value={v} required defaultChecked={existing?.[q.name] === v} className="accent-[var(--drap-primary-strong)]" />
                  {v}
                </label>
              ))}
            </div>
          </fieldset>
        ))}
        <label className="block text-sm text-text">
          Comentário (opcional)
          <textarea name="comment" defaultValue={existing?.comment ?? ""} maxLength={2000} className="mt-1.5 min-h-20 w-full rounded-md border border-border-strong bg-bg px-3 py-2 text-text" />
        </label>
        <Button type="submit" size="sm">{existing ? "Atualizar avaliação" : "Enviar avaliação"}</Button>
      </form>
    </section>
  );
}
