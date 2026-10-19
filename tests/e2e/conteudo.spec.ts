import { expect, test } from "@playwright/test";
import { ADMIN, expectAccessible, expectNoHorizontalScroll, login } from "./helpers";

test.describe.configure({ mode: "serial" });

test("admin cria segmento, módulo e assunto e publica — página no tema, sem ajuste manual", async ({ page, isMobile }) => {
  test.skip(isMobile, "fluxo de criação validado no desktop; a leitura é validada no celular abaixo");
  const stamp = Date.now().toString(36);
  await login(page, ADMIN.email, ADMIN.password);

  await page.goto("/painel/conteudo?aba=segmentos");
  await page.getByLabel("Nome").first().fill(`Segmento ${stamp}`);
  await page.getByRole("button", { name: "Criar segmento" }).click();
  await expect(page.getByText("Segmento criado.")).toBeVisible();

  await page.goto("/painel/conteudo/modulos/novo");
  await page.getByLabel("Nível").selectOption({ label: "Treinamentos" });
  await page.getByLabel("Segmento").selectOption({ label: `Segmento ${stamp}` });
  await page.getByLabel("Título").fill(`Módulo E2E ${stamp}`);
  await page.getByLabel("Carga horária (horas)").fill("4");
  await page.getByRole("button", { name: "Criar módulo" }).click();
  await page.waitForURL(/\/painel\/conteudo\/modulos\//);

  await page.getByLabel("Título do novo assunto").fill("Assunto de teste");
  await page.getByRole("button", { name: "Adicionar" }).first().click();
  await page.waitForURL(/\/painel\/conteudo\/assuntos\//);

  await page.getByRole("button", { name: "+ Parágrafo" }).first().click();
  await page.getByLabel("Texto do parágrafo").fill("Conteúdo com **negrito** inserido pelo editor.");
  await page.getByRole("button", { name: "+ Atenção" }).first().click();
  await page.getByLabel("Texto do destaque").fill("Cuidado com este ponto.");
  await page.getByRole("button", { name: "+ Tabela" }).first().click();
  await page.getByLabel(/Tabela:/).fill("Item | Valor\nA | 10\nB | 20");
  await page.getByLabel(/Tabela:/).blur();

  page.once("dialog", (d) => d.accept("primeira versão"));
  await page.getByRole("button", { name: "Publicar", exact: true }).click();
  await expect(page.getByText("Versão 1 publicada.")).toBeVisible();

  await page.getByRole("link", { name: `Módulo E2E ${stamp}` }).click();
  await page.waitForURL(/\/painel\/conteudo\/modulos\//);
  await page.getByRole("button", { name: "Publicar", exact: true }).click();
  await expect(page.getByRole("link", { name: "Ver página" })).toBeVisible();

  await page.goto(`/treinamentos/segmento-${stamp}/modulo-e2e-${stamp}/assunto-de-teste`);
  const article = page.locator("article");
  await expect(article.getByText("negrito")).toHaveCSS("font-weight", "600");
  await expect(article.getByRole("note", { name: "Atenção" })).toBeVisible();
  await expect(article.getByRole("table")).toContainText("20");
  // Regra central: nenhum estilo inline vindo do conteúdo.
  expect(await article.locator(".drap-content [style]").count()).toBe(0);
  await expectAccessible(page);
  await expectNoHorizontalScroll(page);
});

test("mudar o tema altera o conteúdo já publicado, sem editar o assunto", async ({ page, isMobile }) => {
  test.skip(isMobile, "configuração de tema validada no desktop");
  await login(page, ADMIN.email, ADMIN.password);
  const url = "/cursos/gestao-e-lideranca/fundamentos-de-lideranca/papeis-do-lider";
  await page.goto(url);
  const before = await page.locator("body").evaluate((el) => getComputedStyle(el).backgroundColor);

  await page.goto("/painel/configuracoes");
  await page.locator('input[name="dark.bg"]').fill("#101820".toLowerCase());
  await page.locator('input[name="light.bg"]').fill("#faf8f2");
  await page.getByRole("button", { name: "Salvar tema" }).click();
  await expect(page.getByText(/Tema salvo/)).toBeVisible();

  await page.goto(url);
  const after = await page.locator("body").evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(after).not.toBe(before);

  await page.goto("/painel/configuracoes");
  await page.getByRole("button", { name: "Restaurar cores padrão" }).click();
});

test("tema com contraste insuficiente é recusado", async ({ page, isMobile }) => {
  test.skip(isMobile);
  await login(page, ADMIN.email, ADMIN.password);
  await page.goto("/painel/configuracoes");
  await page.locator('input[name="dark.text-muted"]').fill("#222222");
  await page.getByRole("button", { name: "Salvar tema" }).click();
  await expect(page.getByText(/não atingem o contraste mínimo/)).toBeVisible();
});

test("leitura no celular: tabela rola dentro do bloco, sem rolagem da página", async ({ page }) => {
  await login(page, ADMIN.email, ADMIN.password);
  await page.goto("/cursos/gestao-e-lideranca/fundamentos-de-lideranca/feedback-eficaz");
  await expect(page.getByRole("table").first()).toBeVisible();
  await expectNoHorizontalScroll(page);
});
