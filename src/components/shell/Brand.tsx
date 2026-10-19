import Link from "next/link";

/** Mantém a geometria original da marca DRAP; a cor vem da identidade do campus. */
export function BrandMark({ className = "size-9" }: { className?: string }) {
  return <span aria-hidden className={`brand-mark block shrink-0 ${className}`} />;
}

export function Brand({ name }: { name: string; logoUrl?: string | null }) {
  return (
    <Link href="/" className="flex items-center gap-2.5 no-underline">
      <BrandMark />
      <span className="flex min-w-0 flex-col leading-none">
        <span className="text-xl font-medium tracking-[0.18em] text-text">
          {name === "DRAP Professor" ? "DRAP" : name}
        </span>
        <span className="mt-1.5 text-[9px] font-medium uppercase tracking-[0.21em] text-text-muted">
          {name === "DRAP Professor" ? "Professor" : "Campus digital"}
        </span>
      </span>
    </Link>
  );
}
