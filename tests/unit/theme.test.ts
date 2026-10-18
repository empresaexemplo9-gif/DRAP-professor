import { describe, expect, it } from "vitest";
import { contrastRatio, checkContrast } from "@/theme/contrast";
import { buildThemeCss, darkColors, lightColors, sanitizeOverrides } from "@/theme/tokens";

describe("contraste WCAG", () => {
  it("calcula a razão de contraste conhecida", () => {
    expect(contrastRatio("#FFFFFF", "#000000")).toBeCloseTo(21, 0);
    expect(contrastRatio("#F3F5FA", "#0B1220")).toBeGreaterThan(17);
  });

  it("tema padrão atende AA nos modos claro e escuro", () => {
    expect(checkContrast({})).toEqual([]);
  });

  it("a cor de marca #5B6CFF não serve para texto de botão branco (motivo do token primary-strong)", () => {
    expect(contrastRatio(darkColors["text-on-primary"], darkColors.primary)).toBeLessThan(4.5);
    expect(contrastRatio(darkColors["text-on-primary"], darkColors["primary-strong"])).toBeGreaterThanOrEqual(4.5);
  });

  it("recusa sobrescritas que reprovam o contraste", () => {
    const issues = checkContrast({ dark: { "text-muted": "#333333" } });
    expect(issues.some((i) => i.mode === "dark")).toBe(true);
  });
});

describe("sobrescritas de tema", () => {
  it("aceita apenas chaves conhecidas e hexadecimais #RRGGBB", () => {
    const o = sanitizeOverrides({
      dark: { primary: "#112233", text: "red", bg: "#000;}body{display:none", unknown: "#FFFFFF" },
      fonts: { display: "lora", body: "comic-sans" },
    });
    expect(o.dark).toEqual({ primary: "#112233" });
    expect(o.fonts).toEqual({ display: "lora" });
  });

  it("o CSS gerado contém os tokens dos dois modos e respeita redução de movimento", () => {
    const css = buildThemeCss({ light: { primary: "#123456" } });
    expect(css).toContain(`--drap-bg:${darkColors.bg}`);
    expect(css).toContain(`--drap-bg:${lightColors.bg}`);
    expect(css).toContain("--drap-primary:#123456");
    expect(css).toContain("prefers-reduced-motion");
  });
});
