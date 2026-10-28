/**
 * Seed idempotente: tenant padrão, 5 níveis, segmentos, módulos de exemplo publicados
 * e o administrador inicial. Usuários de demonstração só com SEED_DEMO_USERS=1.
 *
 *   SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD   administrador inicial
 *   SEED_TENANT_NAME / DEFAULT_TENANT_SLUG   tenant
 *   SEED_TENANT_DOMAINS                       domínios separados por vírgula
 */
import { PrismaClient, type LevelKind, type Prisma, type Role } from "@prisma/client";
import { hash } from "@node-rs/argon2";
import { randomBytes } from "node:crypto";
import { LEVELS } from "../src/lib/levels";
import { seedFinancialCourse } from "./courses/financial-consulting";
import { seedBusinessCourse } from "./courses/business-management";
import type { ContentDocument } from "../src/content-blocks/schema";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { parseCourse } from "../src/content-import/course";
import { syncCourse } from "../src/content-import/sync";

try {
  process.loadEnvFile(".env");
} catch {
  // sem .env: usa as variáveis do ambiente
}

const prisma = new PrismaClient();

const t = (text: string, marks?: ("bold" | "italic")[]) => ({ kind: "text" as const, text, ...(marks ? { marks } : {}) });
let seq = 0;
const id = () => `seed${(++seq).toString(36)}`;

function doc(title: string, sections: { title: string; paragraphs: string[]; tip?: string; list?: string[]; table?: string[][] }[]): ContentDocument {
  return {
    schemaVersion: 2,
    title,
    sections: sections.map((s) => ({
      id: id(),
      kind: "section" as const,
      title: s.title,
      blocks: [
        ...s.paragraphs.map((p) => ({ id: id(), type: "paragraph" as const, text: [t(p)] })),
        ...(s.list ? [{ id: id(), type: "list" as const, style: "bullet" as const, items: s.list.map((i) => ({ text: [t(i)] })) }] : []),
        ...(s.table
          ? [{ id: id(), type: "table" as const, header: [s.table[0]!.map((c) => ({ text: [t(c)] }))], rows: s.table.slice(1).map((r) => r.map((c) => ({ text: [t(c)] }))) }]
          : []),
        ...(s.tip ? [{ id: id(), type: "callout" as const, variant: "dica" as const, blocks: [{ id: id(), type: "paragraph" as const, text: [t(s.tip)] }] }] : []),
      ],
    })),
  };
}

type ModuleSeed = {
  level: LevelKind;
  segment: string;
  title: string;
  slug: string;
  summary: string;
  hours: number;
  certificateType: "LIVRE" | "CAPACITACAO";
  config: Record<string, unknown>;
  topics: { title: string; slug: string; minutes: number; doc: ContentDocument }[];
};

const SEGMENTS = [
  { name: "Gestão e Liderança", slug: "gestao-e-lideranca", description: "Liderança de equipes, comunicação e tomada de decisão." },
  { name: "Finanças", slug: "financas", description: "Finanças empresariais e pessoais." },
  { name: "Vendas", slug: "vendas", description: "Prospecção, negociação e relacionamento." },
  { name: "Arquitetura", slug: "arquitetura", description: "Projeto, gestão de obras e normas." },
  { name: "Tecnologia", slug: "tecnologia", description: "Ferramentas digitais, dados e segurança da informação." },
];

