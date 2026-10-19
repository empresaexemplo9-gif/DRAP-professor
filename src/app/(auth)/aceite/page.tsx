import { redirect } from "next/navigation";
import { getViewer } from "@/lib/session";
import { AcceptTermsForm } from "./AcceptTermsForm";

export default async function ConsentPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/entrar");
  if (!viewer.needsConsent) redirect("/painel");
  return (
    <>
      <h1 className="font-display text-3xl text-text">Termos de uso</h1>
      <p className="mt-2 text-text-muted">Para continuar, confirme que leu e aceita os documentos abaixo.</p>
      <div className="mt-6">
        <AcceptTermsForm />
      </div>
    </>
  );
}
