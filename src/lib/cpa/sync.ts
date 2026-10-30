import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { questionHash, type CpaQuestionSpec } from "./content";
import type { CpaCatalog } from "./catalog";

type Tx = Prisma.TransactionClient;

export type CpaSyncReport = { items: number; chapters: number; lessons: number; versions: number; questions: number; cards: number; trees: number; exams: number; skippedEdited: number };

const hash = (v: unknown) => createHash("sha256").update(JSON.stringify(v)).digest("hex").slice(0, 16);

const TYPE: Record<CpaQuestionSpec["type"], "CONCEITO" | "CALCULO" | "INTERPRETACAO" | "COMPARACAO" | "CASO" | "DECISAO" | "DIALOGO"> = {
  conceito: "CONCEITO",
  calculo: "CALCULO",
  interpretacao: "INTERPRETACAO",
  comparacao: "COMPARACAO",
  caso: "CASO",
  decisao: "DECISAO",
  dialogo: "DIALOGO",
};
const USE = { fixacao: "FIXACAO", simulado: "SIMULADO", diagnostico: "DIAGNOSTICO" } as const;

/**
 * Importa content/cpa para o banco, de forma idempotente.
 * Registros alterados pelo painel (origin = EDITADO) não são sobrescritos: o painel passa a ser a fonte.
 * Cada aula publicada com conteúdo novo ganha uma versão (histórico com autor e data).
 */