const MODULES: ModuleSeed[] = [
  {
    level: "CURSO",
    segment: "gestao-e-lideranca",
    title: "Fundamentos de Liderança",
    slug: "fundamentos-de-lideranca",
    summary: "Papéis do líder, comunicação, feedback e acompanhamento de resultados da equipe.",
    hours: 12,
    certificateType: "LIVRE",
    config: { sequential: true, finalExam: true, minScore: 70 },
    topics: [
      {
        title: "Papéis do líder",
        slug: "papeis-do-lider",
        minutes: 45,
        doc: doc("Papéis do líder", [
          { title: "O que muda ao liderar", paragraphs: ["Ao assumir a liderança, o foco deixa de ser apenas a própria entrega e passa a ser o resultado do time.", "O líder define direção, remove obstáculos e desenvolve as pessoas."], list: ["Dar direção e prioridades claras", "Acompanhar resultados com indicadores", "Desenvolver cada pessoa da equipe"], tip: "Reserve na agenda um horário fixo semanal para conversas individuais com o time." },
          { title: "Rotina de acompanhamento", paragraphs: ["Uma rotina simples e previsível dá segurança à equipe e evita surpresas."], table: [["Ritual", "Frequência", "Objetivo"], ["Reunião de alinhamento", "Semanal", "Prioridades e bloqueios"], ["Conversa individual", "Quinzenal", "Desenvolvimento"], ["Revisão de resultados", "Mensal", "Indicadores e ajustes"]] },
        ]),
      },
      {
        title: "Feedback eficaz",
        slug: "feedback-eficaz",
        minutes: 50,
        doc: doc("Feedback eficaz", [
          { title: "Estrutura do feedback", paragraphs: ["Um bom feedback descreve o comportamento observado, o impacto que ele gerou e o próximo passo esperado."], table: [["Etapa", "Pergunta-guia", "Exemplo"], ["Situação", "Quando e onde?", "Na reunião de terça"], ["Comportamento", "O que foi feito?", "Apresentou os dados com clareza"], ["Impacto", "Qual o efeito?", "O cliente aprovou a proposta"]] },
          { title: "Frequência", paragraphs: ["Feedback funciona melhor quando é frequente, próximo do fato e equilibrado entre reconhecimento e ajuste."], tip: "Prefira conversas curtas e frequentes a uma avaliação longa no fim do ano." },
        ]),
      },
    ],
  },
  {
    level: "MENTORIA",
    segment: "financas",
    title: "Mentoria em Finanças para Pequenas Empresas",
    slug: "financas-pequenas-empresas",
    summary: "Encontros individuais para organizar o caixa, precificar e planejar o crescimento.",
    hours: 6,
    certificateType: "LIVRE",
    config: { sessionFormat: "INDIVIDUAL", plannedSessions: 6, sessionMinutes: 60, videoCallUrl: "" },
    topics: [
      { title: "Diagnóstico financeiro", slug: "diagnostico-financeiro", minutes: 60, doc: doc("Diagnóstico financeiro", [{ title: "Antes do primeiro encontro", paragraphs: ["Reúna extratos dos últimos 6 meses, contas a pagar e a receber e a lista de produtos com preços."], list: ["Faturamento mensal", "Despesas fixas", "Margem por produto"] }]) },
      { title: "Fluxo de caixa", slug: "fluxo-de-caixa", minutes: 60, doc: doc("Fluxo de caixa", [{ title: "Projeção de 13 semanas", paragraphs: ["Projete entradas e saídas semana a semana para antecipar faltas de caixa."], tip: "Atualize a projeção toda segunda-feira, comparando o previsto com o realizado." }]) },
    ],
  },
  {
    level: "TREINAMENTO",
    segment: "vendas",
    title: "Prospecção B2B para Equipes Comerciais",
    slug: "prospeccao-b2b",
    summary: "Trilha para equipes: perfil de cliente ideal, cadência de contatos e qualificação.",
    hours: 8,
    certificateType: "CAPACITACAO",
    config: { targetAudience: "Equipes comerciais", deadlineDays: 30, teamGoalPercent: 90 },
    topics: [
      { title: "Perfil de cliente ideal", slug: "perfil-de-cliente-ideal", minutes: 40, doc: doc("Perfil de cliente ideal", [{ title: "Definindo o ICP", paragraphs: ["O perfil de cliente ideal (ICP) descreve as empresas com maior chance de compra e de sucesso."], list: ["Setor e porte", "Dores principais", "Quem decide a compra"] }]) },
      { title: "Cadência de contatos", slug: "cadencia-de-contatos", minutes: 40, doc: doc("Cadência de contatos", [{ title: "Exemplo de cadência", paragraphs: ["Combine canais e intervalos para manter a presença sem ser invasivo."], table: [["Dia", "Canal", "Objetivo"], ["1", "E-mail", "Apresentação"], ["3", "Telefone", "Conexão"], ["7", "LinkedIn", "Conteúdo de valor"]] }]) },
    ],
  },
  {
    level: "AULA",
    segment: "arquitetura",
    title: "Introdução à NBR 9050 — Acessibilidade",
    slug: "introducao-nbr-9050",
    summary: "Aula avulsa com os principais requisitos de acessibilidade em edificações.",
    hours: 1.5,
    certificateType: "LIVRE",
    config: { format: "GRAVADA", liveAt: "", liveUrl: "" },
    topics: [{ title: "Rotas acessíveis", slug: "rotas-acessiveis", minutes: 45, doc: doc("Rotas acessíveis", [{ title: "Conceito", paragraphs: ["Rota acessível é o trajeto contínuo, desobstruído e sinalizado que conecta ambientes e pode ser usado por todas as pessoas."], tip: "Sempre confira a versão vigente da norma antes de aplicá-la em projeto." }]) }],
  },
  {
    level: "CAPACITACAO",
    segment: "tecnologia",
    title: "Segurança da Informação no Trabalho",
    slug: "seguranca-da-informacao",
    summary: "Programa com carga horária, frequência mínima e avaliação sobre boas práticas de segurança digital.",
    hours: 16,
    certificateType: "CAPACITACAO",
    config: { minAttendancePercent: 75, minScore: 70 },
    topics: [
      { title: "Senhas e autenticação", slug: "senhas-e-autenticacao", minutes: 60, doc: doc("Senhas e autenticação", [{ title: "Boas práticas", paragraphs: ["Senhas longas, únicas para cada serviço e guardadas em um gerenciador reduzem drasticamente o risco de invasão."], list: ["Use frases-senha longas", "Nunca reutilize senhas", "Ative a verificação em duas etapas"], tip: "Ative a verificação em duas etapas no e-mail corporativo antes de qualquer outro serviço." }]) },
      { title: "Phishing e engenharia social", slug: "phishing-e-engenharia-social", minutes: 45, doc: doc("Phishing e engenharia social", [{ title: "Como reconhecer", paragraphs: ["Mensagens com urgência, remetente desconhecido e links encurtados são os sinais mais comuns de tentativa de golpe."], tip: "Na dúvida, não clique: confirme o pedido por outro canal com a pessoa ou a área responsável." }]) },
    ],
  },
];

