import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { withTenant } from "@/lib/db";
import { getTenant } from "@/lib/tenant";
import { buildThemeCss, sanitizeOverrides, type ThemeOverrides } from "./tokens";

export const THEME_COOKIE = "drap-theme";
export type ThemeChoice = "dark" | "light" | "system";

export const getTenantTheme = cache(async () => {
  const tenant = await getTenant();
  const settings = await withTenant(tenant.id, (tx) => tx.themeSettings.findUnique({ where: { tenantId: tenant.id } }));
  const overrides: ThemeOverrides = sanitizeOverrides(settings?.overrides);
  const defaultMode: ThemeChoice =
    settings?.defaultMode === "DARK" ? "dark" : settings?.defaultMode === "SYSTEM" ? "system" : "light";
  return { tenant, overrides, defaultMode, logoUrl: settings?.logoUrl ?? null, css: buildThemeCss(overrides) };
});

/** Preferência do visitante (cookie) ou o modo padrão do tenant. */
export async function resolveThemeChoice(defaultMode: ThemeChoice): Promise<ThemeChoice> {
  const v = (await cookies()).get(THEME_COOKIE)?.value;
  return v === "dark" || v === "light" || v === "system" ? v : defaultMode;
}
