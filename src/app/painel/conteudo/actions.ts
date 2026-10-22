"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Prisma, type LevelKind } from "@prisma/client";
import { prisma, withTenant, type Tx } from "@/lib/db";
import { assertPermission, clientIp } from "@/lib/session";
import { audit } from "@/lib/audit";
import { slugify, SLUG_RE } from "@/lib/slug";
import { levelConfigSchemas } from "@/lib/levels";
import { documentSchema, emptyDocument } from "@/content-blocks/schema";

export type ActionState = { error?: string; fieldErrors?: Record<string, string>; ok?: boolean; message?: string };

function fieldErrors(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of err.issues) out[i.path.join(".")] ??= i.message;
  return out;
}

const slugField = z
  .string()
  .trim()
  .max(80)
  .optional()
  .transform((v) => v || undefined)
  .refine((v) => v === undefined || SLUG_RE.test(v), "Use apenas letras minúsculas, números e hífens");

function isUnique(e: unknown) {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}

// ─────────────── Segmentos ───────────────

const segmentSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2, "Informe o nome").max(120),
  slug: slugField,
  description: z.string().trim().max(500).optional(),
  order: z.coerce.number().int().min(0).max(9999).default(0),
});

export async function saveSegmentAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const viewer = await assertPermission("content:manage");
  const parsed = segmentSchema.safeParse({ ...Object.fromEntries(fd), id: fd.get("id") || undefined });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const { id, name, description, order } = parsed.data;
  const slug = parsed.data.slug ?? slugify(name);
  const tenantId = viewer.tenant.id;
  try {
    await withTenant(tenantId, async (tx) => {
      const seg = id
        ? await tx.segment.update({ where: { id, tenantId }, data: { name, slug, description, order } })
        : await tx.segment.create({ data: { tenantId, name, slug, description, order } });
      await audit(tx, { tenantId, actorId: viewer.user.id, action: id ? "segmento.atualizado" : "segmento.criado", entity: "Segment", entityId: seg.id, data: { name, slug }, ip: await clientIp() });
    });
  } catch (e) {
    if (isUnique(e)) return { fieldErrors: { slug: "Já existe um segmento com este endereço" } };
    throw e;
  }
  revalidatePath("/painel/conteudo");
  return { ok: true, message: id ? "Segmento atualizado." : "Segmento criado." };
}

export async function deleteSegmentAction(fd: FormData) {
  const viewer = await assertPermission("content:manage");
  const id = z.string().uuid().parse(fd.get("id"));
  const tenantId = viewer.tenant.id;
  await withTenant(tenantId, async (tx) => {
    const count = await tx.module.count({ where: { tenantId, segmentId: id } });
    if (count > 0) return; // segmento com módulos não é excluído
    await tx.segment.delete({ where: { id, tenantId } });
    await audit(tx, { tenantId, actorId: viewer.user.id, action: "segmento.excluido", entity: "Segment", entityId: id });
  });
  revalidatePath("/painel/conteudo");
}

// ─────────────── Módulos ───────────────

const moduleSchema = z.object({
  id: z.string().uuid().optional(),
  levelId: z.string().uuid("Escolha o nível"),
  segmentId: z.string().uuid("Escolha o segmento"),
  title: z.string().trim().min(3, "Informe o título").max(200),
  slug: slugField,
  summary: z.string().trim().max(1000).optional(),
  workloadHours: z.coerce.number().min(0).max(5000).default(0),
  price: z.preprocess((value) => {
    if (value == null || String(value).trim() === "") return null;
    const normalized = String(value).trim().replace(",", ".");
    const amount = Number(normalized);
    return Number.isFinite(amount) ? Math.round(amount * 100) : Number.NaN;
  }, z.number().int().min(100, "O valor mínimo é R$ 1,00").max(10_000_000, "O valor máximo é R$ 100.000,00").nullable()).optional(),
  certificateType: z.enum(["LIVRE", "EXTENSAO", "CAPACITACAO"]).default("LIVRE"),
  audience: z.enum(["INDIVIDUAL", "EMPRESA"]).default("INDIVIDUAL"),
  order: z.coerce.number().int().min(0).max(9999).default(0),
});

