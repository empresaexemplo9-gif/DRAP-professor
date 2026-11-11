import { expect, test } from "@playwright/test";
import { ADMIN, DEMO_PASSWORD, expectAccessible, expectNoHorizontalScroll, login } from "./helpers";

// Curso de teste com prova (tests/fixtures/cursos), usado para validar o bloqueio por pagamento.
const COURSE_TITLE = "Curso de teste automatizado";
const TOPIC = "/cursos/testes-automatizados/curso-de-teste-automatizado/m1-primeiro-modulo";
const LEARNER = "instrutor@exemplo.com.br";
const PENDING = /As provas e o certificado são liberados quando o pagamento/;

test.describe.configure({ mode: "serial" });

test("pedido vira proposta com brasão; o aceite cria matrículas e o pagamento libera a prova", async ({ page, browser, isMobile }) => {
  test.skip(isMobile, "fluxo completo validado no desktop; leitura no celular validada abaixo");
  const company = `Horizonte ${Date.now()}`;

  // Preço por pessoa para empresas, base da proposta.
  await login(page, ADMIN.email, ADMIN.password);
  await page.goto("/painel/financeiro");
  const row = page.getByRole("row").filter({ hasText: COURSE_TITLE });
  await row.getByLabel("Preço por pessoa para empresas, em reais").fill("150,00");
  await row.getByLabel("Preço por pessoa para empresas, em reais").press("Enter");
  await expect(row.getByText(/Preço por pessoa atualizado|Nenhuma alteração/)).toBeVisible();

  // O cliente marca o curso e recebe a proposta na hora.
  const client = await (await browser.newContext({ locale: "pt-BR" })).newPage();
  await client.goto("/empresas#proposta");
  await client.getByLabel("Empresa", { exact: true }).fill(company);
  await client.getByLabel("Seu nome").fill("Carla Monteiro");
  await client.getByLabel("E-mail corporativo").fill(`carla.${Date.now()}@horizonte.test`);
  await client.getByLabel("Quantas pessoas treinar?").fill("4");
  await client.getByRole("checkbox", { name: COURSE_TITLE }).check();
  await client.getByRole("button", { name: "Solicitar proposta" }).click();
  await client.getByRole("link", { name: "Abrir minha proposta" }).click();
  await expect(client.getByRole("heading", { level: 1, name: new RegExp(company) })).toBeVisible();
  await expect(client.getByRole("img", { name: /Brasão/ })).toBeVisible();
  await expect(client.getByText("R$ 600,00").first()).toBeVisible();
  await expectNoHorizontalScroll(client);
  await expectAccessible(client);

  // Aceite com a lista da equipe: matrícula criada na hora.
  await client.getByLabel("E-mails da equipe (opcional)").fill(LEARNER);
  await client.getByRole("checkbox").check();
  await client.getByRole("button", { name: "Aceitar proposta" }).click();
  await expect(client.getByRole("heading", { name: "Proposta aceita" })).toBeVisible();
  await expectAccessible(client);
  await client.context().close();

  // Colaborador: conteúdo liberado, prova bloqueada até o pagamento.
  const learner = await (await browser.newContext({ locale: "pt-BR" })).newPage();
  await login(learner, LEARNER, DEMO_PASSWORD);
  await learner.goto(TOPIC);
  await expect(learner.getByRole("heading", { name: "Prova do módulo" })).toBeVisible();
  await expect(learner.getByRole("button", { name: /Marcar aula como concluída|Desmarcar/ }).first()).toBeVisible();
  await expect(learner.getByText(PENDING)).toBeVisible();
  await expect(learner.getByRole("button", { name: /Iniciar prova/ })).toHaveCount(0);

  // O administrador vê a proposta aceita e confirma o pagamento do contrato.
  await page.goto("/painel/empresas?aba=propostas");
  const lead = page.getByRole("row").filter({ hasText: company });
  await expect(lead.getByText("Aceita")).toBeVisible();
  await lead.getByRole("link", { name: "Ver empresa e contratos" }).click();
  await expect(page.getByText("Pagamento pendente.")).toBeVisible();
  await page.getByRole("button", { name: "Confirmar pagamento" }).click();
  await expect(page.getByText(/Pagamento confirmado em/)).toBeVisible();

  await learner.reload();
  await expect(learner.getByText(PENDING)).toHaveCount(0);
  await learner.context().close();
});

test("link de proposta inexistente responde 404", async ({ page }) => {
  const res = await page.goto("/proposta/abcdefghijklmnopqrstuvwxyz012345");
  expect(res?.status()).toBe(404);
});
