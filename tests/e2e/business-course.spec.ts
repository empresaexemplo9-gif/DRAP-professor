import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import outline from "../../content/courses/gestao-de-empresas/outline.json";
import { expectAccessible, expectNoHorizontalScroll, login, DEMO_PASSWORD } from "./helpers";

const coursePath = "/cursos/gestao-e-negocios/gestao-de-empresas";
const downloadPath = "/api/courses/gestao-de-empresas/apostila";
const first = outline.topics.find((topic) => "moduleNumber" in topic && topic.moduleNumber === 1)!;

test("curso tem área própria, programa completo e conteúdo protegido", async ({ page, request }) => {
  await page.goto("/cursos/gestao-e-negocios");
  await page
    .locator("main")
    .getByRole("link", { name: /Curso Livre de Gestão de Empresas/ })
    .click();
  await expect(page).toHaveURL(coursePath);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Curso Livre de\s*Gestão de Empresas/);
  await expect(page.getByText("200 horas", { exact: true })).toBeVisible();
  await expect(page.locator("#programa details")).toHaveCount(6);
  await expect(page.getByRole("heading", { name: "Projeto integrador: seu Plano de Gestão" })).toBeVisible();
  await expectAccessible(page);
  await expectNoHorizontalScroll(page);
  const response = await page.goto(`${coursePath}/${first.slug}`);
  await expect(page.getByRole("heading", { name: "Conteúdo exclusivo para alunos matriculados" })).toBeVisible();
  expect(await response!.text()).not.toContain("Qual autor é associado à Administração Científica?");
  await expect(page.getByRole("table")).toHaveCount(0);
  await expect(page.locator("main").getByRole("radio")).toHaveCount(0);
  expect((await request.get(downloadPath)).status()).toBe(401);
});

test("conta sem matrícula não acessa a apostila nem os exercícios", async ({ page }) => {
  await login(page, "instrutor@exemplo.com.br", DEMO_PASSWORD);
  expect((await page.request.get(downloadPath)).status()).toBe(403);
  await page.goto(`${coursePath}/${first.slug}`);
  await expect(page.getByRole("heading", { name: "Conteúdo exclusivo para alunos matriculados" })).toBeVisible();
  await expect(page.locator("main").getByRole("radio")).toHaveCount(0);
});

test("aluno estuda, corrige exercícios, salva progresso e baixa o documento original", async ({ page }) => {
  await login(page, "aluno@exemplo.com.br", DEMO_PASSWORD);
  await page.goto(`${coursePath}/${first.slug}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(first.title);
  await expect(page.getByRole("table").first()).toBeVisible();
  const practice = page.getByRole("region", { name: "Exercícios de fixação" });
  await expect(practice.getByRole("group")).toHaveCount(2);
  await practice.getByRole("radio", { name: /b\)Taylor/i }).check();
  await practice.getByRole("radio", { name: /d\)Controlar/i }).check();
  await practice.getByRole("button", { name: "Conferir respostas" }).click();
  await expect(practice.getByRole("status")).toContainText("Você acertou 2 de 2 questões (100%)");
  await practice.getByRole("button", { name: "Refazer exercícios" }).click();
  await expect(practice.getByRole("radio").first()).not.toBeChecked();
  await expect(practice.getByRole("radio").first()).toBeEnabled();
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
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Módulo 2");
  await expect(page.locator("main").getByRole("radio").first()).not.toBeChecked();
  await page.goto(coursePath);
  await expect(page.getByText("1 de 19 etapas formativas", { exact: true })).toBeVisible();
  const download = await page.request.get(downloadPath);
  expect(download.status()).toBe(200);
  expect(download.headers()["content-type"]).toContain("wordprocessingml.document");
  expect(download.headers()["cache-control"]).toContain("private, no-store");
  const original = readFileSync("content/courses/gestao-de-empresas/source.docx");
  expect(
    createHash("sha256")
      .update(await download.body())
      .digest("hex"),
  ).toBe(createHash("sha256").update(original).digest("hex"));
});

test("banco reúne as 36 questões e o gabarito da apostila", async ({ page }) => {
  await login(page, "aluno@exemplo.com.br", DEMO_PASSWORD);
  await page.goto(`${coursePath}/banco-de-questoes`);
  await expect(page.getByRole("region", { name: "Exercícios de fixação" }).getByRole("group")).toHaveCount(36);
  const original = page
    .locator("details")
    .filter({ has: page.getByText("Consultar questões e gabarito da apostila", { exact: true }) });
  await expect(original).not.toHaveAttribute("open");
  await original.locator("summary").click();
  await expect(original.getByRole("table")).toBeVisible();
  await expectNoHorizontalScroll(page);
});
