import type { Metadata } from "next";
import { googleEnabled } from "@/lib/auth";
import { SignInForm } from "./SignInForm";

export const metadata: Metadata = { title: "Entrar" };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ convite?: string }> }) {
  const { convite } = await searchParams;
  return (
    <>
      <h1 className="font-display text-3xl text-text">Entrar</h1>
      <p className="mt-1 text-sm text-text-muted">Acesse seu painel de estudos.</p>
      <div className="mt-6">
        <SignInForm googleEnabled={googleEnabled} invite={convite} />
      </div>
    </>
  );
}
