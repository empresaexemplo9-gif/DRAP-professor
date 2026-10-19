import type { Metadata } from "next";
import { requirePermission } from "@/lib/session";
import { EmptyState, PageHeader } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Agenda" };

export default async function Page() {
  await requirePermission("learn:study");
  return (
    <>
      <PageHeader title="Agenda" description="Encontros de mentoria, aulas ao vivo e prazos aparecem aqui." />
      <EmptyState icon="◷" title="Disponível em breve" text="Esta área será ativada na Fase 3, conforme o plano de entregas." />
    </>
  );
}
