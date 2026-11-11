import type { Metadata } from "next";
import Link from "next/link";
import { getViewer } from "@/lib/session";
import { cpaAccess } from "@/lib/cpa/access";
import { CPA_MODULE } from "@/lib/cpa/module";
import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { CpaNav } from "./CpaNav";

export const metadata: Metadata = { title: { default: "Preparatório CPA", template: "%s · Preparatório CPA" } };

/** Ambiente do aluno do preparatório CPA: só equipe pedagógica ou alunos com matrícula ativa. */
export default async function CpaLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();
  const access = await cpaAccess(viewer);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-accent-text">Mercado financeiro · certificação</p>
          <p className="font-display text-2xl text-text">
            <Link href="/cpa" className="text-text no-underline">
              {CPA_MODULE.title}
            </Link>
          </p>
        </div>
        <p className="max-w-md text-xs text-text-muted">
          Preparatório autoral e independente, sem vínculo com a ANBIMA. Não emite certificado: a certificação CPA é obtida somente na prova oficial. As questões são inéditas e não são questões de provas aplicadas.
        </p>
      </div>
      {access.allowed ? (
        <>
          <CpaNav />
          {children}
        </>
      ) : (
        <Card variant="featured">
          <h1 className="font-display text-2xl text-text">Acesso ao preparatório</h1>
          <p className="mt-2 text-text-muted">
            {access.reason === "LOGIN"
              ? "Entre na sua conta para acessar aulas, apostila, simulados e o seu painel de desempenho."
              : access.reason === "CONSENT"
                ? "Revise e aceite os termos de uso para continuar."
                : access.reason === "DISABLED"
                  ? "Sua conta está desativada. Fale com o suporte."
                  : "O preparatório é exclusivo para alunos com matrícula ativa."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {access.reason === "LOGIN" && <ButtonLink href="/entrar?voltar=/cpa">Entrar</ButtonLink>}
            {access.reason === "CONSENT" && <ButtonLink href="/aceite">Revisar os termos</ButtonLink>}
            {access.reason === "ENROLLMENT" && <ButtonLink href="/painel/aprendizado">Minhas matrículas</ButtonLink>}
          </div>
        </Card>
      )}
    </div>
  );
}
