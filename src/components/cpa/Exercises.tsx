"use client";
import { useState } from "react";
import { InlineText } from "@/content-blocks/BlockRenderer";
import { parseInline } from "@/content-blocks/inline";

/** Exercícios de fixação: o aluno tenta resolver e depois revela a resolução comentada. */
export function Exercises({ items }: { items: { id: string; prompt: string; answer: string }[] }) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  return (
    <ol className="space-y-4">
      {items.map((e, i) => (
        <li key={e.id} className="rounded-lg border border-border bg-surface p-4">
          <p className="text-xs font-medium uppercase tracking-widest text-text-muted">Exercício {i + 1}</p>
          <p className="mt-1 whitespace-pre-line text-text">
            <InlineText text={parseInline(e.prompt)} />
          </p>
          <button
            type="button"
            aria-expanded={open.has(e.id)}
            className="mt-3 min-h-11 text-sm text-primary-text underline"
            onClick={() => setOpen((s) => new Set(s.has(e.id) ? [...s].filter((x) => x !== e.id) : [...s, e.id]))}
          >
            {open.has(e.id) ? "Ocultar resolução" : "Ver resolução"}
          </button>
          {open.has(e.id) && (
            <p className="mt-2 whitespace-pre-line rounded-md border-l-4 border-accent bg-surface-raised p-3 text-sm text-text">
              <InlineText text={parseInline(e.answer)} />
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}
