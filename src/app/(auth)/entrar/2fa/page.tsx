"use client";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/Button";
import { TextField, CheckboxField } from "@/components/ui/Field";
import { Alert } from "@/components/ui/misc";

export default function TwoFactorPage() {
  const [error, setError] = useState<string | null>(null);
  const [useBackup, setUseBackup] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const code = String(fd.get("code")).trim();
    const trustDevice = fd.get("trust") === "on";
    const res = useBackup
      ? await authClient.twoFactor.verifyBackupCode({ code, trustDevice })
      : await authClient.twoFactor.verifyTotp({ code, trustDevice });
    setLoading(false);
    if (res.error) return setError("Código inválido ou expirado.");
    window.location.href = "/painel";
  }

  return (
    <>
      <h1 className="font-display text-3xl text-text">Verificação em duas etapas</h1>
      <p className="mt-1 text-sm text-text-muted">
        {useBackup ? "Digite um dos seus códigos de recuperação." : "Digite o código de 6 dígitos do seu aplicativo autenticador."}
      </p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        {error && <Alert tone="danger">{error}</Alert>}
        <TextField label="Código" name="code" inputMode={useBackup ? "text" : "numeric"} autoComplete="one-time-code" required autoFocus />
        <CheckboxField label="Confiar neste dispositivo por 30 dias" name="trust" />
        <Button type="submit" className="w-full" loading={loading}>
          Verificar
        </Button>
      </form>
      <button type="button" className="mt-4 text-sm text-primary-text underline" onClick={() => setUseBackup((v) => !v)}>
        {useBackup ? "Usar o aplicativo autenticador" : "Usar um código de recuperação"}
      </button>
    </>
  );
}
