import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import outline from "../../content/courses/consultoria-financeira/outline.json";
import { login, DEMO_PASSWORD, expectAccessible, expectNoHorizontalScroll } from "./helpers";
const course = "/cursos/financas/formacao-avancada-consultoria-financeira";
const downloads = "/api/courses/consultoria-financeira/materiais";
const first = outline.topics.find((t) => t.moduleNumber === 1)!;

test("formação de finanças tem programa próprio e protege conteúdo e materiais", async ({ page, request }) => {
  await page.goto("/cursos/financas");
  await page
    .locator("main")
    .getByRole("link", { name: /Formação Avançada em Consultoria Financeira/ })
    .click();
  await expect(page).toHaveURL(course);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Formação Avançada em Consultoria Financeira");
  await expect(page.getByText("400 horas", { exact: true })).toBeVisible();
  await expect(page.locator("#programa-financeiro details")).toHaveCount(5);
  await expect(page.getByRole("heading", { name: "Projeto final e critérios de conclusão" })).toBeVisible();
  await expectAccessible(page);
  await expectNoHorizontalScroll(page);
  const response = await page.goto(`${course}/${first.slug}`);
  await expect(page.getByRole("heading", { name: "Conteúdo exclusivo para alunos matriculados" })).toBeVisible();
  expect(await response!.text()).not.toContain("Qual é o primeiro passo diante de um pedido vago de consultoria?");
  expect((await request.get(`${downloads}/apostila`)).status()).toBe(401);
  expect((await request.get(`${downloads}/caderno`)).status()).toBe(401);
  expect((await request.get(`${downloads}/inexistente`)).status()).toBe(404);
});

test("aluno salva e retoma respostas privadas, consulta orientações e registra progresso", async ({ page }) => {
  await login(page, "aluno@exemplo.com.br", DEMO_PASSWORD);
  await page.goto(`${course}/${first.slug}`);
  const notebook = page.getByRole("region", { name: "Caderno de prática" });
  await expect(notebook.getByRole("textbox")).toHaveCount(9);
  const answer = "Delimitar o mandato, os dados e a decisão a ser tomada. Rascunho pessoal de estudo.";
  await notebook.getByRole("textbox").first().fill(answer);
  await notebook.getByRole("button", { name: "Salvar rascunho", exact: true }).click();
  await expect(notebook.getByRole("status")).toContainText("Rascunho salvo na sua conta");
  await expect(notebook.getByRole("textbox").first()).toHaveValue(answer);
  await page.reload();
  await expect(notebook.getByRole("textbox").first()).toHaveValue(answer);
  await notebook.locator("summary").first().click();
  await expect(
    notebook.getByText(
      "Definir a decisão a ser tomada, o objetivo, o escopo e os critérios de sucesso antes de escolher ferramentas.",
    ),
  ).toBeVisible();
  await expect(
    page.locator("article").getByText("Exercício resolvido 01 — Fundamentos e mandato", { exact: true }),
  ).toBeVisible();
  await expectAccessible(page);
  await expectNoHorizontalScroll(page);
  const done = page.getByRole("button", { name: "✓ Concluído — desmarcar", exact: true });
  if (await done.count()) {
    await done.click();
    await expect(page.getByRole("button", { name: "Marcar como concluído", exact: true })).toBeVisible();
  }
  await page.getByRole("button", { name: "Marcar como concluído", exact: true }).click();
  await expect(done).toBeVisible();
  await page.reload();
  await expect(done).toBeVisible();
  await page.getByRole("link", { name: "Próximo →", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Módulo 02");
  await expect(notebook.getByRole("textbox").first()).toHaveValue("");
  await page.goto(course);
  await expect(page.getByText("1 de 19 etapas de estudo", { exact: true })).toBeVisible();
  for (const file of ["apostila", "caderno"]) {
    const response = await page.request.get(`${downloads}/${file}`);
    expect(response.status()).toBe(200);
    expect(response.headers()["cache-control"]).toBe("private, no-store");
    const original = readFileSync(`content/courses/consultoria-financeira/originals/${file}.docx`);
    expect(
      createHash("sha256")
        .update(await response.body())
        .digest("hex"),
    ).toBe(createHash("sha256").update(original).digest("hex"));
  }
});

test("usuário sem matrícula não recebe conteúdo, caderno ou downloads", async ({ page }) => {
  await login(page, "instrutor@exemplo.com.br", DEMO_PASSWORD);
  await page.goto(`${course}/${first.slug}`);
  await expect(page.getByRole("heading", { name: "Conteúdo exclusivo para alunos matriculados" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Caderno de prática" })).toHaveCount(0);
  for (const material of ["apostila", "caderno"])
    expect((await page.request.get(`${downloads}/${material}`)).status()).toBe(403);
});
