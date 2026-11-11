"use client";
import { useState, useTransition } from "react";
import { clsx } from "clsx";
import { InlineText } from "@/content-blocks/BlockRenderer";
import { parseInline } from "@/content-blocks/inline";
import { Button } from "@/components/ui/Button";

type Check = { correct: boolean; correctKey: string; explanation: string; justifications: Record<string, string> } | null;

/**
 * Questão no modo estudo: o gabarito só chega do servidor depois da resposta.
 * `check` é a ação que corrige (questões da aula ou item de simulado no modo estudo).
 */
export function StudyQuestion({
  code,
  number,
  stem,
  options,
  check,
  initial,
}: {
  code: string;
  number: number;
  stem: string;
  options: { key: string; text: string }[];
  check: (answer: string) => Promise<Check>;
  initial?: string;
}) {
  const [answer, setAnswer] = useState(initial ?? "");
  const [result, setResult] = useState<Check>(null);
  const [pending, start] = useTransition();
  return (
    <fieldset className="rounded-lg border border-border bg-surface p-4 sm:p-5">
      <legend className="sr-only">Questão {number}</legend>
      <p className="mb-1 text-xs font-medium uppercase tracking-widest text-text-muted">
        Questão {number} <span className="font-mono normal-case">· {code}</span>
      </p>
      <p className="whitespace-pre-line text-text">
        <InlineText text={parseInline(stem)} />
      </p>
      <div className="mt-3 space-y-2">
        {options.map((o) => {
          const isRight = result && o.key === result.correctKey;
          const isWrongPick = result && o.key === answer && !result.correct;
          return (
            <label
              key={o.key}
              className={clsx(
                "flex min-h-11 cursor-pointer gap-3 rounded-md border px-3 py-2 text-sm text-text",
                isRight ? "border-success" : isWrongPick ? "border-danger" : answer === o.key ? "border-primary bg-surface-raised" : "border-border",
              )}
            >
              <input type="radio" name={`q-${code}`} value={o.key} checked={answer === o.key} disabled={Boolean(result)} onChange={() => setAnswer(o.key)} className="mt-0.5" />
              <span>
                <strong className="mr-1">{o.key})</strong>
                <InlineText text={parseInline(o.text)} />
                {result && <span className="mt-1 block text-xs text-text-muted">{result.justifications[o.key]}</span>}
              </span>
            </label>
          );
        })}
      </div>
      {result ? (
        <div className={clsx("mt-3 rounded-md border-l-4 p-3 text-sm text-text", result.correct ? "border-success" : "border-danger")} role="status">
          <p className="font-medium">{result.correct ? "Resposta correta." : `Resposta incorreta. Gabarito: ${result.correctKey}.`}</p>
          <p className="mt-1 whitespace-pre-line">{result.explanation}</p>
        </div>
      ) : (
        <Button size="sm" className="mt-3" disabled={!answer} loading={pending} onClick={() => start(async () => setResult(await check(answer)))}>
          Corrigir
        </Button>
      )}
    </fieldset>
  );
}
