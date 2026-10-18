"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { withTenant } from "@/lib/db";
import { assertPermission, clientIp } from "@/lib/session";
import { audit } from "@/lib/audit";
import { checkContrast, type ContrastIssue } from "@/theme/contrast";
import { OVERRIDABLE_COLORS, darkColors, lightColors, sanitizeOverrides, type ThemeOverrides } from "@/theme/tokens";

export type ThemeState = { ok?: boolean; message?: string; error?: string; issues?: ContrastIssue[] };

export async function saveThemeAction(_: ThemeState, fd: FormData): Promise<ThemeState> {
  const viewer = await assertPermission("theme:manage");
  const raw: ThemeOverrides = { dark: {}, light: {}, fonts: {} };
  for (const mode of ["dark", "light"] as const) {
    const defaults = mode === "dark" ? darkColors : lightColors;
    for (const key of OVERRIDABLE_COLORS) {
      const v = String(fd.get(`${mode}.${key}`) ?? "").toUpperCase();
      if (v && v !== defaults[key].toUpperCase()) raw[mode]![key] = v;
    }
  }
  raw.fonts = { display: String(fd.get("fonts.display")) as never, body: String(fd.get("fonts.body")) as never };
  const overrides = sanitizeOverrides(raw);
  const issues = checkContrast(overrides);
  if (issues.length) return { error: "Algumas combinações não atingem o contraste mínimo (WCAG AA). Ajuste as cores destacadas.", issues };
  const defaultMode = z.enum(["DARK", "LIGHT", "SYSTEM"]).parse(fd.get("defaultMode"));
  const logo = String(fd.get("logoUrl") ?? "").trim();
  const logoUrl = logo ? z.string().url().refine((v) => v.startsWith("https://")).safeParse(logo) : null;
  if (logoUrl && !logoUrl.success) return { error: "O logotipo precisa ser uma URL https." };
  const tenantId = viewer.tenant.id;
  await withTenant(tenantId, async (tx) => {
    const data = { overrides: overrides as Prisma.InputJsonValue, defaultMode, logoUrl: logoUrl?.data ?? null, updatedById: viewer.user.id };
    await tx.themeSettings.upsert({ where: { tenantId }, create: { tenantId, ...data }, update: data });
    await audit(tx, { tenantId, actorId: viewer.user.id, action: "tema.atualizado", entity: "ThemeSettings", data: { overrides, defaultMode } as Prisma.InputJsonValue, ip: await clientIp() });
  });
  revalidatePath("/", "layout");
  return { ok: true, message: "Tema salvo. Todo o conteúdo já publicado passa a usar as novas cores e fontes." };
}

export async function resetThemeAction() {
  const viewer = await assertPermission("theme:manage");
  const tenantId = viewer.tenant.id;
  await withTenant(tenantId, async (tx) => {
    await tx.themeSettings.upsert({ where: { tenantId }, create: { tenantId }, update: { overrides: {}, updatedById: viewer.user.id } });
    await audit(tx, { tenantId, actorId: viewer.user.id, action: "tema.restaurado_padrao", entity: "ThemeSettings" });
  });
  revalidatePath("/", "layout");
}
