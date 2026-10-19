import { ButtonLink } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <main id="conteudo" className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <p className="font-display text-6xl text-accent">404</p>
      <h1 className="mt-4 font-display text-3xl text-text">Página não encontrada</h1>
      <p className="mt-2 text-text-muted">O endereço pode ter mudado ou o conteúdo ainda não foi publicado.</p>
      <div className="mt-6"><ButtonLink href="/">Voltar ao início</ButtonLink></div>
    </main>
  );
}
