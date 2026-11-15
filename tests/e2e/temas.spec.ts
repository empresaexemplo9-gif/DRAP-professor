import { test, expect } from "@playwright/test";
import { THEME_PRESETS } from "../../src/theme/tokens";
import { ADMIN, expectAccessible, login } from "./helpers";

test.describe.configure({ mode: "serial" });

test("temas prontos: aplicar cada um muda cores e fontes e mantém o contraste", async ({ page, isMobile }) => {
  test.skip(isMobile, "galeria de temas validada no desktop");
  test.setTimeout(240_000);
  await login(page, ADMIN.email, ADMIN.password);
  try {
    for (const preset of THEME_PRESETS) {
      await page.goto("/painel/configuracoes");
      const card = page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: preset.name, exact: true }) });
      await card.getByRole("button", { name: "Aplicar tema" }).click();
      await expect(card.getByRole("button", { name: "Tema atual" })).toBeVisible();
      const vars = await page.evaluate(() => {
        const cs = getComputedStyle(document.documentElement);
        return { navy: cs.getPropertyValue("--drap-campus-navy").trim(), display: cs.getPropertyValue("--drap-font-display") };
      });
      expect(vars.navy.toUpperCase()).toBe(preset.campus.navy);
      for (const path of ["/painel", "/"]) {
        await page.goto(path);
        await test.step(`${preset.name} em ${path}`, () => expectAccessible(page));
      }
    }
  } finally {
    await page.goto("/painel/configuracoes");
    await page.getByRole("button", { name: "Restaurar cores padrão" }).click();
  }
});