function levelConfigFrom(kind: LevelKind, fd: FormData) {
  const raw: Record<string, FormDataEntryValue> = {};
  for (const [k, v] of fd.entries()) if (k.startsWith("cfg.")) raw[k.slice(4)] = v;
  return levelConfigSchemas[kind].safeParse(raw);
}

async function oldPath(tx: Tx, moduleId: string) {
  const m = await tx.module.findUnique({ where: { id: moduleId }, include: { level: true, segment: true } });
  return m ? `/${m.level.slug}/${m.segment.slug}/${m.slug}` : null;
}

export async function saveModuleAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const viewer = await assertPermission("content:manage");
  const parsed = moduleSchema.safeParse({ ...Object.fromEntries(fd), id: fd.get("id") || undefined });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const d = parsed.data;
  const tenantId = viewer.tenant.id;
  const slug = d.slug ?? slugify(d.title);
  let savedId = d.id;
  try {
    const err = await withTenant(tenantId, async (tx) => {
      const level = await tx.level.findFirst({ where: { id: d.levelId, tenantId } });
      if (!level) return { fieldErrors: { levelId: "Nível inválido" } } satisfies ActionState;
      const cfg = levelConfigFrom(level.kind, fd);
      if (!cfg.success) return { fieldErrors: Object.fromEntries(Object.entries(fieldErrors(cfg.error)).map(([k, v]) => [`cfg.${k}`, v])) } satisfies ActionState;
      const data = {
        levelId: d.levelId,
        segmentId: d.segmentId,
        title: d.title,
        slug,
        summary: d.summary,
        workloadMinutes: Math.round(d.workloadHours * 60),
        // Treinamento para empresas não tem checkout individual.
        priceCents: d.audience === "EMPRESA" ? null : (d.price ?? null),
        audience: d.audience,
        certificateType: d.certificateType,
        order: d.order,
        levelConfig: cfg.data as Prisma.InputJsonValue,
      };
      if (d.id) {
        const before = await oldPath(tx, d.id);
        await tx.module.update({ where: { id: d.id, tenantId }, data });
        const after = await oldPath(tx, d.id);
        if (before && after && before !== after) {
          await tx.slugRedirect.upsert({ where: { tenantId_fromPath: { tenantId, fromPath: before } }, create: { tenantId, fromPath: before, toPath: after }, update: { toPath: after } });
        }
      } else {
        const created = await tx.module.create({ data: { ...data, tenantId } });
        savedId = created.id;
      }
      await audit(tx, { tenantId, actorId: viewer.user.id, action: d.id ? "modulo.atualizado" : "modulo.criado", entity: "Module", entityId: savedId, data: { title: d.title, slug }, ip: await clientIp() });
      return null;
    });
    if (err) return err;
  } catch (e) {
    if (isUnique(e)) return { fieldErrors: { slug: "Já existe um módulo com este endereço neste nível e segmento" } };
    throw e;
  }
  revalidatePath("/painel/conteudo");
  if (!d.id) redirect(`/painel/conteudo/modulos/${savedId}`);
  return { ok: true, message: "Módulo salvo." };
}

const statusSchema = z.enum(["RASCUNHO", "REVISAO", "PUBLICADO", "ARQUIVADO"]);

export async function setModuleStatusAction(fd: FormData) {
  const viewer = await assertPermission("content:publish");
  const id = z.string().uuid().parse(fd.get("id"));
  const status = statusSchema.parse(fd.get("status"));
  const tenantId = viewer.tenant.id;
  await withTenant(tenantId, async (tx) => {
    await tx.module.update({ where: { id, tenantId }, data: { status } });
    await audit(tx, { tenantId, actorId: viewer.user.id, action: "modulo.status", entity: "Module", entityId: id, data: { status } });
  });
  revalidatePath(`/painel/conteudo/modulos/${id}`);
  revalidatePath("/painel/conteudo");
}

