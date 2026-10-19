"use client";
import { useState } from "react";
import QRCode from "qrcode";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { Alert } from "@/components/ui/misc";

export function TwoFactorPanel({ enabled }: { enabled: boolean }) {
  const [step, setStep] = useState<"idle" | "password" | "verify" | "done">("idle");
  const [qr, setQr] = useState<string | null>(null);
  const [backup, setBackup] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [disabling, setDisabling] = useState(false);

  async function start(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const password = String(new FormData(e.currentTarget).get("password"));
    const res = disabling ? await authClient.twoFactor.disable({ password }) : await authClient.twoFactor.enable({ password });
    setLoading(false);
    if (res.error) return setError("Senha incorreta.");
    if (disabling) return window.location.reload();
    const data = res.data as { totpURI: string; backupCodes: string[] };
    setQr(await QRCode.toDataURL(data.totpURI, { margin: 1, width: 220 }));
    setBackup(data.backupCodes);
    setStep("verify");
  }

  async function verify(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const code = String(new FormData(e.currentTarget).get("code")).trim();
    const res = await authClient.twoFactor.verifyTotp({ code });
    setLoading(false);
    if (res.error) return setError("Código inválido. Confira o horário do celular e tente de novo.");
    setStep("done");
  }

  if (step === "done") return <Alert tone="success">Verificação em duas etapas ativada.</Alert>;
  if (step === "verify")
    return (
      <div className="space-y-4">
        <p className="text-sm text-text-muted">Escaneie o QR Code com um aplicativo autenticador (Google Authenticator, Microsoft Authenticator, 1Password…).</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {qr && <img src={qr} alt="QR Code para configurar o aplicativo autenticador" className="rounded-md border border-border" width={220} height={220} />}
        <div>
          <p className="text-sm font-medium text-text">Códigos de recuperação (guarde em local seguro):</p>
          <ul className="mt-2 grid grid-cols-2 gap-1 font-mono text-sm text-text">
            {backup.map((c) => <li key={c}>{c}</li>)}
          </ul>
        </div>
        <form onSubmit={verify} className="space-y-3">
          {error && <Alert tone="danger">{error}</Alert>}
          <TextField label="Código de 6 dígitos" name="code" inputMode="numeric" autoComplete="one-time-code" required />
          <Button type="submit" loading={loading}>Confirmar</Button>
        </form>
      </div>
    );
  if (step === "password")
    return (
      <form onSubmit={start} className="space-y-3">
        {error && <Alert tone="danger">{error}</Alert>}
        <TextField label="Confirme sua senha" name="password" type="password" autoComplete="current-password" required />
        <Button type="submit" loading={loading} variant={disabling ? "danger" : "primary"}>{disabling ? "Desativar" : "Continuar"}</Button>
      </form>
    );
  return (
    <div className="space-y-3">
      <p className="text-sm text-text-muted">
        {enabled ? "Ativada. Ao entrar, pediremos um código do seu aplicativo autenticador." : "Proteja sua conta exigindo um código do celular ao entrar."}
      </p>
      {enabled ? (
        <Button variant="danger" onClick={() => { setDisabling(true); setStep("password"); }}>Desativar</Button>
      ) : (
        <Button onClick={() => { setDisabling(false); setStep("password"); }}>Ativar</Button>
      )}
    </div>
  );
}
