import { getTenantTheme } from "@/theme/server";
import { Brand } from "@/components/shell/Brand";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const { tenant, logoUrl } = await getTenantTheme();
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="mb-8">
        <Brand name={tenant.name} logoUrl={logoUrl} />
      </div>
      <main id="conteudo" className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-md sm:p-8">
        {children}
      </main>
    </div>
  );
}
