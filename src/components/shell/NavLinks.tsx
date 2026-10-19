"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { Icon } from "@/components/ui/Icon";

export type NavLinkItem = { href: string; label: string; icon: string };

export function NavLinks({ items, onNavigate }: { items: NavLinkItem[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <ul className="space-y-0.5">
      {items.map((item) => {
        const active = item.href === "/painel" ? pathname === "/painel" : pathname.startsWith(item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={clsx(
                "flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium no-underline transition-colors duration-[var(--drap-duration-fast)]",
                active ? "bg-surface-raised text-text shadow-sm" : "text-text-muted hover:bg-surface-raised hover:text-text",
              )}
            >
              <span className={active ? "text-accent" : ""}>
                <Icon name={item.icon} />
              </span>
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
