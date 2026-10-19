/**
 * ARQUIVO ÚNICO DE TEMA — fonte de verdade de todos os design tokens.
 *
 * Nenhum componente usa cor, fonte, raio ou sombra literal: tudo vem daqui, emitido como
 * variáveis CSS (`--drap-*`) pelo layout raiz e mapeado para utilitários do Tailwind em
 * `src/app/globals.css`. O lint `scripts/check-tokens.mjs` proíbe cores literais fora deste arquivo.
 *
 * Tenants podem sobrescrever apenas as chaves de `OVERRIDABLE_COLORS` e as fontes, sempre
 * validadas por contraste (WCAG AA) em `src/theme/contrast.ts`.
 */

export type ColorTokens = {
  bg: string;
  surface: string;
  "surface-raised": string;
  border: string;
  "border-strong": string;
  text: string;
  "text-muted": string;
  "text-on-primary": string;
  "text-on-accent": string;
  primary: string;
  "primary-strong": string;
  "primary-text": string;
  accent: string;
  "accent-text": string;
  success: string;
  warning: string;
  danger: string;
  "focus-ring": string;
  "brand-mark": string;
};

export const darkColors: ColorTokens = {
  bg: "#0D1C27",
  surface: "#142632",
  "surface-raised": "#1D3341",
  border: "#2A404D",
  "border-strong": "#526570",
  text: "#F5F2EA",
  "text-muted": "#B1BEC5",
  "text-on-primary": "#0B1C29",
  "text-on-accent": "#0B1C29",
  primary: "#D2B27B",
  "primary-strong": "#C5A16A",
  "primary-text": "#DDC398",
  accent: "#C9A86A",
  "accent-text": "#C9A86A",
  success: "#34D399",
  warning: "#FBBF24",
  danger: "#F87171",
  "focus-ring": "#DDC398",
  "brand-mark": "#C9A86A",
};

export const lightColors: ColorTokens = {
  bg: "#FAF9F6",
  surface: "#FFFFFF",
  "surface-raised": "#F0EDE7",
  border: "#E4E2DC",
  "border-strong": "#B8B9B5",
  text: "#102A3C",
  "text-muted": "#55636E",
  "text-on-primary": "#FFFFFF",
  "text-on-accent": "#0B1220",
  primary: "#25465A",
  "primary-strong": "#102A3C",
  "primary-text": "#25465A",
  accent: "#C9A86A",
  "accent-text": "#85612E",
  success: "#047857",
  warning: "#B45309",
  danger: "#B91C1C",
  "focus-ring": "#85612E",
  "brand-mark": "#85612E",
};

/** Cores institucionais fixas para a navegação e as imagens editoriais. */
export const campusColors = {
  navy: "#091D2B",
  "navy-raised": "#163143",
  cream: "#F7F3E9",
  gold: "#C9A66B",
  "on-navy": "#F5F3EE",
  muted: "#B6C4CD",
  line: "#304655",
} as const;

/** Cores que o administrador pode alterar em Configurações e Tema. */
export const OVERRIDABLE_COLORS = [
  "bg",
  "surface",
  "surface-raised",
  "border",
  "text",
  "text-muted",
  "primary",
  "primary-strong",
  "primary-text",
  "accent",
  "accent-text",
  "brand-mark",
] as const satisfies readonly (keyof ColorTokens)[];

export type OverridableColor = (typeof OVERRIDABLE_COLORS)[number];

export const COLOR_LABELS: Record<OverridableColor, string> = {
  bg: "Fundo principal",
  surface: "Superfície (cards, menus)",
  "surface-raised": "Superfície elevada (hover, modais)",
  border: "Bordas",
  text: "Texto",
  "text-muted": "Texto secundário",
  primary: "Destaque primário",
  "primary-strong": "Fundo de botões",
  "primary-text": "Links e texto em destaque",
  accent: "Destaque secundário (dourado)",
  "accent-text": "Texto em dourado",
  "brand-mark": "Cor do logotipo",
};

/** Famílias tipográficas disponíveis (todas servidas pelo próprio app, sem requisição a terceiros). */
export const DISPLAY_FONTS = {
  "playfair-display": { label: "Playfair Display", stack: '"Playfair Display", Georgia, serif' },
  lora: { label: "Lora", stack: '"Lora", Georgia, serif' },
} as const;

export const BODY_FONTS = {
  inter: { label: "Inter", stack: '"Inter Variable", "Inter", system-ui, sans-serif' },
  "source-sans-3": { label: "Source Sans 3", stack: '"Source Sans 3 Variable", system-ui, sans-serif' },
} as const;

export type DisplayFont = keyof typeof DISPLAY_FONTS;
export type BodyFont = keyof typeof BODY_FONTS;

