import { PublicShell } from "@/components/shell/PublicShell";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <PublicShell>
      <article className="drap-content mx-auto">{children}</article>
    </PublicShell>
  );
}
