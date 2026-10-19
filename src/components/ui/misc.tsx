import Link from "next/link";
import { clsx } from "clsx";
import type { ReactNode } from "react";

export function PageHeader({ title, description, actions, eyebrow }: { title: string; description?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <div className="mb-2 text-sm font-medium uppercase tracking-widest text-accent-text">{eyebrow}</div>}
        <h1 className="font-display text-3xl text-text sm:text-4xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export type Crumb = { href?: string; label: string };

export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Trilha de navegação" className="mb-4 text-sm text-text-muted">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((c, i) => (
          <li key={i} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden>›</span>}
            {c.href && i < items.length - 1 ? (
              <Link href={c.href} className="text-text-muted no-underline hover:text-primary-text">
                {c.label}
              </Link>
            ) : (
              <span aria-current={i === items.length - 1 ? "page" : undefined} className="text-text">
                {c.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function ProgressBar({ value, label }: { value: number; label: string }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-text-muted">
        <span>{label}</span>
        <span>{v}%</span>
      </div>
      <div role="progressbar" aria-label={label} aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} className="h-2 overflow-hidden rounded-full bg-surface-raised">
        <div className="h-full rounded-full bg-primary transition-[width] duration-[var(--drap-duration-slow)]" style={{ width: `${v}%` }} />
      </div>
    </div>
  );
}

export function EmptyState({ title, text, action, icon = "◇" }: { title: string; text: ReactNode; action?: ReactNode; icon?: string }) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-dashed border-border-strong bg-surface px-6 py-12 text-center">
      <div aria-hidden className="mb-3 text-3xl text-accent">
        {icon}
      </div>
      <h2 className="font-display text-xl text-text">{title}</h2>
      <p className="mt-2 max-w-md text-text-muted">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Alert({ tone = "info", children }: { tone?: "info" | "success" | "warning" | "danger"; children: ReactNode }) {
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={clsx(
        "rounded-md border-l-4 bg-surface p-4 text-sm",
        tone === "info" && "border-primary",
        tone === "success" && "border-success",
        tone === "warning" && "border-warning",
        tone === "danger" && "border-danger",
      )}
    >
      {children}
    </div>
  );
}

/** Tabela responsiva: rola dentro do próprio bloco, nunca a página. */
export function DataTable({ head, children, caption }: { head: ReactNode[]; children: ReactNode; caption?: string }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full border-collapse text-left text-sm">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead className="bg-surface-raised text-text-muted">
          <tr>
            {head.map((h, i) => (
              <th key={i} scope="col" className="whitespace-nowrap border-b border-border px-4 py-3 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&>tr]:border-b [&>tr]:border-border [&>tr:last-child]:border-0 [&_td]:px-4 [&_td]:py-3">{children}</tbody>
      </table>
    </div>
  );
}

export function LinkTabs({ items, current }: { items: { href: string; label: string; key: string }[]; current: string }) {
  return (
    <nav aria-label="Abas" className="mb-6 overflow-x-auto border-b border-border">
      <ul className="flex min-w-max gap-1">
        {items.map((t) => (
          <li key={t.key}>
            <Link
              href={t.href}
              aria-current={t.key === current ? "page" : undefined}
              className={clsx(
                "inline-flex min-h-11 items-center border-b-2 px-4 text-sm font-medium no-underline transition-colors duration-[var(--drap-duration-fast)]",
                t.key === current ? "border-accent text-text" : "border-transparent text-text-muted hover:text-text",
              )}
            >
              {t.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
