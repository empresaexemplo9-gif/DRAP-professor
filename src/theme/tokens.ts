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
  "dm-serif-display": { label: "DM Serif Display", stack: '"DM Serif Display", Georgia, serif' },
  "zilla-slab": { label: "Zilla Slab", stack: '"Zilla Slab", Georgia, serif' },
  "barlow-condensed": { label: "Barlow Condensed", stack: '"Barlow Condensed", "Arial Narrow", sans-serif' },
  archivo: { label: "Archivo", stack: '"Archivo", system-ui, sans-serif' },
  manrope: { label: "Manrope", stack: '"Manrope", system-ui, sans-serif' },
  nunito: { label: "Nunito", stack: '"Nunito", system-ui, sans-serif' },
  poppins: { label: "Poppins", stack: '"Poppins", system-ui, sans-serif' },
} as const;

export const BODY_FONTS = {
  inter: { label: "Inter", stack: '"Inter Variable", "Inter", system-ui, sans-serif' },
  "source-sans-3": { label: "Source Sans 3", stack: '"Source Sans 3 Variable", system-ui, sans-serif' },
  manrope: { label: "Manrope", stack: '"Manrope", system-ui, sans-serif' },
  nunito: { label: "Nunito", stack: '"Nunito", system-ui, sans-serif' },
  poppins: { label: "Poppins", stack: '"Poppins", system-ui, sans-serif' },
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
  /** Tema pronto aplicado por último (só informativo: as cores efetivas estão em dark/light). */
  preset?: string;
  /** Cores da navegação (barra lateral e topo). */
  campus?: Partial<Record<CampusColor, string>>;
};

export const CAMPUS_OVERRIDABLE = ["navy", "navy-raised", "gold", "on-navy", "muted", "line"] as const;
export type CampusColor = (typeof CAMPUS_OVERRIDABLE)[number];

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
  const c = src.campus as Record<string, unknown> | undefined;
  if (c && typeof c === "object") {
    out.campus = {};
    for (const key of CAMPUS_OVERRIDABLE) if (typeof c[key] === "string" && HEX.test(c[key] as string)) out.campus[key] = (c[key] as string).toUpperCase();
  }
  if (typeof src.preset === "string" && THEME_PRESETS.some((p) => p.id === src.preset)) out.preset = src.preset;
  return out;
}

function lum(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const ratio = (a: string, b: string) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);

/** Texto sobre um fundo colorido: mantém o padrão se ele tiver contraste AA; senão, o mais legível entre branco e quase-preto. */
function onColor(bg: string, preferred: string): string {
  if (ratio(preferred, bg) >= 4.5) return preferred;
  return ratio("#FFFFFF", bg) >= ratio("#0B1220", bg) ? "#FFFFFF" : "#0B1220";
}

