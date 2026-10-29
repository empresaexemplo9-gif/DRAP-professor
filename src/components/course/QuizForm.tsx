"use client";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { clsx } from "clsx";
import { saveAnswersAction, submitQuizAction } from "@/app/(site)/quiz-actions";
import { Button } from "@/components/ui/Button";
import { InlineText } from "@/content-blocks/BlockRenderer";
import { parseInline } from "@/content-blocks/inline";

type Item = { questionId: string; isCase?: boolean; stem: string; options: { key: string; text: string }[] };

function format(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/** Prova em andamento: cronômetro, salvamento automático e entrega automática ao fim do tempo. */
export function QuizForm({
  attemptId,
  path,
  title,
  number,
  cycle,
  deadline,
  items,
  saved,
}: {
  attemptId: string;
  path: string;
  title: string;
  number: number;
  cycle: number;
  deadline: string;
  items: Item[];
  saved: Record<string, string>;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>(saved);
  const [left, setLeft] = useState(() => new Date(deadline).getTime() - Date.now());
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const submitted = useRef(false);
  const answersRef = useRef(answers);
  answersRef.current = answers;

  const submit = useCallback(() => {
    if (submitted.current) return;
    submitted.current = true;
    start(() => submitQuizAction({ attemptId, answers: answersRef.current, path }));
  }, [attemptId, path]);

  useEffect(() => {
    const t = setInterval(() => {
      const ms = new Date(deadline).getTime() - Date.now();
      setLeft(ms);
      if (ms <= 0) submit();
    }, 1000);
    return () => clearInterval(t);
  }, [deadline, submit]);

  useEffect(() => {
    if (submitted.current) return;
    const t = setTimeout(() => void saveAnswersAction({ attemptId, answers }).catch(() => undefined), 800);
    return () => clearTimeout(t);
  }, [answers, attemptId]);

  const answered = items.filter((i) => answers[i.questionId]).length;
  const low = left < 2 * 60_000;

  return (
    <div className="space-y-6">
      <header className="sticky top-16 z-10 -mx-4 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-bg/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-lg sm:border">
        <div>
          <p className="text-xs uppercase tracking-widest text-accent-text">
            Prova · ciclo {cycle} · tentativa {number}
          </p>
          <h1 className="font-display text-xl text-text">{title}</h1>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-text-muted">
            {answered}/{items.length} respondidas
          </span>
          <span role="timer" aria-live="off" aria-label="Tempo restante" className={clsx("rounded-md border px-3 py-1 font-mono text-base", low ? "border-danger text-danger" : "border-border text-text")}>
            {format(left)}
          </span>
        </div>
      </header>

      <ol className="space-y-6">
        {items.map((it, i) => (
          <li key={it.questionId} className="rounded-xl border border-border bg-surface p-5 sm:p-6">
            <fieldset>
              <legend className="mb-4 text-text">
                <span className="mb-2 block text-xs font-medium uppercase tracking-widest text-text-muted">
                  Questão {i + 1}
                  {it.isCase ? " · estudo de caso" : ""}
                </span>
                <span className="whitespace-pre-line"><InlineText text={parseInline(it.stem)} /></span>
              </legend>
              <div className="space-y-2">
                {it.options.map((o) => {
                  const checked = answers[it.questionId] === o.key;
                  return (
                    <label
                      key={o.key}
                      className={clsx(
                        "flex min-h-11 cursor-pointer gap-3 rounded-md border px-3 py-2.5 text-sm text-text",
                        checked ? "border-primary bg-surface-raised" : "border-border hover:border-border-strong",
                      )}
                    >
                      <input
                        type="radio"
                        name={it.questionId}
                        value={o.key}
                        checked={checked}
                        onChange={() => setAnswers((a) => ({ ...a, [it.questionId]: o.key }))}
                        className="mt-0.5 accent-[var(--drap-primary-strong)]"
                      />
                      <span>
                        <strong className="mr-1">{o.key})</strong>
                        <InlineText text={parseInline(o.text)} />
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          </li>
        ))}
      </ol>

      <div className="flex flex-col gap-3 rounded-xl border border-accent bg-surface p-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-text-muted">
          {answered < items.length ? `Faltam ${items.length - answered} questões. Questões em branco contam como erro.` : "Todas as questões respondidas."} As respostas são salvas automaticamente.
        </p>
        {confirming ? (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setConfirming(false)} disabled={pending}>
              Voltar
            </Button>
            <Button onClick={submit} loading={pending}>
              Confirmar entrega
            </Button>
          </div>
        ) : (
          <Button onClick={() => setConfirming(true)} disabled={pending}>
            Entregar prova
          </Button>
        )}
      </div>
    </div>
  );
}
