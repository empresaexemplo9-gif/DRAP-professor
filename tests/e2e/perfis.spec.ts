import { expect, test } from "@playwright/test";
import { ADMIN, DEMO_PASSWORD, expectAccessible, login } from "./helpers";

const ALUNO_TABS = ["Início", "Meu Aprendizado", "Catálogo", "Agenda", "Fórum", "Certificados"];

test("aluno vê só as abas de estudo e não acessa áreas de admin", async ({ page, isMobile }) => {
  await login(page, "aluno@exemplo.com.br", DEMO_PASSWORD);
  if (isMobile) await page.getByRole("button", { name: "Abrir menu" }).click();
  const nav = page.getByRole("navigation", { name: "Menu principal" }).last();
  for (const tab of ALUNO_TABS) await expect(nav.getByRole("link", { name: tab })).toBeVisible();
  for (const tab of ["Financeiro", "Usuários", "Configurações e Tema", "Conteúdo"]) await expect(nav.getByRole("link", { name: tab })).toHaveCount(0);
  if (isMobile) await page.keyboard.press("Escape");
  await expectAccessible(page);
  await page.goto("/painel/usuarios");
  await expect(page).toHaveURL(/erro=sem-permissao/);
});

test("aluno matriculado lê o assunto e marca como concluído", async ({ page }) => {
  await login(page, "aluno@exemplo.com.br", DEMO_PASSWORD);
  await page.goto("/capacitacoes/agronegocio/boas-praticas-defensivos/triplice-lavagem");
  await expect(page.getByRole("heading", { level: 1, name: "Tríplice lavagem" })).toBeVisible();
  await expect(page.getByRole("note", { name: "Dica" })).toBeVisible();
  const button = page.getByRole("button", { name: /Marcar como concluído|Concluído — desmarcar/ });
  if ((await button.textContent())?.includes("desmarcar")) await button.click();
  await page.getByRole("button", { name: "Marcar como concluído" }).click();
  await expect(page.getByRole("button", { name: /Concluído — desmarcar/ })).toBeVisible();
  await expectAccessible(page);
});

test("pedagógico gerencia conteúdo mas não usuários", async ({ page }) => {
  await login(page, "pedagogico@exemplo.com.br", DEMO_PASSWORD);
  await page.goto("/painel/conteudo");
  await expect(page.getByRole("heading", { level: 1, name: "Conteúdo" })).toBeVisible();
  await page.goto("/painel/configuracoes");
  await expect(page).toHaveURL(/erro=sem-permissao/);
});

test("admin acessa todas as abas", async ({ page, isMobile }) => {
  await login(page, ADMIN.email, ADMIN.password);
  if (isMobile) await page.getByRole("button", { name: "Abrir menu" }).click();
  const nav = page.getByRole("navigation", { name: "Menu principal" }).last();
  for (const tab of [...ALUNO_TABS, "Conteúdo", "Financeiro", "Biblioteca de Materiais", "Usuários", "Configurações e Tema"]) {
    await expect(nav.getByRole("link", { name: tab })).toBeVisible();
  }
});

test("usuário troca a própria senha e volta à original", async ({ page, isMobile }) => {
  test.skip(isMobile);
  const temp = "Temp@987654321";
  await login(page, "instrutor@exemplo.com.br", DEMO_PASSWORD);
  for (const [from, to] of [[DEMO_PASSWORD, temp], [temp, DEMO_PASSWORD]]) {
    await page.goto("/painel/conta");
    await page.getByLabel("Senha atual").fill(from!);
    await page.getByLabel("Nova senha", { exact: true }).fill(to!);
    await page.getByLabel("Confirme a nova senha").fill(to!);
    await page.getByRole("button", { name: "Alterar senha" }).click();
    await expect(page.getByText("Senha alterada.")).toBeVisible();
  }
});
