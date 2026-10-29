import { expect, test } from "@playwright/test";
import { ADMIN, DEMO_PASSWORD, expectAccessible, expectNoHorizontalScroll, login } from "./helpers";

const COURSE = "/treinamentos/gestao-e-pessoas/gestao-justa-de-equipes-e-escalas";
const DOWNLOAD = "/api/courses/gestao-justa-de-equipes/apostila";

test("página pública apresenta o treinamento para empresas, sem matrícula individual", async ({ page }) => {
  await page.goto(COURSE);
  await expect(page.getByRole("heading", { level: 1, name: "Gestão justa de equipes e escalas" })).toBeVisible();
  await expect(page.getByRole("img", { name: /escala de trabalho semanal/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Módulo|Papel gerencial e princípios de equipe/ }).first()).toBeVisible();
  for (const name of ["Papel gerencial e princípios de equipe", "Planejamento e construção de escalas", "Saúde mental e prevenção de riscos psicossociais", "Indicadores, simulação e plano de 30 dias"]) {
    await expect(page.getByRole("link", { name })).toBeVisible();
  }
  await expect(page.getByRole("link", { name: "Solicitar proposta", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /pagar com Pix/i })).toHaveCount(0);
  await expectNoHorizontalScroll(page);
  await expectAccessible(page);

  await page.goto(`${COURSE}/modulo-3-planejamento-e-construcao-de-escalas`);
  await expect(page.getByRole("heading", { name: "Conteúdo exclusivo para equipes de empresas contratantes" })).toBeVisible();
  expect((await page.request.get(DOWNLOAD)).status()).toBe(401);
});

test("/empresas destaca os treinamentos exclusivos e pré-seleciona o interesse", async ({ page }) => {
  await page.goto("/empresas?curso=gestao-justa-de-equipes-e-escalas#proposta");
  await expect(page.getByRole("heading", { name: "Treinamentos exclusivos para empresas" })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: "Gestão justa de equipes e escalas" })).toBeChecked();
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Capacitação para equipes inteiras." })).toBeVisible();
});

test("colaboradora com vaga da empresa estuda e baixa a apostila", async ({ page }) => {
  await login(page, "aluno@exemplo.com.br", DEMO_PASSWORD);
  await page.goto(`${COURSE}/modulo-6-saude-mental-e-prevencao-de-riscos-psicossociais`);
  await expect(page.getByRole("heading", { level: 1, name: /Saúde mental e prevenção de riscos psicossociais/ })).toBeVisible();
  await expect(page.getByText("Sinais de alerta e resposta do líder", { exact: false }).first()).toBeVisible();
  await expect(page.getByText(/não diagnostica nem substitui atendimento clínico/)).toBeVisible();
  await expectNoHorizontalScroll(page);
  await expectAccessible(page);
  const res = await page.request.get(DOWNLOAD);
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("wordprocessingml");

  await page.goto(`${COURSE}/ferramentas-de-aplicacao`);
  await expect(page.getByRole("table").first()).toBeVisible();
  await expect(page.getByText("Checklist diário do líder").first()).toBeVisible();
});

test("gestor da empresa lê o material sem matrícula; quem não tem vaga não acessa", async ({ page }) => {
  await login(page, "gestor@exemplo.com.br", DEMO_PASSWORD);
  await page.goto(COURSE);
  await expect(page.getByRole("heading", { name: "Material da sua empresa." })).toBeVisible();
  expect((await page.request.get(DOWNLOAD)).status()).toBe(200);
  await page.context().clearCookies();
  await login(page, "instrutor@exemplo.com.br", DEMO_PASSWORD);
  expect((await page.request.get(DOWNLOAD)).status()).toBe(403);
});

test("financeiro não vende treinamento para empresas por Pix", async ({ page, isMobile }) => {
  test.skip(isMobile);
  await login(page, ADMIN.email, ADMIN.password);
  await page.goto("/painel/financeiro");
  const row = page.getByRole("row").filter({ hasText: "Gestão justa de equipes e escalas" });
  await expect(row.getByText("Por contrato (Empresas)")).toBeVisible();
  await expect(row.getByLabel("Preço em reais")).toHaveCount(0);
});
