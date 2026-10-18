import { resolveColors, type ColorTokens, type ThemeOverrides } from "./tokens";

/** Luminância relativa (WCAG 2.x). */
export function luminance(hex: string): number {
  const h = hex.replace("#", "");
  const channels = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)) as [
    number,
    number,
    number,
  ];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

type Pair = { fg: keyof ColorTokens; bg: keyof ColorTokens; min: number; label: string };

/** Pares que precisam fechar WCAG AA (4,5:1 para texto normal; 3:1 para bordas de foco). */
export const REQUIRED_PAIRS: Pair[] = [
  { fg: "text", bg: "bg", min: 4.5, label: "Texto sobre o fundo" },
  { fg: "text", bg: "surface", min: 4.5, label: "Texto sobre superfícies" },
  { fg: "text", bg: "surface-raised", min: 4.5, label: "Texto sobre superfícies elevadas" },
  { fg: "text-muted", bg: "bg", min: 4.5, label: "Texto secundário sobre o fundo" },
  { fg: "text-muted", bg: "surface", min: 4.5, label: "Texto secundário sobre superfícies" },
  { fg: "primary-text", bg: "bg", min: 4.5, label: "Links sobre o fundo" },
  { fg: "primary-text", bg: "surface", min: 4.5, label: "Links sobre superfícies" },
  { fg: "text-on-primary", bg: "primary-strong", min: 4.5, label: "Texto dos botões primários" },
  { fg: "accent-text", bg: "bg", min: 4.5, label: "Texto dourado sobre o fundo" },
  { fg: "focus-ring", bg: "bg", min: 3, label: "Anel de foco sobre o fundo" },
];

export type ContrastIssue = { mode: "dark" | "light"; label: string; ratio: number; min: number };

export function checkContrast(overrides: ThemeOverrides): ContrastIssue[] {
  const issues: ContrastIssue[] = [];
  for (const mode of ["dark", "light"] as const) {
    const colors = resolveColors(mode, overrides);
    for (const p of REQUIRED_PAIRS) {
      const ratio = contrastRatio(colors[p.fg], colors[p.bg]);
      if (ratio < p.min) issues.push({ mode, label: p.label, ratio: Math.round(ratio * 100) / 100, min: p.min });
    }
  }
  return issues;
}