// ─────────────── Assuntos ───────────────

const topicSchema = z.object({
  moduleId: z.string().uuid(),
  title: z.string().trim().min(2, "Informe o título").max(200),
  slug: slugField,
  durationMinutes: z.coerce.number().int().min(0).max(10000).default(0),
});

export async function createTopicAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const viewer = await assertPermission("content:manage");
  const parsed = topicSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const d = parsed.data;
  const tenantId = viewer.tenant.id;
  let id = "";
  try {
    await withTenant(tenantId, async (tx) => {
      const mod = await tx.module.findFirst({ where: { id: d.moduleId, tenantId } });
      if (!mod) throw new Error("Módulo não encontrado");
      const last = await tx.topic.aggregate({ where: { moduleId: mod.id }, _max: { order: true } });
      const topic = await tx.topic.create({
        data: {
          tenantId,
          moduleId: mod.id,
          title: d.title,
          slug: d.slug ?? slugify(d.title),
          durationMinutes: d.durationMinutes,
          order: (last._max.order ?? 0) + 1,
          draft: emptyDocument(d.title) as unknown as Prisma.InputJsonValue,
        },
      });
      id = topic.id;
      await audit(tx, { tenantId, actorId: viewer.user.id, action: "assunto.criado", entity: "Topic", entityId: topic.id, data: { title: d.title } });
    });
  } catch (e) {
    if (isUnique(e)) return { fieldErrors: { slug: "Já existe um assunto com este endereço no módulo" } };
    throw e;
  }
  redirect(`/painel/conteudo/assuntos/${id}`);
}

export async function moveTopicAction(fd: FormData) {
  const viewer = await assertPermission("content:manage");
  const id = z.string().uuid().parse(fd.get("id"));
  const dir = fd.get("dir") === "up" ? -1 : 1;
  const tenantId = viewer.tenant.id;
  let moduleId = "";
  await withTenant(tenantId, async (tx) => {
    const topic = await tx.topic.findFirst({ where: { id, tenantId } });
    if (!topic) return;
    moduleId = topic.moduleId;
    const siblings = await tx.topic.findMany({ where: { moduleId: topic.moduleId }, orderBy: [{ order: "asc" }, { createdAt: "asc" }] });
    const i = siblings.findIndex((s) => s.id === id);
    const j = i + dir;
    if (j < 0 || j >= siblings.length) return;
    [siblings[i], siblings[j]] = [siblings[j]!, siblings[i]!];
    for (const [k, s] of siblings.entries()) await tx.topic.update({ where: { id: s.id }, data: { order: k + 1 } });
  });
  revalidatePath(`/painel/conteudo/modulos/${moduleId}`);
}

const topicMetaSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(2).max(200),
  slug: z.string().trim().regex(SLUG_RE, "Use apenas letras minúsculas, números e hífens").max(80),
  durationMinutes: z.coerce.number().int().min(0).max(10000),
});

/** Salva metadados e o rascunho do documento (editor de blocos). */
export async function saveTopicDraftAction(input: { meta: unknown; document: unknown }): Promise<ActionState> {
  const viewer = await assertPermission("content:manage");
  const meta = topicMetaSchema.safeParse(input.meta);
  if (!meta.success) return { fieldErrors: fieldErrors(meta.error) };
  const doc = documentSchema.safeParse(input.document);
  if (!doc.success) return { error: "O conteúdo tem blocos inválidos: " + doc.error.issues[0]?.message };
  const tenantId = viewer.tenant.id;
  try {
    await withTenant(tenantId, async (tx) => {
      await tx.topic.update({
        where: { id: meta.data.id, tenantId },
        data: {
          title: meta.data.title,
          slug: meta.data.slug,
          durationMinutes: meta.data.durationMinutes,
          draft: { ...doc.data, title: meta.data.title } as unknown as Prisma.InputJsonValue,
        },
      });
    });
  } catch (e) {
    if (isUnique(e)) return { fieldErrors: { slug: "Já existe um assunto com este endereço no módulo" } };
    throw e;
  }
  return { ok: true, message: "Rascunho salvo." };
}

