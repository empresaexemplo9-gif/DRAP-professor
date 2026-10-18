import type { Metadata } from "next";
import { requirePermission } from "@/lib/session";
import { EmptyState, PageHeader } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Biblioteca de Materiais" };

export default async function Page() {
  await requirePermission("library:manage");
  return (
    <>
      <PageHeader title="Biblioteca de Materiais" description="Central de upload com leitura automática de PDF, DOCX, PPTX, XLSX, vídeos e mais." />
      <EmptyState icon="⇪" title="Disponível em breve" text="Esta área será ativada na Fase 2, conforme o plano de entregas." />
    </>
  );
}
