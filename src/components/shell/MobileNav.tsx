"use client";
import { useState, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Icon } from "@/components/ui/Icon";
import { NavLinks, type NavLinkItem } from "./NavLinks";

export function MobileNav({ items, children }: { items: NavLinkItem[]; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger
        className="inline-flex size-11 items-center justify-center rounded-md border border-border text-text"
        aria-label="Abrir menu"
      >
        <Icon name="menu" />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-bg/80" />
        <Dialog.Content
          aria-describedby={undefined}
          className="campus-sidebar fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-border bg-surface"
        >
          <Dialog.Title className="p-4 font-display text-lg text-text">Menu</Dialog.Title>
          <nav aria-label="Menu principal" className="flex-1 overflow-y-auto px-3">
            <NavLinks items={items} onNavigate={() => setOpen(false)} />
          </nav>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
