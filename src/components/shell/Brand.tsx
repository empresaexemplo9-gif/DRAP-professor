import Link from "next/link";

/** Monograma vetorial: a cor acompanha o tema, sem fundo rasterizado. */
export function BrandMark({ className = "size-9" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 44 44" fill="currentColor" className={`block shrink-0 text-brand-mark ${className}`}>
      <path d="M12 3h12c12 0 19 7 19 18s-8 20-21 20H8l4-9h10c8 0 12-4 12-11s-4-10-11-10H8l4-8Z" />
      <path d="M9 15h10L10 36H0l9-21Z" />
    </svg>
  );
}

export function Brand({ name, logoUrl }: { name: string; logoUrl?: string | null }) {
  return (
    <Link href="/" className="flex items-center gap-2.5 no-underline">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="" className="h-8 w-auto" />
      ) : (
        <BrandMark />
      )}
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
