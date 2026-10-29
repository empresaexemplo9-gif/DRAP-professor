import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import katex from "katex";
import type { Block } from "@/content-blocks/schema";
import { checkCalculation } from "./expr";
import {
  checkTree,
  CpaFormatError,
  examSchema,
  parseCpaCards,
  parseCpaLesson,
  parseCpaQuestions,
  similarity,
  structureSchema,
  treeSchema,
  type CpaCardSpec,
  type CpaExamSpec,
  type CpaLessonSpec,
  type CpaQuestionSpec,
  type CpaTreeSpec,
} from "./content";

/** Leitura e validação de todo o conteúdo de content/cpa (usado pelo validador, pelo seed e pelos testes). */

export type SyllabusItem = { codigo: string; texto: string; nivel: number; macro: string; pai: string | null; folha: boolean };
export type Program = {
  fonte: string;
  url: string;
  versao: string;
  vigencia: string;
  conferido_em: string;
  macrotemas: { codigo: string; titulo: string; peso: number }[];
  itens: SyllabusItem[];
};

export type CpaCatalog = {
  program: Program;
  chapters: { number: number; macro: number; title: string; officialRef: string; summary?: string }[];
  lessons: CpaLessonSpec[];
  questions: CpaQuestionSpec[];
  cards: CpaCardSpec[];
  trees: CpaTreeSpec[];
  exams: CpaExamSpec[];
  references: { key: string; title: string; publisher: string; url?: string; scope?: string; checkedAt?: string; checkStatus: string }[];
};

export type CpaReport = {
  errors: string[];
  warnings: string[];
  coverage: { code: string; text: string; macro: number; chapter: number | null; lessons: string[]; questions: string[] }[];
};

const md = (dir: string) => (existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".md")).sort() : []);

/** Capítulo de um item oficial pelos prefixos declarados em estrutura.json ("3.4.1–3.4.4", "4.1–4.3", "2.1.1"). */
export function chapterOf(code: string, chapters: CpaCatalog["chapters"]): number | null {
  const n = (s: string) => s.split(".").map(Number);
  const cmp = (a: number[], b: number[]) => {
    for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] !== b[i]) return a[i]! - b[i]!;
    return 0;
  };
  for (const ch of chapters) {
    const [from, to = from] = ch.officialRef.split(/[–-]/).map((s) => s.trim());
    const c = n(code);
    if (cmp(c, n(from!)) >= 0 && cmp(c, n(to!)) <= 0) return ch.number;
  }
  return null;
}

export function loadCpaCatalog(root = join(process.cwd(), "content", "cpa")): { catalog: CpaCatalog; errors: string[] } {
  const errors: string[] = [];
  const program = JSON.parse(readFileSync(join(root, "programa-oficial.json"), "utf8")) as Program;
  const chapters = structureSchema.parse(JSON.parse(readFileSync(join(root, "estrutura.json"), "utf8"))).chapters;
  const attempt = <T,>(fn: () => T): T | null => {
    try {
      return fn();
    } catch (e) {
      errors.push(e instanceof CpaFormatError ? e.message : `${(e as Error).message}`);
      return null;
    }
  };
  const lessons = md(join(root, "aulas"))
    .map((f) => attempt(() => parseCpaLesson(readFileSync(join(root, "aulas", f), "utf8"), f)))
    .filter((x): x is CpaLessonSpec => Boolean(x));
  const bank = md(join(root, "questoes")).flatMap((f) => attempt(() => parseCpaQuestions(readFileSync(join(root, "questoes", f), "utf8"), f)) ?? []);
  const cards = md(join(root, "cartoes")).flatMap((f) => attempt(() => parseCpaCards(readFileSync(join(root, "cartoes", f), "utf8"), f)) ?? []);
  const treeDir = join(root, "arvores");
  const trees = (existsSync(treeDir) ? readdirSync(treeDir).filter((f) => f.endsWith(".json")).sort() : [])
    .map((f) => attempt(() => treeSchema.parse(JSON.parse(readFileSync(join(treeDir, f), "utf8")))))
    .filter((x): x is CpaTreeSpec => Boolean(x));
  const examsFile = join(root, "simulados.json");
  const exams = existsSync(examsFile) ? (attempt(() => examSchema.array().parse(JSON.parse(readFileSync(examsFile, "utf8")))) ?? []) : [];
  const refsFile = join(root, "referencias.json");
  const references = existsSync(refsFile) ? JSON.parse(readFileSync(refsFile, "utf8")) : [];
  return {
    catalog: { program, chapters, lessons, questions: [...lessons.flatMap((l) => l.questions), ...bank], cards, trees, exams, references },
    errors,
  };
}

