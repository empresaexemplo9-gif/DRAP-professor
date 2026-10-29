"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/misc";

export function PixPaymentMonitor({ checkoutId, payload }: { checkoutId: string; payload: string }) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState("PENDING");

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const check = async () => {
      try {
        const response = await fetch(`/api/payments/pix/${encodeURIComponent(checkoutId)}`, { cache: "no-store" });
        if (!response.ok) throw new Error("status");
        const data = await response.json() as { status: string; coursePath: string };
        if (!active) return;
        setStatus(data.status);
        if (data.status === "PAID") {
          router.replace(data.coursePath);
          router.refresh();
          return;
        }
        if (data.status === "EXPIRED" || data.status === "FAILED" || data.status === "CANCELED") return;
      } catch {
        // Mantém a tela; o webhook ainda pode confirmar o pagamento.
      }
      if (active) timer = setTimeout(check, 8000);
    };
    void check();
    return () => { active = false; clearTimeout(timer); };
  }, [checkoutId, router]);

  async function copyPix() {
    try {
      await navigator.clipboard.writeText(payload);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="space-y-4">
      {status === "PENDING" ? <Alert tone="info">Aguardando a confirmação do pagamento. Esta página atualiza automaticamente.</Alert> : status === "EXPIRED" ? <Alert tone="warning">Este Pix expirou. Volte à página do curso para gerar outro.</Alert> : status === "CANCELED" ? <Alert tone="danger">Esta cobrança foi cancelada. Volte ao curso para gerar outro Pix.</Alert> : status === "FAILED" ? <Alert tone="danger">Não foi possível concluir esta cobrança. Volte ao curso para tentar novamente.</Alert> : null}
      <div className="space-y-2">
        <label htmlFor="pix-payload" className="text-sm font-medium text-text">Pix copia e cola</label>
        <textarea id="pix-payload" readOnly value={payload} rows={4} className="w-full rounded-md border border-border bg-bg p-3 text-xs text-text" />
        <Button type="button" variant="secondary" onClick={copyPix}>{copied ? "Código copiado" : "Copiar código Pix"}</Button>
      </div>
    </div>
  );
}
