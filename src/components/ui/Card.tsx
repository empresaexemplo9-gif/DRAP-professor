import { clsx } from "clsx";
import type { HTMLAttributes } from "react";

type Props = HTMLAttributes<HTMLDivElement> & { variant?: "default" | "interactive" | "featured" };

export function Card({ variant = "default", className, ...rest }: Props) {
  return (
    <div
      className={clsx(
        "rounded-lg border bg-surface p-5 shadow-sm",
        variant === "default" && "border-border",
        variant === "interactive" &&
          "border-border transition-[border-color,box-shadow,transform] duration-[var(--drap-duration-base)] hover:-translate-y-0.5 hover:border-primary hover:shadow-glow",
        variant === "featured" && "border-accent",
        className,
      )}
      {...rest}
    />
  );
}