export async function syncCpaCatalog(tx: Tx, opts: { tenantId: string; authorId: string; catalog: CpaCatalog }): Promise<CpaSyncReport> {
  const { tenantId, authorId, catalog: c } = opts;
  const r: CpaSyncReport = { items: 0, chapters: 0, lessons: 0, versions: 0, questions: 0, cards: 0, trees: 0, exams: 0, skippedEdited: 0 };
  const programVersion = c.program.versao;
  const weights = new Map(c.program.macrotemas.map((m) => [m.codigo, m.peso]));

  // Matriz oficial
  const existingItems = new Map(
    (await tx.cpaSyllabusItem.findMany({ where: { tenantId, programVersion }, select: { id: true, code: true, text: true } })).map((i) => [i.code, i]),
  );
  for (const it of c.program.itens) {
    const data = {
      text: it.texto,
      level: it.nivel,
      macro: Number(it.macro),
      parentCode: it.pai,
      leaf: it.folha,
      weight: it.nivel === 2 ? null : null,
    };
    const prev = existingItems.get(it.codigo);
    if (!prev) {
      await tx.cpaSyllabusItem.create({ data: { tenantId, programVersion, code: it.codigo, ...data, checkedAt: new Date(c.program.conferido_em) } });
      r.items++;
    } else if (prev.text !== it.texto) {
      await tx.cpaSyllabusItem.update({ where: { id: prev.id }, data });
      r.items++;
    }
  }
  const itemIds = new Map((await tx.cpaSyllabusItem.findMany({ where: { tenantId, programVersion }, select: { id: true, code: true } })).map((i) => [i.code, i.id]));
  void weights;

  // Capítulos
  const chapterIds = new Map<number, string>();
  for (const [i, ch] of c.chapters.entries()) {
    const sourceHash = hash(ch);
    const prev = await tx.cpaChapter.findUnique({ where: { tenantId_number: { tenantId, number: ch.number } } });
    if (prev?.origin === "EDITADO") {
      chapterIds.set(ch.number, prev.id);
      r.skippedEdited++;
      continue;
    }
    const data = { macro: ch.macro, title: ch.title, officialRef: ch.officialRef, summary: ch.summary ?? null, sourceHash };
    const row = prev
      ? prev.sourceHash === sourceHash
        ? prev
        : await tx.cpaChapter.update({ where: { id: prev.id }, data })
      : await tx.cpaChapter.create({ data: { tenantId, number: ch.number, order: i + 1, ...data } });
    if (!prev || prev.sourceHash !== sourceHash) r.chapters++;
    chapterIds.set(ch.number, row.id);
  }

  // Aulas
  for (const l of c.lessons) {
    const chapterId = chapterIds.get(l.chapter);
    if (!chapterId) continue;
    const prev = await tx.cpaLesson.findUnique({ where: { tenantId_code: { tenantId, code: l.code } } });
    if (prev?.origin === "EDITADO") {
      r.skippedEdited++;
      continue;
    }
    const data = {
      chapterId,
      slug: l.code.toLowerCase(),
      title: l.title,
      order: l.order,
      minutes: l.minutes,
      prerequisites: l.prerequisites,
      objectives: l.objectives,
      document: l.document as unknown as Prisma.InputJsonValue,
      extras: { exercises: l.exercises, checklist: l.checklist, source: l.source } as unknown as Prisma.InputJsonValue,
      references: l.references as unknown as Prisma.InputJsonValue,
      checkedAt: l.checkedAt ? new Date(l.checkedAt) : null,
      nextLessonCode: l.next ?? null,
      status: "PUBLICADO" as const,
      sourceHash: l.hash,
    };
    if (prev && prev.sourceHash === l.hash) continue;
    const version = prev ? prev.version + 1 : 1;
    const row = prev
      ? await tx.cpaLesson.update({ where: { id: prev.id }, data: { ...data, version, publishedAt: new Date() } })
      : await tx.cpaLesson.create({ data: { tenantId, code: l.code, ...data, version, publishedAt: new Date() } });
    await tx.cpaLessonVersion.create({
      data: { tenantId, lessonId: row.id, version, title: l.title, document: data.document, authorId, note: prev ? "Atualização importada do repositório" : "Publicação inicial" },
    });
    await tx.cpaLessonItem.deleteMany({ where: { lessonId: row.id } });
    const links = l.items.map((code) => itemIds.get(code)).filter((x): x is string => Boolean(x));
    if (links.length) await tx.cpaLessonItem.createMany({ data: links.map((itemId) => ({ tenantId, lessonId: row.id, itemId })), skipDuplicates: true });
    r.lessons++;
    r.versions++;
  }

  // Questões (aulas + banco)
  const existingQ = new Map((await tx.cpaQuestion.findMany({ where: { tenantId }, select: { id: true, code: true, sourceHash: true, origin: true, version: true } })).map((q) => [q.code, q]));
  for (const q of c.questions) {
    const h = questionHash(q);
    const prev = existingQ.get(q.code);
    if (prev?.origin === "EDITADO") {
      r.skippedEdited++;
      continue;
    }
    if (prev && prev.sourceHash === h) continue;
    const data = {
      type: TYPE[q.type],
      use: USE[q.use],
      macro: Number(q.items[0]!.split(".")[0]),
      stem: q.stem,
      options: q.options as unknown as Prisma.InputJsonValue,
      correct: q.correct,
      explanation: q.explanation,
      difficulty: q.difficulty,
      competence: q.competence,
      source: q.source,
      lessonCode: q.lessonCode ?? null,
      check: (q.check ?? undefined) as Prisma.InputJsonValue | undefined,
      reviewedAt: new Date(),
      status: "PUBLICADO" as const,
      sourceHash: h,
    };
    const row = prev
      ? await tx.cpaQuestion.update({ where: { id: prev.id }, data: { ...data, version: prev.version + 1 } })
      : await tx.cpaQuestion.create({ data: { tenantId, code: q.code, ...data } });
    await tx.cpaQuestionItem.deleteMany({ where: { questionId: row.id } });
    const links = q.items.map((code) => itemIds.get(code)).filter((x): x is string => Boolean(x));
    if (links.length) await tx.cpaQuestionItem.createMany({ data: links.map((itemId) => ({ tenantId, questionId: row.id, itemId })), skipDuplicates: true });
    r.questions++;
  }
  // Questões removidas do repositório (e não editadas no painel) são arquivadas, nunca apagadas.
  const codes = new Set(c.questions.map((q) => q.code));
  const retired = [...existingQ.values()].filter((q) => !codes.has(q.code) && q.origin === "IMPORTADO").map((q) => q.id);
  if (retired.length) await tx.cpaQuestion.updateMany({ where: { id: { in: retired } }, data: { status: "ARQUIVADO" } });

  for (const k of c.cards) {
    const sourceHash = hash(k);
    const prev = await tx.cpaCard.findUnique({ where: { tenantId_code: { tenantId, code: k.code } } });
    if (prev?.origin === "EDITADO" || prev?.sourceHash === sourceHash) continue;
    const data = { front: k.front, back: k.back, explanation: k.explanation, itemCode: k.item, lessonCode: k.lesson ?? null, sourceHash };
    if (prev) await tx.cpaCard.update({ where: { id: prev.id }, data });
    else await tx.cpaCard.create({ data: { tenantId, code: k.code, ...data } });
    r.cards++;
  }

  for (const t of c.trees) {
    const sourceHash = hash(t);
    const prev = await tx.cpaTree.findUnique({ where: { tenantId_code: { tenantId, code: t.code } } });
    if (prev?.origin === "EDITADO" || prev?.sourceHash === sourceHash) continue;
    const data = {
      title: t.title,
      scenario: t.scenario,
      graph: { start: t.start, nodes: t.nodes } as unknown as Prisma.InputJsonValue,
      itemCodes: t.items,
      sourceHash,
    };
    if (prev) await tx.cpaTree.update({ where: { id: prev.id }, data });
    else await tx.cpaTree.create({ data: { tenantId, code: t.code, ...data } });
    r.trees++;
  }

  for (const [i, e] of c.exams.entries()) {
    const sourceHash = hash(e);
    const prev = await tx.cpaExam.findUnique({ where: { tenantId_code: { tenantId, code: e.code } } });
    if (prev?.origin === "EDITADO" || prev?.sourceHash === sourceHash) continue;
    const data = {
      kind: e.kind,
      title: e.title,
      description: e.description ?? null,
      questionCount: e.questionCount,
      durationMinutes: e.durationMinutes,
      distribution: e.distribution as Prisma.InputJsonValue,
      macros: e.macros,
      fixedCodes: e.fixedCodes,
      pool: e.pool,
      allowStudyMode: e.allowStudyMode,
      allowBackNav: e.allowBackNav,
      targetPercent: e.targetPercent,
      order: i + 1,
      sourceHash,
    };
    if (prev) await tx.cpaExam.update({ where: { id: prev.id }, data });
    else await tx.cpaExam.create({ data: { tenantId, code: e.code, ...data } });
    r.exams++;
  }

  for (const ref of c.references) {
    await tx.cpaReference.upsert({
      where: { tenantId_key: { tenantId, key: ref.key } },
      create: { tenantId, key: ref.key, title: ref.title, publisher: ref.publisher, url: ref.url, scope: ref.scope, checkedAt: ref.checkedAt ? new Date(ref.checkedAt) : null, checkStatus: ref.checkStatus },
      update: {},
    });
  }
  return r;
}
