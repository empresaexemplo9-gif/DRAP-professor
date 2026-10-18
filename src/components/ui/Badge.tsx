import { clsx } from "clsx";
import type { ReactNode } from "react";

export type BadgeTone = "neutral" | "primary" | "gold" | "success" | "warning" | "danger";

const tones: Record<BadgeTone, string> = {
  neutral: "border-border-strong text-text-muted",
  primary: "border-primary text-primary-text",
  gold: "border-accent text-accent-text",
  success: "border-success text-success",
  warning: "border-warning text-warning",
  danger: "border-danger text-danger",
};

export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span className={clsx("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium", tones[tone])}>
      {children}
    </span>
  );
}

export const STATUS_LABEL = {
  RASCUNHO: { label: "Rascunho", tone: "neutral" },
  REVISAO: { label: "Em revisão", tone: "warning" },
  PUBLICADO: { label: "Publicado", tone: "success" },
  ARQUIVADO: { label: "Arquivado", tone: "danger" },
} as const satisfies Record<string, { label: string; tone: BadgeTone }>;

export function StatusBadge({ status }: { status: keyof typeof STATUS_LABEL }) {
  const s = STATUS_LABEL[status];
  return <Badge tone={s.tone}>{s.label}</Badge>;
}
