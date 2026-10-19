"use client";
import Link from "next/link";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { Alert } from "@/components/ui/misc";

export function SignInForm({ googleEnabled, invite }: { googleEnabled: boolean; invite?: string }) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const next = invite ? `/convite/${encodeURIComponent(invite)}` : "/painel";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const { data, error } = await authClient.signIn.email({
      email: String(fd.get("email")),
      password: String(fd.get("password")),
    });
    setLoading(false);
    if (error) {
      setError(
        error.status === 403
          ? "Confirme seu e-mail antes de entrar."
          : error.status === 429
            ? "Muitas tentativas. Aguarde alguns minutos."
            : "E-mail ou senha incorretos.",
      );
      return;
    }
    if (data && "twoFactorRedirect" in data && data.twoFactorRedirect) return; // redirecionado para /entrar/2fa
    window.location.href = next;
  }

  return (
    <div className="space-y-5">
      {error && <Alert tone="danger">{error}</Alert>}
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <TextField label="E-mail" name="email" type="email" autoComplete="email" required />
        <TextField label="Senha" name="password" type="password" autoComplete="current-password" required />
        <Button type="submit" className="w-full" loading={loading}>
          Entrar
        </Button>
      </form>
      {googleEnabled && (
        <Button
          variant="secondary"
          className="w-full"
          onClick={() => authClient.signIn.social({ provider: "google", callbackURL: next })}
        >
          Entrar com Google
        </Button>
      )}
      <div className="flex justify-between text-sm">
        <Link href="/recuperar-senha">Esqueci a senha</Link>
        <Link href={invite ? `/cadastro?convite=${encodeURIComponent(invite)}` : "/cadastro"}>Criar conta</Link>
      </div>
    </div>
  );
}