/** Publica o rascunho como nova versão imutável. */
export async function publishTopicAction(input: { id: string; changeNote?: string }): Promise<ActionState> {
  const viewer = await assertPermission("content:publish");
  const id = z.string().uuid().parse(input.id);
  const tenantId = viewer.tenant.id;
  const result = await withTenant(tenantId, async (tx) => {
    const topic = await tx.topic.findFirst({ where: { id, tenantId } });
    if (!topic) return { error: "Assunto não encontrado." };
    const doc = documentSchema.safeParse(topic.draft);
    if (!doc.success) return { error: "Salve o rascunho antes de publicar." };
    if (!doc.data.sections.some((s) => s.blocks.length)) return { error: "Adicione conteúdo antes de publicar." };
    const last = await tx.topicVersion.aggregate({ where: { topicId: id }, _max: { number: true } });
    const number = (last._max.number ?? 0) + 1;
    const version = await tx.topicVersion.create({
      data: { tenantId, topicId: id, number, document: doc.data as unknown as Prisma.InputJsonValue, authorId: viewer.user.id, changeNote: input.changeNote?.slice(0, 500) },
    });
    await tx.topic.update({ where: { id }, data: { publishedVersionId: version.id, status: "PUBLICADO" } });
    await audit(tx, { tenantId, actorId: viewer.user.id, action: "assunto.publicado", entity: "Topic", entityId: id, data: { version: number }, ip: await clientIp() });
    return { ok: true, message: `Versão ${number} publicada.` };
  });
  revalidatePath(`/painel/conteudo/assuntos/${id}`);
  return result;
}

export async function setTopicStatusAction(fd: FormData) {
  const viewer = await assertPermission("content:publish");
  const id = z.string().uuid().parse(fd.get("id"));
  const status = statusSchema.parse(fd.get("status"));
  const tenantId = viewer.tenant.id;
  await withTenant(tenantId, async (tx) => {
    const topic = await tx.topic.findFirst({ where: { id, tenantId } });
    if (!topic) return;
    if (status === "PUBLICADO" && !topic.publishedVersionId) return;
    await tx.topic.update({ where: { id }, data: { status } });
    await audit(tx, { tenantId, actorId: viewer.user.id, action: "assunto.status", entity: "Topic", entityId: id, data: { status } });
  });
  revalidatePath(`/painel/conteudo/assuntos/${id}`);
}

export async function restoreVersionAction(fd: FormData) {
  const viewer = await assertPermission("content:manage");
  const versionId = z.string().uuid().parse(fd.get("versionId"));
  const tenantId = viewer.tenant.id;
  let topicId = "";
  await withTenant(tenantId, async (tx) => {
    const v = await tx.topicVersion.findFirst({ where: { id: versionId, tenantId } });
    if (!v) return;
    topicId = v.topicId;
    await tx.topic.update({ where: { id: v.topicId }, data: { draft: v.document as Prisma.InputJsonValue } });
    await audit(tx, { tenantId, actorId: viewer.user.id, action: "assunto.versao_restaurada_no_rascunho", entity: "Topic", entityId: v.topicId, data: { version: v.number } });
  });
  // Novo parâmetro força o editor a recarregar o rascunho restaurado.
  if (topicId) redirect(`/painel/conteudo/assuntos/${topicId}?r=${Date.now()}`);
}

// ─────────────── Equipe e matrículas ───────────────