function formulas(blocks: Block[]): string[] {
  return blocks.flatMap((b) => (b.type === "formula" ? [b.latex] : b.type === "callout" ? formulas(b.blocks) : []));
}

export function validateCpaCatalog(c: CpaCatalog): CpaReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const items = new Map(c.program.itens.map((i) => [i.codigo, i]));
  const lessonCodes = new Set(c.lessons.map((l) => l.code));
  const chapterNumbers = new Set(c.chapters.map((ch) => ch.number));

  // Códigos únicos
  const dup = <T,>(list: T[], key: (x: T) => string, what: string) => {
    const seen = new Set<string>();
    for (const x of list) {
      const k = key(x);
      if (seen.has(k)) errors.push(`${what} duplicado: ${k}`);
      seen.add(k);
    }
  };
  dup(c.lessons, (l) => l.code, "código de aula");
  dup(c.questions, (q) => q.code, "código de questão");
  dup(c.cards, (k) => k.code, "código de cartão");
  dup(c.trees, (t) => t.code, "código de árvore");
  dup(c.exams, (e) => e.code, "código de simulado");

  for (const l of c.lessons) {
    if (!chapterNumbers.has(l.chapter)) errors.push(`${l.code}: capítulo ${l.chapter} não existe`);
    for (const it of l.items) if (!items.has(it)) errors.push(`${l.code}: microtema ${it} não existe no programa oficial`);
    for (const p of l.prerequisites) if (!lessonCodes.has(p)) errors.push(`${l.code}: pré-requisito ${p} não existe`);
    if (l.next && !lessonCodes.has(l.next)) warnings.push(`${l.code}: próxima aula ${l.next} ainda não existe`);
    if (l.objectives.length < 2) errors.push(`${l.code}: defina ao menos 2 objetivos mensuráveis`);
    if (!l.checkedAt) errors.push(`${l.code}: sem data de conferência (conferido_em)`);
    for (const f of l.document.sections.flatMap((s) => formulas(s.blocks))) {
      try {
        katex.renderToString(f, { throwOnError: true });
      } catch (e) {
        errors.push(`${l.code}: fórmula inválida "${f.slice(0, 40)}": ${(e as Error).message.slice(0, 80)}`);
      }
    }
    const words = JSON.stringify(l.document).split(/\s+/).length;
    if (words < 2500) warnings.push(`${l.code}: aula curta (${words} palavras no documento)`);
    for (const r of l.references) if (r.pending) warnings.push(`${l.code}: referência com conferência pendente — ${r.text.slice(0, 60)}`);
  }

  for (const q of c.questions) {
    for (const it of q.items) if (!items.has(it)) errors.push(`${q.code}: microtema ${it} não existe no programa oficial`);
    if (q.lessonCode && !lessonCodes.has(q.lessonCode)) errors.push(`${q.code}: aula ${q.lessonCode} não existe`);
    if (q.check) {
      const err = checkCalculation(q.check);
      if (err) errors.push(`${q.code}: ${err}`);
      const correctText = q.options.find((o) => o.key === q.correct)?.text ?? "";
      if (q.check.shown && !correctText.includes(q.check.shown)) errors.push(`${q.code}: o valor verificado "${q.check.shown}" não está na alternativa correta (${q.correct})`);
    }
    // Ambiguidade potencial: alternativas quase iguais, ou a correta muito mais longa que as demais (pista).
    for (let i = 0; i < 4; i++)
      for (let j = i + 1; j < 4; j++)
        if (similarity(q.options[i]!.text, q.options[j]!.text) > 0.75) warnings.push(`${q.code}: alternativas ${q.options[i]!.key} e ${q.options[j]!.key} muito parecidas`);
    const lens = q.options.map((o) => o.text.length);
    const correctLen = lens["ABCD".indexOf(q.correct)]!;
    const others = lens.filter((_, i) => "ABCD"[i] !== q.correct);
    if (correctLen > 1.8 * Math.max(...others) && correctLen > 60) warnings.push(`${q.code}: alternativa correta muito mais longa que as demais (pista)`);
    if (/\b(não|exceto|incorreta)\b/i.test(q.stem) && !/\b(NÃO|EXCETO|INCORRETA)\b/.test(q.stem)) warnings.push(`${q.code}: enunciado negativo deve destacar NÃO/EXCETO/INCORRETA em maiúsculas`);
  }
  // Questões repetidas (enunciados muito semelhantes)
  for (let i = 0; i < c.questions.length; i++)
    for (let j = i + 1; j < c.questions.length; j++)
      if (similarity(c.questions[i]!.stem, c.questions[j]!.stem) > 0.6) warnings.push(`questões possivelmente repetidas: ${c.questions[i]!.code} e ${c.questions[j]!.code}`);

  for (const k of c.cards) {
    if (!items.has(k.item)) errors.push(`${k.code}: microtema ${k.item} não existe`);
    if (k.lesson && !lessonCodes.has(k.lesson)) errors.push(`${k.code}: aula ${k.lesson} não existe`);
  }
  for (const t of c.trees) {
    errors.push(...checkTree(t));
    for (const it of t.items) if (!items.has(it)) errors.push(`${t.code}: microtema ${it} não existe`);
  }

  const byCode = new Map(c.questions.map((q) => [q.code, q]));
  for (const e of c.exams) {
    for (const code of e.fixedCodes) {
      const q = byCode.get(code);
      if (!q) errors.push(`${e.code}: questão ${code} não existe`);
      else if (q.use === "fixacao") errors.push(`${e.code}: ${code} é de fixação e não pode compor simulado`);
    }
    if (e.fixedCodes.length && e.fixedCodes.length !== e.questionCount) errors.push(`${e.code}: lista fixa tem ${e.fixedCodes.length} questões, mas o simulado declara ${e.questionCount}`);
    if (e.fixedCodes.length && new Set(e.fixedCodes).size !== e.fixedCodes.length) errors.push(`${e.code}: questões repetidas na lista fixa`);
    const dist = Object.values(e.distribution);
    if (dist.length && Math.abs(dist.reduce((a, b) => a + b, 0) - 100) > 0.01) errors.push(`${e.code}: distribuição não soma 100%`);
    if (!e.fixedCodes.length) {
      const pool = c.questions.filter((q) => q.use === e.pool.toLowerCase() && (!e.macros.length || e.macros.includes(Number(q.items[0]!.split(".")[0]))));
      if (pool.length < e.questionCount) warnings.push(`${e.code}: banco disponível (${pool.length}) menor que o simulado (${e.questionCount})`);
    }
  }
  // O simulado final não pode reaproveitar questões dos demais simulados fixos.
  const finals = c.exams.filter((e) => e.kind === "FINAL");
  const others = new Set(c.exams.filter((e) => e.kind !== "FINAL").flatMap((e) => e.fixedCodes));
  for (const f of finals) for (const code of f.fixedCodes) if (others.has(code)) errors.push(`${f.code}: ${code} já aparece em outro simulado`);

  const coverage = c.program.itens
    .filter((i) => i.folha)
    .map((i) => {
      const covers = (list: string[]) => list.some((x) => x === i.codigo || (i.pai !== null && x === i.pai && (items.get(x)?.nivel ?? 0) >= 3));
      return {
        code: i.codigo,
        text: i.texto,
        macro: Number(i.macro),
        chapter: chapterOf(i.codigo, c.chapters),
        lessons: c.lessons.filter((l) => covers(l.items)).map((l) => l.code),
        questions: c.questions.filter((q) => covers(q.items)).map((q) => q.code),
      };
    });
  for (const row of coverage) if (row.chapter === null) errors.push(`microtema ${row.code} sem capítulo em estrutura.json`);
  return { errors, warnings, coverage };
}
