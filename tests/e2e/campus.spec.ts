import { expect, test } from "@playwright/test";
import { expectAccessible, expectNoHorizontalScroll, login, DEMO_PASSWORD } from "./helpers";

test("campus apresenta a proposta pedagógica e filtra formações por formato", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "O conhecimento abre portas. A educação, caminhos." })).toBeVisible();
  const formations = page.locator("#formacoes");
  await formations.getByRole("button", { name: "Cursos", exact: true }).click();
  await expect(formations.getByRole("button", { name: "Cursos", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(formations.getByRole("link", { name: /Gestão de Safra/ })).toBeVisible();
  await expect(formations.getByRole("link", { name: /Mentoria em Finanças/ })).toHaveCount(0);
  await formations.getByRole("button", { name: "Mentorias", exact: true }).click();
  await expect(formations.getByRole("link", { name: /Mentoria em Finanças/ })).toBeVisible();
  await expect(formations.getByRole("link", { name: /Gestão de Safra/ })).toHaveCount(0);
  await expect(
    page.locator("#biblioteca").getByRole("heading", { name: "A curiosidade é o começo de tudo." }),
  ).toBeVisible();
  await expectNoHorizontalScroll(page);
});

test("busca encontra uma formação pelo assunto e permite recuperar uma busca vazia", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("searchbox", { name: "Pesquisar formações e conteúdos" }).fill("Tríplice lavagem");
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await expect(page).toHaveURL(/\/buscar\?q=/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Tríplice lavagem");
  await expect(page.locator("main").getByRole("link", { name: /Capacitação em Boas Práticas/ })).toBeVisible();
  await expectAccessible(page);
  await page
    .getByRole("searchbox", { name: "O que você quer aprender?", exact: true })
    .fill("zzzz-campus-sem-resultados");
  await page.getByRole("button", { name: "Pesquisar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Vamos descobrir outro caminho?" })).toBeVisible();
  await page.getByRole("link", { name: "Ver todas as formações", exact: true }).click();
  await expect(page).toHaveURL(/\/buscar$/);
  await expect(page.getByRole("link", { name: /Gestão de Safra/ })).toBeVisible();
  await expectNoHorizontalScroll(page);
});

test("painel do estudante oferece retomada de conteúdo e recursos acadêmicos", async ({ page }) => {
  await login(page, "aluno@exemplo.com.br", DEMO_PASSWORD);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Olá, Ana.");
  await expect(page.getByRole("link", { name: "Minha conta: Ana Aluna" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Sua jornada acadêmica em números" })).toContainText(
    "Assuntos concluídos",
  );
  await expect(
    page
      .getByRole("complementary", { name: "Espaço do estudante" })
      .getByRole("link", { name: /Biblioteca de saberes/ }),
  ).toBeVisible();
  const courses = page.getByRole("region", { name: "Seu próximo aprendizado." });
  await expect(courses.getByRole("heading", { name: "Gestão de Safra" })).toBeVisible();
  const resume = courses.getByRole("link", { name: "Continuar aprendendo" }).first();
  await expect(resume).toHaveAttribute(
    "href",
    /^\/(mentorias|treinamentos|cursos|aulas|capacitacoes)\/[^/]+\/[^/]+\/[^/]+$/,
  );
  await resume.click();
  await expect(page.locator("article")).toBeVisible();
  await expectNoHorizontalScroll(page);
});