export function resolveColors(mode: "dark" | "light", overrides: ThemeOverrides): ColorTokens {
  const base = mode === "dark" ? darkColors : lightColors;
  const c = { ...base, ...(overrides[mode] ?? {}) };
  c["text-on-primary"] = onColor(c["primary-strong"], base["text-on-primary"]);
  c["text-on-accent"] = onColor(c.accent, base["text-on-accent"]);
  return c;
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
    ...Object.entries({ ...campusColors, ...(overrides.campus ?? {}) }).map(([k, v]) => `--drap-campus-${k}:${v};`),
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

/**
 * Cores das capas ilustradas dos cursos (components/campus/CourseCover): derivadas do matiz que cada
 * curso recebe pela posição no catálogo, para que nenhum card repita a mesma combinação.
 */
export function courseCoverColors(hue: number, hue2: number) {
  return {
    from: `hsl(${hue} 55% 28%)`,
    to: `hsl(${hue2} 60% 42%)`,
    ink: `hsl(${hue2} 70% 82% / 0.35)`,
    badge: `hsl(${hue} 40% 15% / 0.35)`,
    monogram: "white",
  };
}

/** Temas prontos oferecidos em Configurações (cada um com paleta clara e escura e par de fontes). */
export type ThemePreset = {
  id: string;
  name: string;
  description: string;
  image: string;
  defaultMode: "DARK" | "LIGHT";
  fonts: { display: DisplayFont; body: BodyFont };
  light: Record<OverridableColor, string>;
  dark: Record<OverridableColor, string>;
  campus: Record<CampusColor, string>;
};

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "lavanda-editorial",
    name: "Lavanda editorial",
    description: "Lavanda clara, navegação berinjela e detalhes em amarelo-ácido. Títulos em serifa elegante.",
    image: "/temas/01-lavanda-editorial.webp",
    defaultMode: "LIGHT",
    fonts: { display: "playfair-display", body: "inter" },
    light: { "bg": "#F4EEFB", "surface": "#FFFFFF", "surface-raised": "#EADCFD", "border": "#DDD0EC", "text": "#2A0C29", "text-muted": "#5E4A60", "primary": "#421240", "primary-strong": "#421240", "primary-text": "#5B1A58", "accent": "#D9F03A", "accent-text": "#5A6400", "brand-mark": "#421240" },
    dark: { "bg": "#1A0D1C", "surface": "#241326", "surface-raised": "#321B35", "border": "#46304A", "text": "#F4EEFB", "text-muted": "#C9B8CC", "primary": "#E2C6F0", "primary-strong": "#D9F03A", "primary-text": "#E2C6F0", "accent": "#D9F03A", "accent-text": "#D9F03A", "brand-mark": "#D9F03A" },
    campus: { "navy": "#421240", "navy-raised": "#5A2357", "gold": "#D9F03A", "on-navy": "#F7EEF6", "muted": "#D6BFD4", "line": "#5E2F5B" },
  },
  {
    id: "terracota-organico",
    name: "Terracota orgânico",
    description: "Areia quente, terracota e oliva suave. Tipografia arredondada e humanista.",
    image: "/temas/02-terracota-organico.webp",
    defaultMode: "LIGHT",
    fonts: { display: "nunito", body: "nunito" },
    light: { "bg": "#F8EEE2", "surface": "#FFFBF5", "surface-raised": "#F2E4D3", "border": "#E3D3BF", "text": "#3B2418", "text-muted": "#6B5240", "primary": "#973E25", "primary-strong": "#8A3820", "primary-text": "#8A3820", "accent": "#6B7038", "accent-text": "#5C6130", "brand-mark": "#973E25" },
    dark: { "bg": "#221812", "surface": "#2D2019", "surface-raised": "#3A2A20", "border": "#4D3A2D", "text": "#F8EEE2", "text-muted": "#CDBBA8", "primary": "#E39A7A", "primary-strong": "#E39A7A", "primary-text": "#EAA98B", "accent": "#B9BE7C", "accent-text": "#C3C88A", "brand-mark": "#E39A7A" },
    campus: { "navy": "#973E25", "navy-raised": "#AD5236", "gold": "#F3D9A6", "on-navy": "#FFF6EC", "muted": "#F2CDBD", "line": "#A9573E" },
  },
  {
    id: "grafite-neon",
    name: "Grafite neon",
    description: "Painel escuro premium em grafite com destaques verde-limão. Títulos condensados.",
    image: "/temas/03-grafite-neon.webp",
    defaultMode: "DARK",
    fonts: { display: "barlow-condensed", body: "inter" },
    light: { "bg": "#F3F5F2", "surface": "#FFFFFF", "surface-raised": "#E6EAE4", "border": "#D3D9D1", "text": "#15191C", "text-muted": "#4E5752", "primary": "#3F6212", "primary-strong": "#3F6212", "primary-text": "#3F6212", "accent": "#84CC16", "accent-text": "#3F6212", "brand-mark": "#3F6212" },
    dark: { "bg": "#121619", "surface": "#1A1F22", "surface-raised": "#23292D", "border": "#333936", "text": "#F2F4F0", "text-muted": "#A9B1AA", "primary": "#B8F04A", "primary-strong": "#B8F04A", "primary-text": "#C4F562", "accent": "#B8F04A", "accent-text": "#B8F04A", "brand-mark": "#B8F04A" },
    campus: { "navy": "#0D1013", "navy-raised": "#1A1F22", "gold": "#B8F04A", "on-navy": "#F2F4F0", "muted": "#A9B1AA", "line": "#2A3033" },
  },
  {
    id: "oceano",
    name: "Oceano",
    description: "Água-marinha clara, azul-petróleo e toques de coral. Visual arejado e amigável.",
    image: "/temas/04-oceano.webp",
    defaultMode: "LIGHT",
    fonts: { display: "nunito", body: "nunito" },
    light: { "bg": "#F2FAFA", "surface": "#FFFFFF", "surface-raised": "#E0F2F1", "border": "#CFE5E4", "text": "#0B2F3A", "text-muted": "#4A6870", "primary": "#013C4E", "primary-strong": "#013C4E", "primary-text": "#02566B", "accent": "#F2785C", "accent-text": "#B4432A", "brand-mark": "#0E7A76" },
    dark: { "bg": "#04222C", "surface": "#0A2F3B", "surface-raised": "#12404D", "border": "#1F5260", "text": "#EAF7F7", "text-muted": "#A6C6CA", "primary": "#5ED0C8", "primary-strong": "#5ED0C8", "primary-text": "#7FDCD5", "accent": "#FF9A80", "accent-text": "#FF9A80", "brand-mark": "#5ED0C8" },
    campus: { "navy": "#013C4E", "navy-raised": "#0B5166", "gold": "#5ED0C8", "on-navy": "#EAF7F7", "muted": "#A6C6CA", "line": "#1D5A6B" },
  },
  {
    id: "cereja",
    name: "Cereja",
    description: "Branco e rosa-claro com vermelho-cereja e textos bordô. Serifa de alto contraste.",
    image: "/temas/05-cereja.webp",
    defaultMode: "LIGHT",
    fonts: { display: "dm-serif-display", body: "inter" },
    light: { "bg": "#FDF7F7", "surface": "#FFFFFF", "surface-raised": "#F8E9EB", "border": "#EBD5D8", "text": "#4A1020", "text-muted": "#6E4A52", "primary": "#B3122E", "primary-strong": "#A3102A", "primary-text": "#A3102A", "accent": "#C93A52", "accent-text": "#A3102A", "brand-mark": "#B3122E" },
    dark: { "bg": "#1E0C11", "surface": "#2A1218", "surface-raised": "#381A21", "border": "#4E2A32", "text": "#FBEFF1", "text-muted": "#D3B4BA", "primary": "#FF8A9B", "primary-strong": "#FF8A9B", "primary-text": "#FF9EAC", "accent": "#FF8A9B", "accent-text": "#FF9EAC", "brand-mark": "#FF8A9B" },
    campus: { "navy": "#4A1020", "navy-raised": "#651A2E", "gold": "#FF8A9B", "on-navy": "#FBEFF1", "muted": "#E3BCC4", "line": "#6B2738" },
  },
  {
    id: "swiss-laranja",
    name: "Suíço laranja",
    description: "Off-white e cinza com laranja vivo. Estilo suíço: grid rigoroso e grotesca forte.",
    image: "/temas/06-swiss-laranja.webp",
    defaultMode: "LIGHT",
    fonts: { display: "archivo", body: "inter" },
    light: { "bg": "#F5F4F2", "surface": "#FFFFFF", "surface-raised": "#EAE8E5", "border": "#D9D6D2", "text": "#111111", "text-muted": "#55524E", "primary": "#C2410C", "primary-strong": "#C2410C", "primary-text": "#B23A0A", "accent": "#F97316", "accent-text": "#B23A0A", "brand-mark": "#D9500B" },
    dark: { "bg": "#141414", "surface": "#1E1E1E", "surface-raised": "#2A2A2A", "border": "#3A3A3A", "text": "#F5F4F2", "text-muted": "#B5B1AC", "primary": "#FF8A3D", "primary-strong": "#FF8A3D", "primary-text": "#FF9A55", "accent": "#FF8A3D", "accent-text": "#FF9A55", "brand-mark": "#FF8A3D" },
    campus: { "navy": "#111111", "navy-raised": "#222222", "gold": "#FF8A3D", "on-navy": "#F5F4F2", "muted": "#BDBAB6", "line": "#333333" },
  },
  {
    id: "azul-noturno",
    name: "Azul noturno",
    description: "Azul-meia-noite com painéis índigo, azul-gelo e âmbar. Elegância técnica.",
    image: "/temas/07-azul-noturno.webp",
    defaultMode: "DARK",
    fonts: { display: "manrope", body: "manrope" },
    light: { "bg": "#F2F5FB", "surface": "#FFFFFF", "surface-raised": "#E4EAF6", "border": "#D0D9EB", "text": "#0B1431", "text-muted": "#4A5578", "primary": "#1E3A8A", "primary-strong": "#1E3A8A", "primary-text": "#1E40AF", "accent": "#F5B544", "accent-text": "#8A5A00", "brand-mark": "#1E3A8A" },
    dark: { "bg": "#0B1431", "surface": "#111C3E", "surface-raised": "#1A274E", "border": "#2A3A66", "text": "#EEF2FA", "text-muted": "#A8B4CF", "primary": "#8CC8FF", "primary-strong": "#8CC8FF", "primary-text": "#9DD1FF", "accent": "#F5B544", "accent-text": "#F5B544", "brand-mark": "#8CC8FF" },
    campus: { "navy": "#07102C", "navy-raised": "#111C3E", "gold": "#8CC8FF", "on-navy": "#EEF2FA", "muted": "#A8B4CF", "line": "#22305A" },
  },
  {
    id: "pistache",
    name: "Pistache",
    description: "Verde-pistache claro, painéis brancos, oliva escuro e rosa suave. Geométrica e leve.",
    image: "/temas/08-pistache.webp",
    defaultMode: "LIGHT",
    fonts: { display: "poppins", body: "poppins" },
    light: { "bg": "#E6F2D9", "surface": "#FFFFFF", "surface-raised": "#EEF6E5", "border": "#D3E3C2", "text": "#2C3A16", "text-muted": "#4F5C39", "primary": "#4B5E1F", "primary-strong": "#4B5E1F", "primary-text": "#45571C", "accent": "#E59AAE", "accent-text": "#8F3550", "brand-mark": "#4B5E1F" },
    dark: { "bg": "#151C10", "surface": "#1E2717", "surface-raised": "#29341F", "border": "#3A4730", "text": "#EEF6E5", "text-muted": "#BCC9AE", "primary": "#B9D98A", "primary-strong": "#B9D98A", "primary-text": "#C6E39C", "accent": "#F2A7BB", "accent-text": "#F2A7BB", "brand-mark": "#B9D98A" },
    campus: { "navy": "#2C3A16", "navy-raised": "#3D4E22", "gold": "#B9D98A", "on-navy": "#EEF6E5", "muted": "#C5D1B5", "line": "#46582A" },
  },
  {
    id: "monocromatico",
    name: "Monocromático",
    description: "Apenas preto, branco quente e cinzas. Editorial, plano e de grid preciso.",
    image: "/temas/09-monocromatico.webp",
    defaultMode: "LIGHT",
    fonts: { display: "manrope", body: "manrope" },
    light: { "bg": "#FAF9F7", "surface": "#FFFFFF", "surface-raised": "#EFEFEF", "border": "#DCDCDC", "text": "#111111", "text-muted": "#555555", "primary": "#111111", "primary-strong": "#111111", "primary-text": "#111111", "accent": "#444444", "accent-text": "#444444", "brand-mark": "#111111" },
    dark: { "bg": "#0E0E0E", "surface": "#171717", "surface-raised": "#222222", "border": "#333333", "text": "#F5F4F1", "text-muted": "#B0B0B0", "primary": "#F5F4F1", "primary-strong": "#F5F4F1", "primary-text": "#F5F4F1", "accent": "#C8C8C8", "accent-text": "#C8C8C8", "brand-mark": "#F5F4F1" },
    campus: { "navy": "#0E0E0E", "navy-raised": "#1E1E1E", "gold": "#F5F4F1", "on-navy": "#F5F4F1", "muted": "#B0B0B0", "line": "#333333" },
  },
  {
    id: "ameixa-damasco",
    name: "Ameixa e damasco",
    description: "Pêssego claro, ameixa nos títulos e damasco nos destaques. Serifa slab suave.",
    image: "/temas/10-ameixa-damasco.webp",
    defaultMode: "LIGHT",
    fonts: { display: "zilla-slab", body: "nunito" },
    light: { "bg": "#FDF1EC", "surface": "#FFFFFF", "surface-raised": "#FBE3D9", "border": "#EED6CC", "text": "#3D1530", "text-muted": "#6C4A5E", "primary": "#6E2A55", "primary-strong": "#6E2A55", "primary-text": "#6E2A55", "accent": "#F4A06B", "accent-text": "#94440F", "brand-mark": "#6E2A55" },
    dark: { "bg": "#1F1019", "surface": "#2A1622", "surface-raised": "#381F2E", "border": "#4E3043", "text": "#FDF1EC", "text-muted": "#D2B7C5", "primary": "#F4A06B", "primary-strong": "#F4A06B", "primary-text": "#F7B48A", "accent": "#C9A3D9", "accent-text": "#D3B3E0", "brand-mark": "#F4A06B" },
    campus: { "navy": "#4A1A3B", "navy-raised": "#622650", "gold": "#F4A06B", "on-navy": "#FDF1EC", "muted": "#DEC0D2", "line": "#6C3459" },
  },
];
