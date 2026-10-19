"use client";

import { clsx } from "clsx";
import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

const control =
  "w-full rounded-md border border-border-strong bg-bg px-3 py-2 text-text placeholder:text-text-muted transition-colors duration-[var(--drap-duration-fast)] hover:border-primary focus-visible:border-primary aria-[invalid=true]:border-danger min-h-11";

type FieldProps = { label: string; hint?: ReactNode; error?: string; children: (id: string, describedBy?: string) => ReactNode };

export function Field({ label, hint, error, children }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errId = error ? `${id}-err` : undefined;
  const describedBy = [hintId, errId].filter(Boolean).join(" ") || undefined;
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-text">
        {label}
      </label>
      {children(id, describedBy)}
      {hint && (
        <p id={hintId} className="text-xs text-text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errId} className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

type Common = { label: string; hint?: ReactNode; error?: string };

export function TextField({ label, hint, error, className, ...rest }: Common & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Field label={label} hint={hint} error={error}>
      {(id, describedBy) => (
        <input id={id} aria-describedby={describedBy} aria-invalid={error ? true : undefined} className={clsx(control, className)} {...rest} />
      )}
    </Field>
  );
}

export function TextAreaField({ label, hint, error, className, ...rest }: Common & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <Field label={label} hint={hint} error={error}>
      {(id, describedBy) => (
        <textarea id={id} aria-describedby={describedBy} aria-invalid={error ? true : undefined} className={clsx(control, "min-h-24", className)} {...rest} />
      )}
    </Field>
  );
}

export function SelectField({
  label,
  hint,
  error,
  className,
  children,
  ...rest
}: Common & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <Field label={label} hint={hint} error={error}>
      {(id, describedBy) => (
        <select id={id} aria-describedby={describedBy} aria-invalid={error ? true : undefined} className={clsx(control, className)} {...rest}>
          {children}
        </select>
      )}
    </Field>
  );
}

export function CheckboxField({ label, className, ...rest }: { label: ReactNode } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={clsx("flex min-h-11 cursor-pointer items-center gap-3 text-sm text-text", className)}>
      <input type="checkbox" className="size-5 accent-[var(--drap-primary-strong)]" {...rest} />
      <span>{label}</span>
    </label>
  );
}
