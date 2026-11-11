"use client";
import { useState, useTransition } from "react";
import { checklistAction } from "@/app/(site)/cpa/actions";

/** Checklist de domínio: marcado pelo aluno e salvo no servidor (vale em qualquer dispositivo). */
export function Checklist({ lessonCode, items, initial }: { lessonCode: string; items: string[]; initial: string[] }) {
  const [done, setDone] = useState(new Set(initial));
  const [, start] = useTransition();
  const toggle = (item: string) => {
    const next = new Set(done);
    if (next.has(item)) next.delete(item);
    else next.add(item);
    setDone(next);
    start(() => checklistAction({ lessonCode, items: [...next] }));
  };
  return (
    <ul className="space-y-2">
      {items.map((it) => (
        <li key={it}>
          <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm text-text">
            <input type="checkbox" checked={done.has(it)} onChange={() => toggle(it)} className="mt-1" />
            {it}
          </label>
        </li>
      ))}
    </ul>
  );
}
