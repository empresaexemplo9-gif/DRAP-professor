import { PublicShell } from "@/components/shell/PublicShell";
import { EmptyState } from "@/components/ui/misc";

export default function DisabledPage() {
  return (
    <PublicShell>
      <EmptyState icon="⊘" title="Acesso desativado" text="Seu acesso a esta instituição foi desativado. Fale com o administrador." />
    </PublicShell>
  );
}
