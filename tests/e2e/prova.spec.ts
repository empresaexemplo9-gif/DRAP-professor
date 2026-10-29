import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { parseCourse } from "../../src/content-import/course";
import { ADMIN, DEMO_PASSWORD, expectAccessible, expectNoHorizontalScroll, login } from "./helpers";

// Curso de teste em tests/fixtures/cursos (o CI semeia esse diretório junto com o catálogo).
const COURSE = "/cursos/testes-automatizados/curso-de-teste-automatizado";
const TOPIC = `${COURSE}/m1-primeiro-modulo`;

test.describe.configure({ mode: "serial" });

test("aluno conclui as aulas, faz a prova e recebe o gabarito comentado", async ({ page, isMobile }) => {
  test.skip(isMobile, "fluxo da prova validado no desktop; leitura validada no celular abaixo");
  await login(page, "aluno@exemplo.com.br", DEMO_PASSWORD);
  await page.goto(TOPIC);
  await expect(page.getByRole("heading", { name: "Prova do módulo" })).toBeVisible();

  const start = page.getByRole("button", { name: /Iniciar prova/ });
  if (await start.isHidden()) {
    // Presença mínima: as duas aulas precisam estar concluídas.
    const mark = page.getByRole("button", { name: "Marcar aula como concluída" });
    for (let left = await mark.count(); left > 0; left--) {
      await mark.first().click();
      await expect(mark).toHaveCount(left - 1);
    }
  }
  await expect(page.getByRole("button", { name: /Iniciar prova/ }).or(page.getByRole("link", { name: "Gabarito comentado" })).first()).toBeVisible();
  if (await page.getByRole("button", { name: /Iniciar prova/ }).isVisible()) {
    await page.getByRole("button", { name: /Iniciar prova/ }).click();
    await page.waitForURL(`**${TOPIC}/prova`);
    await expect(page.getByRole("timer")).toBeVisible();
    // Gabarito e comentários não chegam ao navegador durante a prova.
    expect(await page.content()).not.toContain("é a correta porque");
    const questions = page.locator("ol > li fieldset");
    await expect(questions).toHaveCount(10);
    await expectAccessible(page);
    for (let i = 0; i < 10; i++) await questions.nth(i).getByRole("radio").first().check();
    await expect(page.getByText("10/10 respondidas")).toBeVisible();
    await page.getByRole("button", { name: "Entregar prova" }).click();
    await page.getByRole("button", { name: "Confirmar entrega" }).click();
    await page.waitForURL(/\/prova\/[0-9a-f-]{36}$/);
  } else {
    await page.getByRole("link", { name: "Gabarito comentado" }).first().click();
  }

  await expect(page.getByRole("heading", { name: "Gabarito comentado" })).toBeVisible();
  await expect(page.getByText("Desempenho por objetivo")).toBeVisible();
  await expect(page.getByText("é a correta porque").first()).toBeVisible();
  await expectAccessible(page);

  await page.getByRole("link", { name: "Voltar ao módulo" }).click();
  await expect(page.getByText("Suas tentativas")).toBeVisible();
});

test("página do curso mostra ficha, regras de avaliação e notas", async ({ page }) => {
  await login(page, "aluno@exemplo.com.br", DEMO_PASSWORD);
  await page.goto(COURSE);
  await expect(page.getByRole("heading", { name: "Ficha do curso" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Como você é avaliado" })).toBeVisible();
  await expect(page.getByText("Nota final", { exact: true })).toBeVisible();
  await expectAccessible(page);
  await expectNoHorizontalScroll(page);
});

test("equipe pedagógica vê as métricas do banco de questões", async ({ page, isMobile }) => {
  test.skip(isMobile, "painel de métricas validado no desktop");
  await login(page, ADMIN.email, ADMIN.password);
  await page.goto(COURSE);
  await page.getByRole("link", { name: "Métricas de ensino e aprendizagem" }).click();
  await expect(page.getByRole("heading", { name: "Qualidade do banco de questões" })).toBeVisible();
  await expect(page.getByText("TST001-M1-Q01 v1")).toBeVisible();
  await expectAccessible(page);
});

// Cada curso do catálogo oficial (content/cursos) abre a ficha e o primeiro módulo sem violações de acessibilidade.
const CATALOG = process.env.E2E_COURSES_DIR ?? join(process.cwd(), "content", "cursos");
for (const file of readdirSync(CATALOG).filter((f) => f.endsWith(".md")).sort()) {
  test(`curso do catálogo ${file} abre ficha e primeiro módulo`, async ({ page, isMobile }) => {
    test.skip(isMobile, "conteúdo dos cursos validado no desktop; o layout móvel é coberto pelo curso de teste");
    const spec = parseCourse(readFileSync(join(CATALOG, file), "utf8"), file);
    await login(page, "aluno@exemplo.com.br", DEMO_PASSWORD);
    const course = `/cursos/${spec.segment.slug}/${spec.slug}`;
    await page.goto(course);
    await expect(page.getByRole("heading", { level: 1, name: spec.title })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Ficha do curso" })).toBeVisible();
    await expectAccessible(page);
    await page.goto(`${course}/${spec.modules[0]!.slug}`);
    await expect(page.getByRole("heading", { name: "Objetivos de aprendizagem" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Prova do módulo" })).toBeVisible();
    await expectAccessible(page);
    await expectNoHorizontalScroll(page);
  });
}
