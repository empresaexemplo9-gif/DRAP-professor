import Link from "next/link";

/** Marca original da DRAP. Preserve o arquivo, a geometria e o teal da identidade. */
export function BrandMark({ className = "size-9" }: { className?: string }) {
  return (
    <span aria-hidden className={`block shrink-0 rounded-sm bg-campus-cream p-1 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/logo-mark.png" width={512} height={512} alt="" className="block size-full object-contain" />
    </span>
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
