"use client";
import { useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { Alert } from "@/components/ui/misc";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const email = String(new FormData(e.currentTarget).get("email"));
    await authClient.requestPasswordReset({ email, redirectTo: "/redefinir-senha" });
    setLoading(false);
    setSent(true); // mesma resposta exista ou não a conta
  }
  return (
    <>
      <h1 className="font-display text-3xl text-text">Recuperar senha</h1>
      {sent ? (
        <div className="mt-6">
          <Alert tone="success">Se houver uma conta com este e-mail, você receberá um link para criar uma nova senha.</Alert>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <TextField label="E-mail" name="email" type="email" autoComplete="email" required />
          <Button type="submit" className="w-full" loading={loading}>
            Enviar link
          </Button>
        </form>
      )}
      <p className="mt-4 text-sm"><Link href="/entrar">Voltar para o login</Link></p>
    </>
  );
}
