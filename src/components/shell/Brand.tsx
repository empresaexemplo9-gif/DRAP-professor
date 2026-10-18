import Link from "next/link";

/** Marca padrão (D) desenhada como máscara: a cor vem do token --drap-brand-mark e acompanha o tema. */
export function BrandMark({ className = "size-9" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`block shrink-0 bg-brand-mark ${className}`}
      style={{
        maskImage: "url(/brand/logo-mark.png)",
        WebkitMaskImage: "url(/brand/logo-mark.png)",
        maskSize: "contain",
        WebkitMaskSize: "contain",
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        maskPosition: "center",
        WebkitMaskPosition: "center",
      }}
    />
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
      <span className="font-display text-xl text-text">{name}</span>
    </Link>
  );
}