export async function enrollByEmailAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const viewer = await assertPermission("enrollment:manage");
  const moduleId = z.string().uuid().parse(fd.get("moduleId"));
  const email = z.string().trim().toLowerCase().email().safeParse(fd.get("email"));
  if (!email.success) return { fieldErrors: { email: "E-mail inválido" } };
  const user = await prisma.user.findUnique({ where: { email: email.data }, select: { id: true, name: true } });
  if (!user) return { fieldErrors: { email: "Nenhuma conta com este e-mail. Peça para a pessoa criar a conta ou envie um convite em Usuários." } };
  const tenantId = viewer.tenant.id;
  await withTenant(tenantId, async (tx) => {
    const mod = await tx.module.findFirst({ where: { id: moduleId, tenantId } });
    if (!mod) throw new Error("Módulo não encontrado");
    await tx.membership.upsert({ where: { tenantId_userId: { tenantId, userId: user.id } }, create: { tenantId, userId: user.id, roles: ["ALUNO"] }, update: {} });
    await tx.enrollment.upsert({
      where: { userId_moduleId: { userId: user.id, moduleId } },
      create: { tenantId, userId: user.id, moduleId, origin: "CORTESIA" },
      update: { status: "ATIVA" },
    });
    await audit(tx, { tenantId, actorId: viewer.user.id, action: "matricula.manual", entity: "Enrollment", entityId: moduleId, data: { userId: user.id } });
  });
  revalidatePath(`/painel/conteudo/modulos/${moduleId}`);
  return { ok: true, message: `${user.name} matriculado(a).` };
}

export async function cancelEnrollmentAction(fd: FormData) {
  const viewer = await assertPermission("enrollment:manage");
  const id = z.string().uuid().parse(fd.get("id"));
  const tenantId = viewer.tenant.id;
  let moduleId = "";
  await withTenant(tenantId, async (tx) => {
    const e = await tx.enrollment.update({ where: { id, tenantId }, data: { status: "CANCELADA" } });
    moduleId = e.moduleId;
    await audit(tx, { tenantId, actorId: viewer.user.id, action: "matricula.cancelada", entity: "Enrollment", entityId: id });
  });
  revalidatePath(`/painel/conteudo/modulos/${moduleId}`);
}

export async function addStaffAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const viewer = await assertPermission("content:manage");
  const moduleId = z.string().uuid().parse(fd.get("moduleId"));
  const role = z.enum(["AUTOR", "INSTRUTOR", "MENTOR"]).parse(fd.get("role"));
  const email = z.string().trim().toLowerCase().email().safeParse(fd.get("email"));
  if (!email.success) return { fieldErrors: { email: "E-mail inválido" } };
  const user = await prisma.user.findUnique({ where: { email: email.data }, select: { id: true, name: true } });
  if (!user) return { fieldErrors: { email: "Nenhuma conta com este e-mail." } };
  const tenantId = viewer.tenant.id;
  const res = await withTenant(tenantId, async (tx) => {
    const m = await tx.membership.findUnique({ where: { tenantId_userId: { tenantId, userId: user.id } } });
    if (!m || !m.roles.some((r) => r !== "ALUNO")) return { fieldErrors: { email: "A pessoa precisa ter perfil de equipe (Pedagógico ou Instrutor) em Usuários." } };
    await tx.moduleStaff.upsert({ where: { moduleId_userId_role: { moduleId, userId: user.id, role } }, create: { tenantId, moduleId, userId: user.id, role }, update: {} });
    await audit(tx, { tenantId, actorId: viewer.user.id, action: "modulo.equipe_adicionada", entity: "Module", entityId: moduleId, data: { userId: user.id, role } });
    return { ok: true, message: `${user.name} adicionado(a) à equipe.` };
  });
  revalidatePath(`/painel/conteudo/modulos/${moduleId}`);
  return res;
}

export async function removeStaffAction(fd: FormData) {
  const viewer = await assertPermission("content:manage");
  const id = z.string().uuid().parse(fd.get("id"));
  const tenantId = viewer.tenant.id;
  let moduleId = "";
  await withTenant(tenantId, async (tx) => {
    const s = await tx.moduleStaff.findFirst({ where: { id, tenantId } });
    if (!s) return;
    moduleId = s.moduleId;
    await tx.moduleStaff.delete({ where: { id } });
    await audit(tx, { tenantId, actorId: viewer.user.id, action: "modulo.equipe_removida", entity: "Module", entityId: s.moduleId, data: { userId: s.userId } });
  });
  revalidatePath(`/painel/conteudo/modulos/${moduleId}`);
}
