"use client";
import { authClient } from "@/lib/auth-client";

export function SignOutButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        await authClient.signOut();
        window.location.href = "/entrar";
      }}
    >
      Sair
    </button>
  );
}
