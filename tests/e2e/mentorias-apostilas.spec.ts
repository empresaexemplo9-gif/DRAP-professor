import { expect, test } from "@playwright/test";
import { ADMIN, DEMO_PASSWORD, expectAccessible, expectNoHorizontalScroll, login } from "./helpers";

const PEQUENAS = "/mentorias/financas/mentoria-financeira-pequenas-empresas";
const MEDIAS = "/mentorias/financas/mentoria-financeira-medias-empresas";

test("as mentorias mostram o roteiro das apostilas e protegem o conteúdo", async ({ page }) => {
  await page.goto(PEQUENAS);
  await expect(page.getByText("Curso livre de 56 h")).toBeVisible();
  await expect(page.getByRole("link", { name: /Módulo 3 — Fluxo de caixa, previsão e cenários/ })).toBeVisible();
  await expectNoHorizontalScroll(page);
  await expectAccessible(page);
  await page.goto(MEDIAS);
  await expect(page.getByText("Curso livre de 80 h")).toBeVisible();
  await expect(page.getByRole("link", { name: /Projeto integrador — Plano financeiro integrado/ })).toBeVisible();

  await page.goto(`${MEDIAS}/modulo-4-capital-de-giro-e-gestao-de-caixa`);
  await expect(page.getByRole("heading", { name: "Conteúdo exclusivo para equipes de empresas contratantes" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Conhecer a mentoria" })).toBeVisible();
  expect((await page.request.get("/api/courses/mentorias/pequenas/pdf")).status()).toBe(401);
});

test("equipe pedagógica lê a prova, consulta o gabarito docente e baixa os originais", async ({ page }) => {
  await login(page, ADMIN.email, ADMIN.password);
  await page.goto(`${MEDIAS}/modulo-1-medias-empresas-governanca-e-funcao-financeira`);
  await expect(page.getByRole("heading", { level: 1, name: /Médias empresas, governança e função financeira/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Prova do Módulo 1" })).toBeVisible();
  await page.getByText("Gabaritos e critérios de correção (uso docente)").click();
  await expect(page.getByRole("heading", { name: "A.1 Gabarito das questões objetivas" })).toBeVisible();
  await expectAccessible(page);
  const pdf = await page.request.get("/api/courses/mentorias/medias/pdf");
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()["content-type"]).toContain("application/pdf");

  await page.goto(`${PEQUENAS}/modulo-1-diagnostico-financeiro-e-governanca`);
  await expect(page.getByRole("heading", { name: "Exercícios de fixação" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Baixar Apostila editável (DOCX)" })).toBeVisible();
  const docx = await page.request.get("/api/courses/mentorias/pequenas/docx");
  expect(docx.status()).toBe(200);
  expect(docx.headers()["content-type"]).toContain("wordprocessingml");
});

test("quem não é da empresa nem da equipe pedagógica não baixa as apostilas", async ({ page }) => {
  await login(page, "instrutor@exemplo.com.br", DEMO_PASSWORD);
  expect((await page.request.get("/api/courses/mentorias/pequenas/pdf")).status()).toBe(403);
  expect((await page.request.get("/api/courses/mentorias/medias/md")).status()).toBe(403);
  expect((await page.request.get("/api/courses/mentorias/medias/xls")).status()).toBe(404);
});
