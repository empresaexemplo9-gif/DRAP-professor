import { expect, test } from "@playwright/test";
import { DEMO_PASSWORD, expectAccessible, expectNoHorizontalScroll, login } from "./helpers";

test("aba Mentorias separa cada tipo de mentoria", async ({ page, isMobile }) => {
  await page.goto("/");
  if (isMobile) await page.getByRole("button", { name: "Abrir menu" }).click();
  await page.getByRole("navigation", { name: "Menu principal" }).last().getByRole("link", { name: "Mentorias", exact: true }).click();
  await expect(page).toHaveURL(/\/mentorias$/);
  await expect(page.getByRole("heading", { level: 1, name: "Mentorias" })).toBeVisible();
  const tabs = page.getByRole("navigation", { name: "Abas" });
  for (const name of ["Pequenas empresas", "Médias empresas", "Grandes empresas"]) await expect(tabs.getByRole("link", { name })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Mentoria financeira\s*para pequenas empresas/ })).toBeVisible();
  await tabs.getByRole("link", { name: "Grandes empresas" }).click();
  await expect(page).toHaveURL(/tipo=grandes/);
  await expect(page.getByRole("heading", { name: /para grandes empresas/ })).toBeVisible();
  await expect(page.getByText("Conecte planejamento, desempenho e decisões financeiras à estratégia.")).toBeVisible();
  await expectNoHorizontalScroll(page);
  await expectAccessible(page);

  await page.getByRole("link", { name: "Conhecer a mentoria" }).click();
  await expect(page.getByRole("heading", { level: 1, name: /Mentoria financeira\s*para grandes empresas/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Solicitar proposta para minha empresa" })).toBeVisible();
  await page.getByRole("navigation", { name: "Abas" }).getByRole("link", { name: "Médias empresas" }).click();
  await expect(page.getByRole("heading", { level: 1, name: /para médias empresas/ })).toBeVisible();
  await expectAccessible(page);
});

test("a mentoria de exemplo antiga foi substituída", async ({ page }) => {
  const res = await page.goto("/mentorias/financas/financas-pequenas-empresas");
  expect(res?.status()).toBe(404);
});

test("painel também mostra a aba Mentorias", async ({ page, isMobile }) => {
  await login(page, "aluno@exemplo.com.br", DEMO_PASSWORD);
  if (isMobile) await page.getByRole("button", { name: "Abrir menu" }).click();
  await expect(page.getByRole("navigation", { name: "Menu principal" }).last().getByRole("link", { name: "Mentorias", exact: true })).toBeVisible();
});
