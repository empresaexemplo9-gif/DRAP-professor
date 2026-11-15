import type { Metadata } from "next";
import { requirePermission } from "@/lib/session";
import { getTenantTheme } from "@/theme/server";
import { resolveColors, DEFAULT_FONTS } from "@/theme/tokens";
import { PageHeader } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/Button";
import { ThemeForm } from "./ThemeForm";
import { PresetPicker } from "./PresetPicker";

export const metadata: Metadata = { title: "Configurações e Tema" };

export default async function SettingsPage() {
  await requirePermission("theme:manage");
  const theme = await getTenantTheme();
  return (
    <>
      <PageHeader
        title="Configurações e Tema"
        description="Cores, fontes e logotipo aplicados a 100% da plataforma — inclusive a todo conteúdo já publicado."
        actions={
          <>
            <ButtonLink href="/painel/design-system" variant="secondary">Ver design system</ButtonLink>
            <ButtonLink href="/painel/auditoria" variant="secondary">Auditoria</ButtonLink>
          </>
        }
      />
      <PresetPicker active={theme.overrides.preset} />
      <h2 className="mt-10 mb-4 font-display text-2xl text-text">Ajuste fino</h2>
      <ThemeForm
        dark={resolveColors("dark", theme.overrides)}
        light={resolveColors("light", theme.overrides)}
        fonts={{ ...DEFAULT_FONTS, ...(theme.overrides.fonts ?? {}) }}
        defaultMode={theme.defaultMode === "light" ? "LIGHT" : theme.defaultMode === "system" ? "SYSTEM" : "DARK"}
        logoUrl={theme.logoUrl ?? ""}
      />
    </>
  );
}
