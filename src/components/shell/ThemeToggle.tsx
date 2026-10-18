"use client";
import { useEffect, useState } from "react";

const OPTIONS = [
  { value: "dark", label: "Escuro" },
  { value: "light", label: "Claro" },
  { value: "system", label: "Sistema" },
] as const;

export function ThemeToggle() {
  const [value, setValue] = useState<string>("dark");
  useEffect(() => {
    setValue(document.documentElement.dataset.theme ?? "dark");
  }, []);
  function choose(v: string) {
    setValue(v);
    document.documentElement.dataset.theme = v;
    document.cookie = `drap-theme=${v}; path=/; max-age=31536000; samesite=lax`;
  }
  return (
    <div role="radiogroup" aria-label="Tema da interface" className="inline-flex rounded-md border border-border bg-surface p-0.5">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => choose(o.value)}
          className={`min-h-9 rounded-sm px-2.5 text-xs font-medium transition-colors duration-[var(--drap-duration-fast)] ${
            value === o.value ? "bg-surface-raised text-text" : "text-text-muted hover:text-text"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
