import { expect, test } from "@playwright/test";
import { expectAccessible, expectNoHorizontalScroll } from "./helpers";

for (const theme of ["dark", "light"] as const) {
  test.describe(`tema ${theme === "dark" ? "escuro" : "claro"}`, () => {
    test.beforeEach(async ({ context, baseURL }) => {
      await context.addCookies([{ name: "drap-theme", value: theme, url: baseURL! }]);
    });

    test("página inicial, nível, segmento e módulo com URL própria", async ({ page }) => {
      await page.goto("/");
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      await expectAccessible(page);
      await expectNoHorizontalScroll(page);

      await page.goto("/cursos");
      await expect(page.getByRole("heading", { level: 1, name: "Cursos" })).toBeVisible();
      await expectAccessible(page);

      await page.goto("/cursos/agronegocio");
      await expect(page.getByRole("heading", { level: 1, name: "Agronegócio" })).toBeVisible();

      await page.goto("/cursos/agronegocio/gestao-de-safra");
      await expect(page.getByRole("heading", { level: 1, name: "Gestão de Safra" })).toBeVisible();
      await expect(page.getByRole("navigation", { name: "Trilha de navegação" })).toContainText("Agronegócio");
      await expect(page.getByRole("navigation", { name: /Assuntos de/ })).toContainText("Planejamento de plantio");
      await expectAccessible(page);
      await expectNoHorizontalScroll(page);
    });
  });
}

test("cada um dos cinco níveis tem página própria", async ({ page }) => {
  for (const [slug, title] of [["mentorias", "Mentorias"], ["treinamentos", "Treinamentos"], ["cursos", "Cursos"], ["aulas", "Aulas"], ["capacitacoes", "Capacitações"]]) {
    await page.goto(`/${slug}`);
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
  }
});

test("painel exige login", async ({ page }) => {
  await page.goto("/painel");
  await expect(page).toHaveURL(/\/entrar/);
});

test("página de validação inexistente responde 404", async ({ page }) => {
  const res = await page.goto("/cursos/nao-existe");
  expect(res?.status()).toBe(404);
});
