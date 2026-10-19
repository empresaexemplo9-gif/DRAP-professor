"use client";
import { useActionState } from "react";
import { acceptInviteAction, type FormState } from "../../actions";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/misc";

export function AcceptInviteForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(acceptInviteAction, {});
  return (
    <form action={action} className="space-y-3">
      {state.error && <Alert tone="danger">{state.error}</Alert>}
      <input type="hidden" name="invite" value={token} />
      <Button type="submit" className="w-full" loading={pending}>Aceitar convite</Button>
    </form>
  );
}
