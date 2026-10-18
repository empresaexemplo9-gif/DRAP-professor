import Link from "next/link";

export function Brand({ name, logoUrl }: { name: string; logoUrl?: string | null }) {
  return (
    <Link href="/" className="flex items-center gap-2.5 no-underline">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="" className="h-8 w-auto" />
      ) : (
        <span aria-hidden className="flex size-9 items-center justify-center rounded-md border border-accent font-display text-lg text-accent">
          {name.slice(0, 1)}
        </span>
      )}
      <span className="font-display text-xl text-text">{name}</span>
    </Link>
  );
}
