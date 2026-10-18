import type { Metadata } from "next";
import { SignUpForm } from "./SignUpForm";

export const metadata: Metadata = { title: "Criar conta" };

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ convite?: string; email?: string }> }) {
  const { convite, email } = await searchParams;
  return (
    <>
      <h1 className="font-display text-3xl text-text">Criar conta</h1>
      <p className="mt-1 text-sm text-text-muted">Leva menos de um minuto.</p>
      <div className="mt-6">
        <SignUpForm invite={convite} email={email} />
      </div>
    </>
  );
}
