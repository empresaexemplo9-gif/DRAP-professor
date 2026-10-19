"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { Alert } from "@/components/ui/misc";

function ResetForm() {
  const token = useSearchParams().get("token");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  if (!token) return <Alert tone="danger">Link inválido ou expirado. Solicite um novo.</Alert>;
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const password = String(new FormData(e.currentTarget).get("password"));
    if (password.length < 10) return setError("A senha precisa de pelo menos 10 caracteres.");
    setLoading(true);
    const res = await authClient.resetPassword({ newPassword: password, token: token! });
    setLoading(false);
    if (res.error) return setError("Link inválido ou expirado. Solicite um novo.");
    setDone(true);
  }
  if (done) return <Alert tone="success">Senha alterada. <Link href="/entrar">Entrar</Link></Alert>;
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && <Alert tone="danger">{error}</Alert>}
      <TextField label="Nova senha" name="password" type="password" autoComplete="new-password" required hint="Mínimo de 10 caracteres." />
      <Button type="submit" className="w-full" loading={loading}>Salvar nova senha</Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <>
      <h1 className="mb-6 font-display text-3xl text-text">Nova senha</h1>
      <Suspense>
        <ResetForm />
      </Suspense>
    </>
  );
}
