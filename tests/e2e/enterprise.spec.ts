import { expect, test } from "@playwright/test";
import { ADMIN, DEMO_PASSWORD, expectAccessible, expectNoHorizontalScroll, login } from "./helpers";

test("página pública Para empresas recebe pedido de proposta", async ({ page, isMobile }) => {
  await page.goto("/empresas");
  await expect(page.getByRole("heading", { level: 1, name: /Capacitação para equipes inteiras/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Treinamentos exclusivos para empresas" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Capacitações do catálogo também disponíveis para equipes" })).toBeVisible();
  await expectNoHorizontalScroll(page);
  await expectAccessible(page);
  test.skip(isMobile);
  await page.getByLabel("Empresa", { exact: true }).fill("Construtora Teste");
  await page.getByLabel("Seu nome").fill("Carla Compras");
  await page.getByLabel("E-mail corporativo").fill(`carla.${Date.now()}@construtora.test`);
  await page.getByLabel("Quantas pessoas treinar?").fill("40");
  await page.getByRole("checkbox").first().check();
  await page.getByRole("button", { name: "Solicitar proposta" }).click();
  await expect(page.getByText("Recebemos seu pedido.")).toBeVisible();

  await login(page, ADMIN.email, ADMIN.password);
  await page.goto("/painel/empresas?aba=propostas");
  await expect(page.getByText("Construtora Teste").first()).toBeVisible();
});

test("admin cadastra empresa, contrata vagas e distribui para a equipe", async ({ page, isMobile }) => {
  test.skip(isMobile);
  const stamp = Date.now();
  await login(page, ADMIN.email, ADMIN.password);
  await page.goto("/painel/empresas");
  await expectAccessible(page);
  await page.getByLabel("Nome da empresa").fill(`Logística ${stamp}`);
  await page.getByRole("button", { name: "Cadastrar empresa" }).click();
  await expect(page.getByRole("heading", { level: 1, name: `Logística ${stamp}` })).toBeVisible();

  const poolForm = page.locator("form").filter({ has: page.getByRole("button", { name: "Adicionar vagas" }) });
  await poolForm.getByLabel("Curso, treinamento ou capacitação").selectOption({ label: "Prospecção B2B para Equipes Comerciais" });
  await poolForm.getByLabel("Vagas").fill("2");
  await poolForm.getByRole("button", { name: "Adicionar vagas" }).click();
  await expect(page.getByText("2 vaga(s) de Prospecção B2B para Equipes Comerciais adicionadas.")).toBeVisible();

  await page.getByLabel("E-mails dos colaboradores").fill(`instrutor@exemplo.com.br\nnovo.${stamp}@logistica.test\nterceiro.${stamp}@logistica.test`);
  await page.getByLabel("Equipe / área (opcional)").fill("Comercial");
  await page.getByRole("button", { name: "Atribuir vagas" }).click();
  await expect(page.getByText(/1 acesso\(s\) liberado\(s\) · 1 convite\(s\) enviado\(s\).*1 não atribuído/)).toBeVisible();
  await expect(page.getByText("sem vagas disponíveis")).toBeVisible();
  await expect(page.getByText("2 de 2")).toBeVisible();
  await expectAccessible(page);

  await page.getByLabel("E-mail do gestor").fill("pedagogico@exemplo.com.br");
  await page.getByRole("button", { name: "Adicionar gestor" }).click();
  await expect(page.getByText("Paula Pedagógica agora é gestor(a) da empresa.")).toBeVisible();
});

test("gestor acompanha a equipe e exporta o relatório", async ({ page }) => {
  await login(page, "gestor@exemplo.com.br", DEMO_PASSWORD);
  await page.goto("/painel/empresa");
  await expect(page.getByRole("heading", { level: 1, name: "Logística Exemplo" })).toBeVisible();
  await expect(page.getByText("Ana Aluna").first()).toBeVisible();
  await expect(page.getByText("novo.colaborador@exemplo.com.br")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Gestão justa de equipes e escalas" })).toBeVisible();
  await expectNoHorizontalScroll(page);
  await expectAccessible(page);
  const csv = await page.request.get(await page.getByRole("link", { name: "Exportar relatório (CSV)" }).getAttribute("href") ?? "");
  expect(csv.status()).toBe(200);
  expect(await csv.text()).toContain("aluno@exemplo.com.br");
});

test("aluno sem empresa não acessa a área do gestor nem o relatório", async ({ page }) => {
  await login(page, "instrutor@exemplo.com.br", DEMO_PASSWORD);
  await page.goto("/painel/empresa");
  await expect(page).toHaveURL(/erro=sem-permissao/);
  await page.goto("/painel/empresas");
  await expect(page).toHaveURL(/erro=sem-permissao/);
});
