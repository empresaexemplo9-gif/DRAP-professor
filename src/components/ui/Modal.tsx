"use client";
import * as Dialog from "@radix-ui/react-dialog";
import type { ReactNode } from "react";

export function Modal({
  trigger,
  title,
  description,
  children,
  open,
  onOpenChange,
}: {
  trigger?: ReactNode;
  title: string;
  description?: string;
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>}
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-bg/80 backdrop-blur-sm data-[state=open]:animate-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-border bg-surface p-6 shadow-md">
          <Dialog.Title className="font-display text-2xl text-text">{title}</Dialog.Title>
          {description && <Dialog.Description className="mt-1 text-sm text-text-muted">{description}</Dialog.Description>}
          <div className="mt-5">{children}</div>
          <Dialog.Close className="absolute right-3 top-3 inline-flex size-11 items-center justify-center rounded-md text-text-muted hover:bg-surface-raised hover:text-text" aria-label="Fechar">
            ✕
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
