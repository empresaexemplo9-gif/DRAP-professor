import type { Metadata } from "next";
import { LEGAL_VERSION } from "@/lib/legal";
import { Alert } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Política de Privacidade" };

export default function PrivacyPage() {
  return (
    <>
      <h1 className="font-display text-4xl">Política de Privacidade</h1>
      <p className="text-text-muted">Versão {LEGAL_VERSION}</p>
      <Alert tone="warning">Minuta sujeita a revisão jurídica antes da operação comercial.</Alert>
      <h2>Dados tratados</h2>
      <p>Nome, e-mail, dados de acesso (IP, navegador, data e hora), progresso e desempenho nos estudos. O CPF só é solicitado quando necessário para emissão de certificado ou nota fiscal, e é armazenado de forma cifrada.</p>
      <h2>Finalidades e bases legais</h2>
      <p>Execução do contrato de prestação de serviços educacionais, cumprimento de obrigações legais (inclusive a guarda de registros de acesso por 6 meses — Marco Civil da Internet, art. 15) e, para comunicações de marketing, o seu consentimento, que pode ser revogado a qualquer momento.</p>
      <h2>Seus direitos</h2>
      <p>Você pode solicitar acesso, correção, exportação e exclusão dos seus dados, além de revogar consentimentos, pelo seu painel ou pelo canal do encarregado de dados.</p>
    </>
  );
}
