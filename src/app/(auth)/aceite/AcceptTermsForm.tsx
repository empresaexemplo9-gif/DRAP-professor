"use client";
import Link from "next/link";
import { useActionState } from "react";
import { acceptTermsAction, type FormState } from "../actions";
import { Button } from "@/components/ui/Button";
import { CheckboxField } from "@/components/ui/Field";
import { Alert } from "@/components/ui/misc";

export function AcceptTermsForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(acceptTermsAction, {});
  return (
    <form action={action} className="space-y-4">
      {state.error && <Alert tone="danger">{state.error}</Alert>}
      <CheckboxField
        name="terms"
        label={
          <>
            Li e aceito os <Link href="/termos" target="_blank">Termos de Uso</Link> e a{" "}
            <Link href="/privacidade" target="_blank">Política de Privacidade</Link>.
          </>
        }
      />
      <CheckboxField name="marketing" label="Quero receber novidades por e-mail (opcional)." />
      <Button type="submit" className="w-full" loading={pending}>Continuar</Button>
    </form>
  );
}
