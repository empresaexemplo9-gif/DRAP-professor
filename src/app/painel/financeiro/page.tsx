import type { Metadata } from "next";
import { requirePermission } from "@/lib/session";
import { EmptyState, PageHeader } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Financeiro" };

export default async function Page() {
  await requirePermission("finance:view");
  return (
    <>
      <PageHeader title="Financeiro" description="Receita, assinaturas, inadimplência e reembolsos." />
      <EmptyState icon="R$" title="Disponível em breve" text="Esta área será ativada na Fase 5, conforme o plano de entregas." />
    </>
  );
}
