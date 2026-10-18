import type { Metadata } from "next";
import { requirePermission } from "@/lib/session";
import { EmptyState, PageHeader } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Certificados" };

export default async function Page() {
  await requirePermission("learn:study");
  return (
    <>
      <PageHeader title="Certificados" description="Sua carteira de certificados, com download e validação pública." />
      <EmptyState icon="✦" title="Disponível em breve" text="Esta área será ativada na Fase 4, conforme o plano de entregas." />
    </>
  );
}
