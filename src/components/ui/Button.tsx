import Link from "next/link";
import { clsx } from "clsx";
import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "gold";
export type ButtonSize = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-[background-color,box-shadow,transform,color] duration-[var(--drap-duration-base)] active:translate-y-px disabled:pointer-events-none disabled:opacity-50 min-h-11";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-primary-strong text-text-on-primary hover:bg-primary hover:shadow-glow",
  secondary: "border border-border-strong bg-surface text-text hover:bg-surface-raised",
  ghost: "text-text hover:bg-surface-raised",
  danger: "border border-danger text-danger hover:bg-surface-raised",
  gold: "bg-accent text-text-on-accent hover:shadow-md",
};

const sizes: Record<ButtonSize, string> = {
  sm: "px-3 text-sm min-h-9",
  md: "px-4 text-base",
  lg: "px-6 text-lg",
};

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", extra?: string) {
  return clsx(base, variants[variant], sizes[size], extra);
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: ReactNode;
};

export function Button({ variant = "primary", size = "md", loading, className, children, disabled, ...rest }: Props) {
  return (
    <button className={buttonClass(variant, size, className)} disabled={disabled || loading} aria-busy={loading} {...rest}>
      {loading && (
        <span aria-hidden className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
      )}
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...rest
}: ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <Link className={clsx(buttonClass(variant, size, className), "no-underline")} {...rest} />;
}
