import type { Metadata, Viewport } from "next";
import "@fontsource/playfair-display/400.css";
import "@fontsource/playfair-display/600.css";
import "@fontsource/playfair-display/400-italic.css";
import "@fontsource/lora/400.css";
import "@fontsource/lora/600.css";
import "@fontsource-variable/inter";
import "@fontsource-variable/source-sans-3";
import "katex/dist/katex.min.css";
import "./globals.css";
import { getTenantTheme, resolveThemeChoice } from "@/theme/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { tenant } = await getTenantTheme();
  return {
    title: { default: tenant.name, template: `%s · ${tenant.name}` },
    description: "Mentorias, treinamentos, cursos, aulas e capacitações.",
  };
}

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const theme = await getTenantTheme();
  const choice = await resolveThemeChoice(theme.defaultMode);
  return (
    <html lang="pt-BR" data-theme={choice} suppressHydrationWarning>
      <head>
        <style id="drap-theme" dangerouslySetInnerHTML={{ __html: theme.css }} />
      </head>
      <body className="min-h-dvh bg-bg font-body text-text">
        <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:p-3">
          Pular para o conteúdo
        </a>
        {children}
      </body>
    </html>
  );
}