export const DEFAULT_FONTS: { display: DisplayFont; body: BodyFont } = {
  display: "playfair-display",
  body: "inter",
};

export const MONO_FONT = '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace';

/** Escala tipográfica (razão 1,25 — terça maior; base 16px). */
export const typeScale = {
  xs: "0.75rem",
  sm: "0.875rem",
  base: "1rem",
  lg: "1.25rem",
  xl: "1.5625rem",
  "2xl": "1.953rem",
  "3xl": "2.441rem",
  "4xl": "3.052rem",
} as const;

export const radii = {
  sm: "4px",
  md: "6px",
  lg: "10px",
  xl: "16px",
  full: "9999px",
} as const;

export const shadows = {
  sm: "0 2px 6px color-mix(in srgb, black 4%, transparent)",
  md: "0 8px 24px color-mix(in srgb, black 9%, transparent)",
  glow: "0 0 0 1px color-mix(in srgb, var(--drap-accent) 30%, transparent), 0 8px 24px color-mix(in srgb, black 8%, transparent)",
} as const;

export const motion = {
  "ease-out": "cubic-bezier(0.22, 1, 0.36, 1)",
  "duration-fast": "120ms",
  "duration-base": "200ms",
  "duration-slow": "320ms",
} as const;

export type ThemeOverrides = {
  dark?: Partial<Record<OverridableColor, string>>;
  light?: Partial<Record<OverridableColor, string>>;
  fonts?: { display?: DisplayFont; body?: BodyFont };
};

const HEX = /^#[0-9a-fA-F]{6}$/;

/** Mantém apenas valores reconhecidos e no formato #RRGGBB (impede injeção de CSS). */
export function sanitizeOverrides(input: unknown): ThemeOverrides {
  const out: ThemeOverrides = {};
  if (!input || typeof input !== "object") return out;
  const src = input as Record<string, unknown>;
  for (const mode of ["dark", "light"] as const) {
    const m = src[mode];
    if (!m || typeof m !== "object") continue;
    const clean: Partial<Record<OverridableColor, string>> = {};
    for (const key of OVERRIDABLE_COLORS) {
      const v = (m as Record<string, unknown>)[key];
      if (typeof v === "string" && HEX.test(v)) clean[key] = v.toUpperCase();
    }
    out[mode] = clean;
  }
  const f = src.fonts as Record<string, unknown> | undefined;
  if (f && typeof f === "object") {
    out.fonts = {};
    if (typeof f.display === "string" && f.display in DISPLAY_FONTS) out.fonts.display = f.display as DisplayFont;
    if (typeof f.body === "string" && f.body in BODY_FONTS) out.fonts.body = f.body as BodyFont;
  }
  return out;
}

export function resolveColors(mode: "dark" | "light", overrides: ThemeOverrides): ColorTokens {
  const base = mode === "dark" ? darkColors : lightColors;
  return { ...base, ...(overrides[mode] ?? {}) };
}

function colorBlock(colors: ColorTokens): string {
  return Object.entries(colors)
    .map(([k, v]) => `--drap-${k}:${v};`)
    .join("");
}

/** Gera o CSS de variáveis do tema (servido no <head> pelo layout raiz). */
export function buildThemeCss(overrides: ThemeOverrides): string {
  const fonts = { ...DEFAULT_FONTS, ...(overrides.fonts ?? {}) };
  const statics = [
    ...Object.entries(campusColors).map(([k, v]) => `--drap-campus-${k}:${v};`),
    `--drap-font-display:${DISPLAY_FONTS[fonts.display].stack};`,
    `--drap-font-body:${BODY_FONTS[fonts.body].stack};`,
    `--drap-font-mono:${MONO_FONT};`,
    ...Object.entries(typeScale).map(([k, v]) => `--drap-text-${k}:${v};`),
    ...Object.entries(radii).map(([k, v]) => `--drap-radius-${k}:${v};`),
    ...Object.entries(shadows).map(([k, v]) => `--drap-shadow-${k}:${v};`),
    ...Object.entries(motion).map(([k, v]) => `--drap-${k}:${v};`),
  ].join("");
  const dark = colorBlock(resolveColors("dark", overrides));
  const light = colorBlock(resolveColors("light", overrides));
  return [
    `:root{${statics}}`,
    `:root,[data-theme="dark"]{${dark}color-scheme:dark;}`,
    `[data-theme="light"]{${light}color-scheme:light;}`,
    `@media (prefers-color-scheme: light){[data-theme="system"]{${light}color-scheme:light;}}`,
    `@media (prefers-reduced-motion: reduce){:root{--drap-duration-fast:0ms;--drap-duration-base:0ms;--drap-duration-slow:0ms;}}`,
  ].join("\n");
}
