import { expect, test } from "@playwright/test";
import { ADMIN, DEMO_PASSWORD, expectAccessible, expectNoHorizontalScroll, login } from "./helpers";

test("admin matricula um aluno e edita a matrícula", async ({ page, isMobile }) => {
  test.skip(isMobile);
  await login(page, ADMIN.email, ADMIN.password);
  await page.goto("/painel/matriculas");
  await expect(page.getByRole("heading", { level: 1, name: "Matrículas" })).toBeVisible();
  await expectAccessible(page);

  const form = page.locator("form").filter({ has: page.getByRole("button", { name: "Matricular" }) });
  await form.getByLabel("E-mail do aluno").fill("instrutor@exemplo.com.br");
  await form.getByLabel("Curso").selectOption({ label: "Gestão de Safra" });
  await form.getByLabel("Origem").selectOption("CORTESIA");
  await form.getByRole("button", { name: "Matricular" }).click();
  await expect(form.getByText(/foi matriculado\(a\) em Gestão de Safra|já tem matrícula ativa/)).toBeVisible();

  await page.getByPlaceholder("Buscar por nome ou e-mail").fill("instrutor@exemplo.com.br");
  await page.getByRole("button", { name: "Filtrar" }).click();
  const row = page.getByRole("row").filter({ hasText: "Gestão de Safra" });
  await row.getByLabel("Situação").selectOption("CANCELADA");
  await row.getByRole("button", { name: "Salvar" }).click();
  await expect(row.getByText("Matrícula atualizada.")).toBeVisible();
});

test("admin edita o preço de um curso no Financeiro", async ({ page, isMobile }) => {
  await login(page, ADMIN.email, ADMIN.password);
  await page.goto("/painel/financeiro");
  await expect(page.getByRole("heading", { level: 1, name: "Financeiro" })).toBeVisible();
  await expect(page.getByText("Receita confirmada")).toBeVisible();
  await expectNoHorizontalScroll(page);
  test.skip(isMobile);
  await expectAccessible(page);
  const row = page.getByRole("row").filter({ hasText: "Gestão de Safra" });
  const price = row.getByLabel("Preço em reais");
  await price.fill("49,90");
  await row.getByRole("button", { name: "Salvar" }).click();
  await expect(row.getByText("Preço atualizado para R$ 49,90.")).toBeVisible();
  await price.fill("");
  await row.getByRole("button", { name: "Salvar" }).click();
  await expect(row.getByText("Checkout Pix desativado para este curso.")).toBeVisible();
});

test("pedagógico gerencia matrículas, mas não o financeiro", async ({ page }) => {
  await login(page, "pedagogico@exemplo.com.br", DEMO_PASSWORD);
  await page.goto("/painel/matriculas");
  await expect(page.getByRole("heading", { level: 1, name: "Matrículas" })).toBeVisible();
  await page.goto("/painel/financeiro");
  await expect(page).toHaveURL(/erro=sem-permissao/);
});