async function inTenant<T>(tenantId: string, fn: (tx: Prisma.TransactionClient) => Promise<T>) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
    return fn(tx);
  }, { timeout: 300_000, maxWait: 30_000 });
}

async function upsertUser(email: string, name: string, password: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { user: existing, created: false };
  const userId = randomBytes(16).toString("hex");
  const user = await prisma.user.create({ data: { id: userId, email, name, emailVerified: true } });
  await prisma.account.create({
    data: { id: randomBytes(16).toString("hex"), accountId: userId, providerId: "credential", userId, password: await hash(password, { memoryCost: 19456, timeCost: 2, parallelism: 1 }) },
  });
  return { user, created: true };
}

/** Conteúdo de demonstração (só para desenvolvimento e testes automatizados). */
const DEMO_CONTENT = process.env.SEED_DEMO_CONTENT === "1";

/** Conteúdo de exemplo de versões anteriores, removido da produção. */
const OBSOLETE_MODULE_SLUGS = ["gestao-de-safra", "boas-praticas-defensivos", "financas-pequenas-empresas", "prospeccao-b2b", "introducao-nbr-9050", "fundamentos-de-lideranca", "seguranca-da-informacao"];
const OBSOLETE_SEGMENT_SLUGS = ["agronegocio", "vendas", "arquitetura", "gestao-e-lideranca", "tecnologia"];

// Diretórios de cursos separados por ":" (o CI acrescenta tests/fixtures/cursos para os testes de prova).
const CATALOG_DIRS = (process.env.COURSES_DIR ?? join(process.cwd(), "content", "cursos")).split(":").filter(Boolean);

