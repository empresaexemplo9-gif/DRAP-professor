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
import { seedTeamCourse } from "./courses/team-schedules";
import { seedFinancialMentorships } from "./courses/mentorships";
import { seedMentorshipContent } from "./courses/mentorship-content";
import type { ContentDocument } from "../src/content-blocks/schema";

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
  { name: "Agronegócio", slug: "agronegocio", description: "Gestão rural, produção e comercialização." },
  { name: "Finanças", slug: "financas", description: "Finanças empresariais e pessoais." },
  { name: "Vendas", slug: "vendas", description: "Prospecção, negociação e relacionamento." },
  { name: "Arquitetura", slug: "arquitetura", description: "Projeto, gestão de obras e normas." },
];

const MODULES: ModuleSeed[] = [
  {
    level: "CURSO",
    segment: "agronegocio",
    title: "Gestão de Safra",
    slug: "gestao-de-safra",
    summary: "Do planejamento do plantio à comercialização: decisões com dados em cada etapa da safra.",
    hours: 12,
    certificateType: "LIVRE",
    config: { sequential: true, finalExam: true, minScore: 70 },
    topics: [
      {
        title: "Planejamento de plantio",
        slug: "planejamento-de-plantio",
        minutes: 45,
        doc: doc("Planejamento de plantio", [
          { title: "Por onde começar", paragraphs: ["O planejamento de plantio começa pela análise de solo e pela janela climática da região.", "Com esses dados, definimos cultivar, densidade e calendário de operações."], list: ["Análise química e física do solo", "Zoneamento agrícola (ZARC)", "Histórico de produtividade por talhão"], tip: "Registre os dados por talhão: é a base de todas as decisões seguintes." },
          { title: "Calendário de operações", paragraphs: ["Organize as operações por semana, considerando a disponibilidade de máquinas e de mão de obra."], table: [["Operação", "Período", "Responsável"], ["Dessecação", "Set", "Equipe A"], ["Plantio", "Out–Nov", "Equipe A e B"], ["Aplicações", "Nov–Jan", "Equipe B"]] },
        ]),
      },
      {
        title: "Custos de produção",
        slug: "custos-de-producao",
        minutes: 50,
        doc: doc("Custos de produção", [
          { title: "Estrutura de custos", paragraphs: ["Separe custos fixos e variáveis para calcular o ponto de equilíbrio por hectare."], table: [["Item", "Tipo", "R$/ha"], ["Sementes", "Variável", "620,00"], ["Fertilizantes", "Variável", "1.450,00"], ["Arrendamento", "Fixo", "1.200,00"]] },
          { title: "Ponto de equilíbrio", paragraphs: ["Ponto de equilíbrio (sc/ha) = custo total por hectare ÷ preço esperado da saca."], tip: "Refaça a conta a cada atualização de preço: ela orienta a estratégia de venda antecipada." },
        ]),
      },
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
    segment: "agronegocio",
    title: "Capacitação em Boas Práticas no Manejo de Defensivos",
    slug: "boas-praticas-defensivos",
    summary: "Programa com carga horária, frequência mínima e avaliação sobre uso seguro de defensivos.",
    hours: 16,
    certificateType: "CAPACITACAO",
    config: { minAttendancePercent: 75, minScore: 70 },
    topics: [
      { title: "Equipamentos de proteção", slug: "equipamentos-de-protecao", minutes: 60, doc: doc("Equipamentos de proteção", [{ title: "EPI adequado", paragraphs: ["O equipamento de proteção individual deve ser escolhido conforme a bula e a ficha de segurança do produto."], list: ["Luvas", "Respirador", "Viseira", "Vestimenta hidrorrepelente"] }]) },
      { title: "Tríplice lavagem", slug: "triplice-lavagem", minutes: 45, doc: doc("Tríplice lavagem", [{ title: "Procedimento", paragraphs: ["Após esvaziar a embalagem, enxágue três vezes e despeje a calda no tanque do pulverizador."], tip: "Inutilize a embalagem perfurando o fundo e devolva-a no ponto de recebimento indicado na nota fiscal." }]) },
    ],
  },
];

async function inTenant<T>(tenantId: string, fn: (tx: Prisma.TransactionClient) => Promise<T>) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
    return fn(tx);
  }, { timeout: 60_000 });
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
          { email: "gestor@exemplo.com.br", name: "Gabriel Gestor", roles: ["ALUNO"] },
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
    for (const [i, s] of SEGMENTS.entries()) {
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

    for (const [mi, m] of MODULES.entries()) {
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
    // Treinamento para empresas: entregue por contrato (Enterprise), sem matrícula avulsa.
    const teamCourse = await seedTeamCourse(tx, tenant.id, admin.user.id);
    // Mentorias financeiras por porte (substituem a antiga mentoria de exemplo).
    await seedFinancialMentorships(tx, tenant.id, admin.user.id);
    // Apostilas do cliente para as mentorias de pequenas e médias empresas.
    await seedMentorshipContent(tx, tenant.id, admin.user.id);
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

    // Enterprise de demonstração: empresa cliente com gestor e um contrato de vagas.
    const demoManager = demoUsers.find((user) => user.email === "gestor@exemplo.com.br");
    const training = await tx.module.findFirst({ where: { tenantId: tenant.id, slug: "boas-praticas-defensivos" }, select: { id: true } });
    if (demoManager && demoStudent && training && !(await tx.organization.findFirst({ where: { tenantId: tenant.id, cnpj: "11222333000181" } }))) {
      const org = await tx.organization.create({
        data: { tenantId: tenant.id, name: "Agro Exemplo", legalName: "Agro Exemplo Ltda.", cnpj: "11222333000181", contactName: demoManager.name, contactEmail: demoManager.email },
      });
      await tx.organizationMember.create({ data: { tenantId: tenant.id, organizationId: org.id, userId: demoManager.user.id, role: "GESTOR" } });
      await tx.organizationMember.create({ data: { tenantId: tenant.id, organizationId: org.id, userId: demoStudent.user.id, role: "COLABORADOR", team: "Campo" } });
      const pool = await tx.licensePool.create({
        data: { tenantId: tenant.id, organizationId: org.id, moduleId: training.id, seats: 20, goalPercent: 90, dueAt: new Date(Date.now() + 60 * 864e5) },
      });
      await tx.licenseAssignment.create({ data: { tenantId: tenant.id, poolId: pool.id, email: demoStudent.email, userId: demoStudent.user.id, team: "Campo", status: "ATIVO", activatedAt: new Date() } });
      await tx.licenseAssignment.create({ data: { tenantId: tenant.id, poolId: pool.id, email: "novo.colaborador@exemplo.com.br", team: "Campo" } });
      // Treinamento para empresas entregue pela vaga: a colaboradora acessa sem matrícula avulsa.
      const leaders = await tx.licensePool.create({
        data: { tenantId: tenant.id, organizationId: org.id, moduleId: teamCourse.id, seats: 10, goalPercent: 90, dueAt: new Date(Date.now() + 30 * 864e5) },
      });
      await tx.licenseAssignment.create({ data: { tenantId: tenant.id, poolId: leaders.id, email: demoStudent.email, userId: demoStudent.user.id, team: "Liderança", status: "ATIVO", activatedAt: new Date() } });
      await tx.enrollment.create({ data: { tenantId: tenant.id, userId: demoStudent.user.id, moduleId: teamCourse.id, origin: "LICENCA", status: "ATIVA" } });
    }
  });

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
