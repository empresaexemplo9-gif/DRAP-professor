"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";

const ITEMS = [
  { href: "/cpa", label: "Painel" },
  { href: "/cpa/aulas", label: "Aulas" },
  { href: "/cpa/apostila", label: "Apostila" },
  { href: "/cpa/simulados", label: "Simulados" },
  { href: "/cpa/revisoes", label: "Revisões" },
  { href: "/cpa/casos", label: "Casos de atendimento" },
  { href: "/cpa/desempenho", label: "Desempenho" },
  { href: "/cpa/plano", label: "Plano de estudo" },
];

export function CpaNav() {
  const path = usePathname();
  return (
    <nav aria-label="Preparatório CPA" className="-mx-4 overflow-x-auto px-4">
      <ul className="flex min-w-max gap-1 border-b border-border">
        {ITEMS.map((i) => {
          const active = i.href === "/cpa" ? path === "/cpa" : path.startsWith(i.href);
          return (
            <li key={i.href}>
              <Link
                href={i.href}
                aria-current={active ? "page" : undefined}
                className={clsx(
                  "inline-flex min-h-11 items-center border-b-2 px-3 text-sm no-underline",
                  active ? "border-primary font-medium text-text" : "border-transparent text-text-muted hover:text-text",
                )}
              >
                {i.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
