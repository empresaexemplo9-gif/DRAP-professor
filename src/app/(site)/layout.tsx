import { PublicShell } from "@/components/shell/PublicShell";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return <PublicShell>{children}</PublicShell>;
}