async function main() {
  const slug = process.env.DEFAULT_TENANT_SLUG ?? "drap";
  const domains = (process.env.SEED_TENANT_DOMAINS ?? "").split(",").map((d) => d.trim().toLowerCase()).filter(Boolean);
  const tenant = await prisma.tenant.upsert({
    where: { slug },
    create: { slug, name: process.env.SEED_TENANT_NAME ?? "DRAP Professor", domains },
    update: domains.length ? { domains } : {},
  });

  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? "admin@exemplo.com.br").toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || randomBytes(12).toString("base64url");
  const admin = await upsertUser(adminEmail, "Administrador", adminPassword);

  const demo: { email: string; name: string; roles: Role[] }[] =
    process.env.SEED_DEMO_USERS === "1"
      ? [
          { email: "pedagogico@exemplo.com.br", name: "Paula Pedagógica", roles: ["PEDAGOGICO"] },
          { email: "instrutor@exemplo.com.br", name: "Igor Instrutor", roles: ["INSTRUTOR"] },
          { email: "aluno@exemplo.com.br", name: "Ana Aluna", roles: ["ALUNO"] },
        ]
      : [];
  const demoPassword = process.env.SEED_DEMO_PASSWORD ?? "Demo@12345678";
  const demoUsers: { email: string; name: string; roles: Role[]; user: { id: string } }[] = [];
  for (const d of demo) demoUsers.push({ ...d, user: (await upsertUser(d.email, d.name, demoPassword)).user });

  await inTenant(tenant.id, async (tx) => {
    await tx.themeSettings.upsert({ where: { tenantId: tenant.id }, create: { tenantId: tenant.id, defaultMode: "LIGHT" }, update: {} });
    // Atualiza apenas o preset antigo, ainda não personalizado, para a nova identidade clara.
    await tx.themeSettings.updateMany({
      where: { tenantId: tenant.id, defaultMode: "DARK", updatedById: null, logoUrl: null, overrides: { equals: {} } },
      data: { defaultMode: "LIGHT" },
    });
    const levelIds = new Map<LevelKind, string>();
    for (const [kind, meta] of Object.entries(LEVELS) as [LevelKind, (typeof LEVELS)[LevelKind]][]) {
      const level = await tx.level.upsert({
        where: { tenantId_kind: { tenantId: tenant.id, kind } },
        create: { tenantId: tenant.id, kind, label: meta.label, slug: meta.slug, description: meta.description, order: meta.order },
        update: {},
      });
      levelIds.set(kind, level.id);
    }
    const segIds = new Map<string, string>();
    for (const [i, s] of (DEMO_CONTENT ? SEGMENTS : []).entries()) {
      const seg = await tx.segment.upsert({
        where: { tenantId_slug: { tenantId: tenant.id, slug: s.slug } },
        create: { tenantId: tenant.id, ...s, order: i },
        update: {},
      });
      segIds.set(s.slug, seg.id);
    }
    const allUsers = [{ user: admin.user, roles: ["ADMIN"] as Role[] }, ...demoUsers];
    for (const u of allUsers) {
      await tx.membership.upsert({
        where: { tenantId_userId: { tenantId: tenant.id, userId: u.user.id } },
        create: { tenantId: tenant.id, userId: u.user.id, roles: u.roles },
        update: {},
      });
      const consented = await tx.consent.findFirst({ where: { tenantId: tenant.id, userId: u.user.id, type: "TERMOS" } });
      if (!consented) {
        const { LEGAL_VERSION } = await import("../src/lib/legal");
        for (const type of ["TERMOS", "PRIVACIDADE"] as const) {
          await tx.consent.create({ data: { tenantId: tenant.id, userId: u.user.id, type, documentVersion: LEGAL_VERSION } });
        }
      }
    }

    for (const [mi, m] of (DEMO_CONTENT ? MODULES : []).entries()) {
      const levelId = levelIds.get(m.level)!;
      const segmentId = segIds.get(m.segment)!;
      const existing = await tx.module.findUnique({ where: { levelId_segmentId_slug: { levelId, segmentId, slug: m.slug } } });
      if (existing) continue;
      const mod = await tx.module.create({
        data: {
          tenantId: tenant.id, levelId, segmentId, title: m.title, slug: m.slug, summary: m.summary,
          workloadMinutes: Math.round(m.hours * 60), status: "PUBLICADO", certificateType: m.certificateType,
          levelConfig: m.config as Prisma.InputJsonValue, order: mi,
        },
      });
      for (const [ti, tp] of m.topics.entries()) {
        const topic = await tx.topic.create({
          data: { tenantId: tenant.id, moduleId: mod.id, title: tp.title, slug: tp.slug, order: ti + 1, durationMinutes: tp.minutes, status: "PUBLICADO", draft: tp.doc as unknown as Prisma.InputJsonValue },
        });
        const v = await tx.topicVersion.create({
          data: { tenantId: tenant.id, topicId: topic.id, number: 1, document: tp.doc as unknown as Prisma.InputJsonValue, authorId: admin.user.id, changeNote: "Conteúdo de exemplo" },
        });
        await tx.topic.update({ where: { id: topic.id }, data: { publishedVersionId: v.id } });
      }
      const student = demoUsers.find((d) => d.roles.includes("ALUNO"));
      if (student) await tx.enrollment.create({ data: { tenantId: tenant.id, userId: student.user.id, moduleId: mod.id, origin: "CORTESIA" } });
    }
    const businessCourse = await seedBusinessCourse(tx, tenant.id, admin.user.id);
    const financialCourse = await seedFinancialCourse(tx, tenant.id, admin.user.id);
    const demoStudent = demoUsers.find((user) => user.roles.includes("ALUNO"));
    if (demoStudent) await tx.enrollment.upsert({
      where: { userId_moduleId: { userId: demoStudent.user.id, moduleId: businessCourse.id } },
      create: { tenantId: tenant.id, userId: demoStudent.user.id, moduleId: businessCourse.id, origin: "CORTESIA" },
      update: {},
    });
    if (demoStudent) await tx.enrollment.upsert({
      where: { userId_moduleId: { userId: demoStudent.user.id, moduleId: financialCourse.id } },
      create: { tenantId: tenant.id, userId: demoStudent.user.id, moduleId: financialCourse.id, origin: "CORTESIA" },
      update: {},
    });
  });

  // Remove o conteúdo de exemplo antigo (inclusive o de agro) quando não estamos em modo demonstração.
  if (!DEMO_CONTENT) {
    await inTenant(tenant.id, async (tx) => {
      const removed = await tx.module.deleteMany({ where: { tenantId: tenant.id, slug: { in: OBSOLETE_MODULE_SLUGS } } });
      const segs = await tx.segment.findMany({ where: { tenantId: tenant.id, slug: { in: OBSOLETE_SEGMENT_SLUGS } }, include: { _count: { select: { modules: true } } } });
      const empty = segs.filter((sg) => sg._count.modules === 0).map((sg) => sg.id);
      if (empty.length) await tx.segment.deleteMany({ where: { id: { in: empty } } });
      if (removed.count || empty.length) console.log(`Conteúdo de exemplo removido: ${removed.count} módulo(s), ${empty.length} segmento(s).`);
    });
  }

  // Catálogo oficial de cursos (content/cursos/*.md), na ordem numérica dos arquivos.
  const files = CATALOG_DIRS.filter((dir) => existsSync(dir)).flatMap((dir) => readdirSync(dir).filter((f) => f.endsWith(".md")).sort().map((f) => join(dir, f)));
  const courseLevel = await inTenant(tenant.id, (tx) => tx.level.findUniqueOrThrow({ where: { tenantId_kind: { tenantId: tenant.id, kind: "CURSO" } } }));
  for (const [i, file] of files.entries()) {
    const spec = parseCourse(readFileSync(file, "utf8"), basename(file));
    const report = await inTenant(tenant.id, async (tx) => {
      const r = await syncCourse(tx, { tenantId: tenant.id, levelId: courseLevel.id, authorId: admin.user.id, order: i, spec });
      const student = demoUsers.find((d) => d.roles.includes("ALUNO"));
      if (student) {
        const mod = await tx.module.findFirstOrThrow({ where: { tenantId: tenant.id, levelId: courseLevel.id, slug: spec.slug } });
        await tx.enrollment.upsert({ where: { userId_moduleId: { userId: student.user.id, moduleId: mod.id } }, create: { tenantId: tenant.id, userId: student.user.id, moduleId: mod.id, origin: "CORTESIA" }, update: {} });
      }
      return r;
    });
    console.log(`Curso ${report.course}: ${report.created ? "criado" : "atualizado"} · ${report.versionsPublished} versão(ões) publicada(s) · questões +${report.questionsCreated} ~${report.questionsUpdated} −${report.questionsRetired}`);
  }

  console.log(`Tenant: ${tenant.name} (${tenant.slug})`);
  console.log(admin.created ? `Administrador criado: ${adminEmail}${process.env.SEED_ADMIN_PASSWORD ? "" : ` — senha gerada: ${adminPassword}`}` : `Administrador já existia: ${adminEmail}`);
  if (demoUsers.length) console.log(`Usuários de demonstração: ${demo.map((d) => d.email).join(", ")} (senha: ${demoPassword})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
