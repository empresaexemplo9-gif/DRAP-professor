"use client";
import { useActionState } from "react";
import { resetThemeAction, saveThemeAction, type ThemeState } from "./actions";
import { BODY_FONTS, COLOR_LABELS, DISPLAY_FONTS, OVERRIDABLE_COLORS, type ColorTokens } from "@/theme/tokens";
import { Button } from "@/components/ui/Button";
import { SelectField, TextField } from "@/components/ui/Field";
import { Alert } from "@/components/ui/misc";
import { Card } from "@/components/ui/Card";

export function ThemeForm({
  dark,
  light,
  fonts,
  defaultMode,
  logoUrl,
}: {
  dark: ColorTokens;
  light: ColorTokens;
  fonts: { display: string; body: string };
  defaultMode: string;
  logoUrl: string;
}) {
  const [state, action, pending] = useActionState<ThemeState, FormData>(saveThemeAction, {});
  return (
    <div className="space-y-6">
      <form action={action} className="space-y-6">
        {state.ok && <Alert tone="success">{state.message}</Alert>}
        {state.error && (
          <Alert tone="danger">
            {state.error}
            {state.issues && (
              <ul className="mt-2 list-disc pl-5">
                {state.issues.map((i, k) => (
                  <li key={k}>
                    Modo {i.mode === "dark" ? "escuro" : "claro"}: {i.label} — {i.ratio}:1 (mínimo {i.min}:1)
                  </li>
                ))}
              </ul>
            )}
          </Alert>
        )}
        <Card className="grid gap-4 sm:grid-cols-3">
          <SelectField label="Modo padrão" name="defaultMode" defaultValue={defaultMode}>
            <option value="DARK">Escuro</option>
            <option value="LIGHT">Claro</option>
            <option value="SYSTEM">Seguir o sistema</option>
          </SelectField>
          <SelectField label="Fonte dos títulos" name="fonts.display" defaultValue={fonts.display}>
            {Object.entries(DISPLAY_FONTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </SelectField>
          <SelectField label="Fonte do texto" name="fonts.body" defaultValue={fonts.body}>
            {Object.entries(BODY_FONTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </SelectField>
          <div className="sm:col-span-3">
            <TextField label="Logotipo (URL https)" name="logoUrl" type="url" defaultValue={logoUrl} hint="Envio de arquivos chega com a Biblioteca de Materiais (Fase 2)." />
          </div>
        </Card>
        <div className="grid gap-6 lg:grid-cols-2">
          {(["dark", "light"] as const).map((mode) => {
            const colors = mode === "dark" ? dark : light;
            return (
              <fieldset key={mode} className="rounded-lg border border-border bg-surface p-5">
                <legend className="px-2 font-display text-xl text-text">Modo {mode === "dark" ? "escuro" : "claro"}</legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  {OVERRIDABLE_COLORS.map((key) => (
                    <label key={key} className="flex items-center gap-3 text-sm text-text">
                      <input type="color" name={`${mode}.${key}`} defaultValue={colors[key]} className="h-10 w-12 cursor-pointer rounded-sm border border-border bg-transparent" />
                      <span>{COLOR_LABELS[key]}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            );
          })}
        </div>
        <Button type="submit" loading={pending}>Salvar tema</Button>
      </form>
      <form action={resetThemeAction}>
        <Button type="submit" variant="ghost">Restaurar cores padrão</Button>
      </form>
    </div>
  );
}
