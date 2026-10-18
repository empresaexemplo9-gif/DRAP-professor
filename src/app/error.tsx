"use client";
import { Button } from "@/components/ui/Button";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main id="conteudo" className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <h1 className="font-display text-3xl text-text">Algo deu errado</h1>
      <p className="mt-2 text-text-muted">Tente novamente. Se o problema continuar, fale com o suporte.</p>
      <div className="mt-6"><Button onClick={reset}>Tentar novamente</Button></div>
    </main>
  );
}
