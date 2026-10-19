import type { Metadata } from "next";
import { requirePermission } from "@/lib/session";
import { EmptyState, PageHeader } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Fórum" };

export default async function Page() {
  await requirePermission("learn:study");
  return (
    <>
      <PageHeader title="Fórum" description="Discussões por assunto, por módulo e por turma." />
      <EmptyState icon="✉" title="Disponível em breve" text="Esta área será ativada na Fase 3, conforme o plano de entregas." />
    </>
  );
}
