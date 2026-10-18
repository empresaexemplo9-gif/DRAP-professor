import { redirect } from "next/navigation";
import { requireViewer } from "@/lib/session";
import { getTenantTheme } from "@/theme/server";
import { AppShell } from "@/components/shell/AppShell";

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireViewer();
  if (viewer.needsConsent) redirect("/aceite");
  const { logoUrl } = await getTenantTheme();
  return (
    <AppShell viewer={viewer} logoUrl={logoUrl}>
      {children}
    </AppShell>
  );
}
