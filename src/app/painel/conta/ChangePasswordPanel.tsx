"use client";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { Alert } from "@/components/ui/misc";

export function ChangePasswordPanel() {
  const [msg, setMsg] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const newPassword = String(fd.get("newPassword"));
    if (newPassword.length < 10) return setMsg({ tone: "danger", text: "A nova senha precisa de pelo menos 10 caracteres." });
    if (newPassword !== String(fd.get("confirm"))) return setMsg({ tone: "danger", text: "A confirmação não confere." });
    setLoading(true);
    const res = await authClient.changePassword({ currentPassword: String(fd.get("currentPassword")), newPassword, revokeOtherSessions: true });
    setLoading(false);
    if (res.error)
      return setMsg({ tone: "danger", text: res.error.code === "INVALID_PASSWORD" ? "Senha atual incorreta." : "Não foi possível alterar a senha. Tente novamente." });
    form.reset();
    setMsg({ tone: "success", text: "Senha alterada. As outras sessões foram encerradas." });
  }
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
      <TextField label="Senha atual" name="currentPassword" type="password" autoComplete="current-password" required />
      <TextField label="Nova senha" name="newPassword" type="password" autoComplete="new-password" required hint="Mínimo de 10 caracteres." />
      <TextField label="Confirme a nova senha" name="confirm" type="password" autoComplete="new-password" required />
      <Button type="submit" loading={loading}>Alterar senha</Button>
    </form>
  );
}
