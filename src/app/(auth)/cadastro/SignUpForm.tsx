"use client";
import Link from "next/link";
import { useActionState } from "react";
import { signUpAction, type FormState } from "../actions";
import { Button } from "@/components/ui/Button";
import { CheckboxField, TextField } from "@/components/ui/Field";
import { Alert } from "@/components/ui/misc";

export function SignUpForm({ invite, email }: { invite?: string; email?: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(signUpAction, {});
  if (state.ok) return <Alert tone="success">{state.message}</Alert>;
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4" noValidate>
      {state.error && <Alert tone="danger">{state.error}</Alert>}
      {invite && <input type="hidden" name="invite" value={invite} />}
      <TextField label="Nome completo" name="name" autoComplete="name" required error={fe.name} />
      <TextField label="E-mail" name="email" type="email" autoComplete="email" defaultValue={email} required error={fe.email} />
      <TextField
        label="Senha"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        hint="Mínimo de 10 caracteres."
        error={fe.password}
      />
      <div>
        <CheckboxField
          name="terms"
          label={
            <>
              Li e aceito os <Link href="/termos" target="_blank">Termos de Uso</Link> e a{" "}
              <Link href="/privacidade" target="_blank">Política de Privacidade</Link>.
            </>
          }
        />
        {fe.terms && <p className="text-sm text-danger" role="alert">{fe.terms}</p>}
      </div>
      <CheckboxField name="marketing" label="Quero receber novidades por e-mail (opcional)." />
      <Button type="submit" className="w-full" loading={pending}>
        Criar conta
      </Button>
      <p className="text-center text-sm text-text-muted">
        Já tem conta? <Link href="/entrar">Entrar</Link>
      </p>
    </form>
  );
}
