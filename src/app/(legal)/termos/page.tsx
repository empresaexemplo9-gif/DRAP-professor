import type { Metadata } from "next";
import { LEGAL_VERSION } from "@/lib/legal";
import { getTenant } from "@/lib/tenant";
import { Alert } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Termos de Uso" };

export default async function TermsPage() {
  const tenant = await getTenant();
  return (
    <>
      <h1 className="font-display text-4xl">Termos de Uso</h1>
      <p className="text-text-muted">Versão {LEGAL_VERSION}</p>
      <Alert tone="warning">Minuta sujeita a revisão jurídica antes da operação comercial.</Alert>
      <h2>1. Sobre a plataforma</h2>
      <p>
        A plataforma {tenant.name} oferece mentorias, treinamentos, cursos, aulas e capacitações na modalidade a distância. Os
        cursos livres oferecidos não estão sujeitos a autorização ou reconhecimento pelo Ministério da Educação e não equivalem a
        diplomas de ensino formal (Lei nº 9.394/1996).
      </p>
      <h2>2. Conta de acesso</h2>
      <p>O acesso é pessoal e intransferível. O número de sessões simultâneas por conta é limitado.</p>
      <h2>3. Direitos autorais</h2>
      <p>
        Os conteúdos são protegidos pela Lei nº 9.610/1998. É proibido copiar, gravar, distribuir ou compartilhar os materiais
        sem autorização.
      </p>
      <h2>4. Compras e arrependimento</h2>
      <p>Compras online podem ser canceladas em até 7 dias, com reembolso integral, nos termos do art. 49 do Código de Defesa do Consumidor.</p>
      <h2>5. Privacidade</h2>
      <p>O tratamento de dados pessoais segue a Política de Privacidade e a Lei nº 13.709/2018 (LGPD).</p>
    </>
  );
}
