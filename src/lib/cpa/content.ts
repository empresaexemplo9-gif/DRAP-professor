import { createHash } from "node:crypto";
import { z } from "zod";
import type { ContentDocument, Section } from "@/content-blocks/schema";
import { markdownToBlocks } from "@/content-import/markdown";

/**
 * Leitor do conteúdo do preparatório CPA (content/cpa, formato em docs/cpa/FORMATO.md).
 * Funções puras: recebem o texto e devolvem estruturas validadas, ou erros com a localização.
 */

export class CpaFormatError extends Error {}

export const QUESTION_TYPES = ["conceito", "calculo", "interpretacao", "comparacao", "caso", "decisao", "dialogo"] as const;
export const QUESTION_USES = ["fixacao", "simulado", "diagnostico"] as const;

/** Seções obrigatórias de toda aula (padrão do item 6 do projeto). */
export const LESSON_SECTIONS = [
  "Introdução",
  "Fundamentos",
  "Termos técnicos",
  "Exemplos resolvidos",
  "Aplicações profissionais",
  "Quadro comparativo",
  "Erros comuns",
  "Resumo",
  "Glossário",
  "Exercícios de fixação",
  "Questões comentadas",
  "Checklist de domínio",
  "Referências",
] as const;

export type CpaOption = { key: string; text: string; justification: string };

export type CpaQuestionSpec = {
  code: string;
  type: (typeof QUESTION_TYPES)[number];
  use: (typeof QUESTION_USES)[number];
  difficulty: number;
  items: string[];
  competence: string;
  stem: string;
  options: CpaOption[];
  correct: string;
  explanation: string;
  source: string;
  check: { expr: string; expected: string; shown?: string } | null;
  lessonCode?: string;
};

export type CpaExercise = { id: string; prompt: string; answer: string };
export type CpaReferenceSpec = { text: string; url?: string; checkedAt?: string; pending: boolean };

export type CpaLessonSpec = {
  code: string;
  chapter: number;
  order: number;
  title: string;
  minutes: number;
  items: string[];
  prerequisites: string[];
  objectives: string[];
  next?: string;
  checkedAt?: string;
  document: ContentDocument;
  exercises: CpaExercise[];
  questions: CpaQuestionSpec[];
  checklist: string[];
  references: CpaReferenceSpec[];
  hash: string;
};

export type CpaCardSpec = { code: string; item: string; lesson?: string; front: string; back: string; explanation: string };

const hash = (s: string) => createHash("sha256").update(s).digest("hex").slice(0, 16);
const norm = (s: string) => s.replace(/\r\n/g, "\n");

function splitBy(lines: string[], re: RegExp) {
  const out: { head: string; body: string[] }[] = [];
  for (const line of lines) {
    if (re.test(line)) out.push({ head: line, body: [] });
    else if (out.length) out[out.length - 1]!.body.push(line);
  }
  return out;
}

function frontMatter(text: string, file: string) {
  const fm = /^---\n([\s\S]*?)\n---\n/.exec(text);
  if (!fm) throw new CpaFormatError(`${file}: falta a ficha entre "---"`);
  const meta: Record<string, string> = {};
  for (const line of fm[1]!.split("\n")) {
    const m = /^([a-z_]+):\s*(.*)$/.exec(line);
    if (m) meta[m[1]!] = m[2]!.trim();
  }
  return { meta, body: text.slice(fm[0].length) };
}

const list = (v: string | undefined, sep = /\s*[;|]\s*/) =>
  (v ?? "")
    .split(sep)
    .map((s) => s.trim())
    .filter((s) => s && !/^nenhum/i.test(s));

/** Cabeçalho "### CODIGO | chave: valor | chave: valor". */
function headerFields(head: string) {
  const [code, ...parts] = head.replace(/^###\s+/, "").split("|").map((p) => p.trim());
  const fields: Record<string, string> = {};
  for (const p of parts) {
    const m = /^([a-zçãéí_]+):\s*(.*)$/i.exec(p);
    if (m) fields[m[1]!.toLowerCase()] = m[2]!.trim();
  }
  return { code: code ?? "", fields };
}

const FORBIDDEN_OPTION = /todas as (anteriores|alternativas)|nenhuma das (anteriores|alternativas)/i;

export function parseCpaQuestions(md: string, where: string, defaults: { use?: CpaQuestionSpec["use"]; lessonCode?: string } = {}): CpaQuestionSpec[] {
  return splitBy(norm(md).split("\n"), /^###\s+/).map(({ head, body }) => {
    const { code, fields } = headerFields(head);
    const loc = `${where} ${code}`;
    if (!/^CPA-[A-Z0-9-]+$/.test(code)) throw new CpaFormatError(`${loc}: código inválido (use CPA-…)`);
    const type = (fields.tipo ?? "").toLowerCase() as CpaQuestionSpec["type"];
    if (!QUESTION_TYPES.includes(type)) throw new CpaFormatError(`${loc}: tipo "${fields.tipo}" inválido`);
    const use = ((fields.uso ?? defaults.use ?? "") as string).toLowerCase() as CpaQuestionSpec["use"];
    if (!QUESTION_USES.includes(use)) throw new CpaFormatError(`${loc}: uso "${fields.uso}" inválido`);
    const difficulty = Number(fields.dificuldade);
    if (![1, 2, 3].includes(difficulty)) throw new CpaFormatError(`${loc}: dificuldade deve ser 1, 2 ou 3`);
    const items = list(fields.microtemas);
    if (!items.length) throw new CpaFormatError(`${loc}: sem microtemas`);
    if (!fields.competencia) throw new CpaFormatError(`${loc}: sem competência`);

    const stem: string[] = [];
    const options: CpaOption[] = [];
    let correct = "";
    let explanation: string[] = [];
    let source = "";
    let check: CpaQuestionSpec["check"] = null;
    let mode: "stem" | "option" | "justification" | "explanation" = "stem";
    for (const raw of body) {
      const line = raw.trimEnd();
      const t = line.trim();
      let m: RegExpExecArray | null;
      if ((m = /^([A-E])\)\s+(.*)$/.exec(t)) && mode !== "explanation") {
        options.push({ key: m[1]!, text: m[2]!.trim(), justification: "" });
        mode = "option";
      } else if ((m = /^Justificativa:\s*(.*)$/i.exec(t)) && options.length) {
        options[options.length - 1]!.justification = m[1]!.trim();
        mode = "justification";
      } else if ((m = /^Gabarito:\s*([A-E])\s*$/i.exec(t))) {
        correct = m[1]!.toUpperCase();
      } else if ((m = /^Explica[çc][ãa]o:\s*(.*)$/i.exec(t))) {
        explanation = [m[1]!];
        mode = "explanation";
      } else if ((m = /^Fonte:\s*(.*)$/i.exec(t))) {
        source = m[1]!.trim();
        mode = "stem";
      } else if ((m = /^Verifica[çc][ãa]o:\s*(.+?)\s*≈\s*([-\d.,]+)\s*(?:\|\s*exibido:\s*(.+))?$/i.exec(t))) {
        check = { expr: m[1]!.trim(), expected: m[2]!.trim(), shown: m[3]?.trim() };
      } else if (mode === "stem") stem.push(line);
      else if (mode === "option" && t) options[options.length - 1]!.text += " " + t;
      else if (mode === "justification" && t) options[options.length - 1]!.justification += " " + t;
      else if (mode === "explanation") explanation.push(line);
    }
    if (options.length !== 4 || options.map((o) => o.key).join("") !== "ABCD") throw new CpaFormatError(`${loc}: são exigidas 4 alternativas (A–D)`);
    if (new Set(options.map((o) => o.text.toLowerCase().replace(/\s+/g, " "))).size !== 4) throw new CpaFormatError(`${loc}: alternativas duplicadas`);
    if (options.some((o) => FORBIDDEN_OPTION.test(o.text))) throw new CpaFormatError(`${loc}: "todas/nenhuma das anteriores" não é permitido`);
    if (options.some((o) => o.justification.split(/\s+/).length < 6)) throw new CpaFormatError(`${loc}: cada alternativa precisa de justificativa`);
    if (!correct) throw new CpaFormatError(`${loc}: sem gabarito`);
    const exp = explanation.join("\n").trim();
    if (exp.split(/\s+/).length < 20) throw new CpaFormatError(`${loc}: explicação ausente ou curta`);
    if (!source) throw new CpaFormatError(`${loc}: sem fonte`);
    if (type === "calculo" && !check) throw new CpaFormatError(`${loc}: questão de cálculo exige "Verificação:"`);
    return {
      code,
      type,
      use,
      difficulty,
      items,
      competence: fields.competencia,
      stem: stem.join("\n").trim(),
      options,
      correct,
      explanation: exp,
      source,
      check,
      lessonCode: defaults.lessonCode,
    };
  });
}

function parseExercises(md: string, where: string): CpaExercise[] {
  return splitBy(norm(md).split("\n"), /^###\s+/).map(({ head, body }) => {
    const id = head.replace(/^###\s+/, "").trim();
    const i = body.findIndex((l) => /^Resposta:/i.test(l.trim()));
    if (i < 0) throw new CpaFormatError(`${where} ${id}: exercício sem "Resposta:"`);
    return {
      id,
      prompt: body.slice(0, i).join("\n").trim(),
      answer: [body[i]!.trim().replace(/^Resposta:\s*/i, ""), ...body.slice(i + 1)].join("\n").trim(),
    };
  });
}

function parseReferences(md: string): CpaReferenceSpec[] {
  return norm(md)
    .split("\n")
    .filter((l) => /^\s*-\s+/.test(l))
    .map((l) => {
      const text = l.replace(/^\s*-\s+/, "").trim();
      const url = /(https?:\/\/[^\s)]+)/.exec(text)?.[1];
      const checkedAt = /conferid[oa] em (\d{4}-\d{2}-\d{2})/i.exec(text)?.[1];
      return { text, url, checkedAt, pending: /confer[êe]ncia pendente/i.test(text) || !checkedAt };
    });
}

export function parseCpaLesson(source: string, file: string): CpaLessonSpec {
  const text = norm(source);
  const { meta, body } = frontMatter(text, file);
  for (const k of ["codigo", "capitulo", "ordem", "titulo", "minutos", "microtemas", "objetivos"]) {
    if (!meta[k]) throw new CpaFormatError(`${file}: ficha sem "${k}"`);
  }
  const code = meta.codigo!;
  if (!/^CPA-\d{2}-\d{2}$/.test(code)) throw new CpaFormatError(`${file}: código "${code}" inválido (CPA-CC-AA)`);
  const parts = splitBy(body.split("\n"), /^##\s+/).map((s) => ({ title: s.head.replace(/^##\s+/, "").trim(), body: s.body.join("\n") }));
  const missing = LESSON_SECTIONS.filter((t) => !parts.some((p) => p.title.toLowerCase() === t.toLowerCase()));
  if (missing.length) throw new CpaFormatError(`${file}: faltam as seções ${missing.join(", ")}`);
  const get = (t: string) => parts.find((p) => p.title.toLowerCase() === t.toLowerCase())!.body;

  const prefix = code.toLowerCase();
  const sections: Section[] = parts
    .filter((p) => !["exercícios de fixação", "questões comentadas", "checklist de domínio"].includes(p.title.toLowerCase()))
    .map((p, i) => ({ id: `${prefix}-s${i + 1}`, kind: "section" as const, title: p.title, blocks: markdownToBlocks(p.body, `${prefix}-s${i + 1}`) }));
  const checklist = get("Checklist de domínio")
    .split("\n")
    .map((l) => /^\s*-\s+(?:\[[ x]\]\s+)?(.*)$/.exec(l)?.[1]?.trim())
    .filter((s): s is string => Boolean(s));
  if (checklist.length < 3) throw new CpaFormatError(`${file}: checklist de domínio com menos de 3 itens`);
  const exercises = parseExercises(get("Exercícios de fixação"), file);
  if (exercises.length < 3) throw new CpaFormatError(`${file}: mínimo de 3 exercícios de fixação`);
  const questions = parseCpaQuestions(get("Questões comentadas"), file, { use: "fixacao", lessonCode: code });
  if (questions.length < 2) throw new CpaFormatError(`${file}: mínimo de 2 questões comentadas`);
  const references = parseReferences(get("Referências"));
  if (!references.length) throw new CpaFormatError(`${file}: sem referências`);

  return {
    code,
    chapter: Number(meta.capitulo),
    order: Number(meta.ordem),
    title: meta.titulo!,
    minutes: Number(meta.minutos),
    items: list(meta.microtemas),
    prerequisites: list(meta.pre_requisitos),
    objectives: list(meta.objetivos, /\s*\|\s*/),
    next: meta.proxima || undefined,
    checkedAt: meta.conferido_em || undefined,
    document: { schemaVersion: 2, title: meta.titulo!, sections },
    exercises,
    questions,
    checklist,
    references,
    hash: hash(text),
  };
}

export function parseCpaCards(md: string, file: string): CpaCardSpec[] {
  return splitBy(norm(md).split("\n"), /^###\s+/).map(({ head, body }) => {
    const { code, fields } = headerFields(head);
    const pick = (k: string) => {
      const i = body.findIndex((l) => new RegExp(`^${k}:`, "i").test(l.trim()));
      if (i < 0) throw new CpaFormatError(`${file} ${code}: falta "${k}:"`);
      const rest: string[] = [body[i]!.trim().replace(new RegExp(`^${k}:\\s*`, "i"), "")];
      for (let j = i + 1; j < body.length && !/^(Frente|Verso|Explica[çc][ãa]o):/i.test(body[j]!.trim()); j++) rest.push(body[j]!);
      return rest.join("\n").trim();
    };
    if (!fields.microtema) throw new CpaFormatError(`${file} ${code}: sem microtema`);
    return { code, item: fields.microtema, lesson: fields.aula, front: pick("Frente"), back: pick("Verso"), explanation: pick("Explica[çc][ãa]o") };
  });
}

// ─── Árvores de decisão, simulados e estrutura (JSON) ───

const choiceSchema = z.object({
  label: z.string().min(3),
  next: z.string(),
  score: z.number().int().min(-2).max(2),
  feedback: z.string().min(10),
  competence: z.string().optional(),
});
export const treeSchema = z.object({
  code: z.string().regex(/^CPA-T-\d{2}$/),
  title: z.string().min(5),
  scenario: z.string().min(40),
  items: z.array(z.string()).min(1),
  start: z.string(),
  nodes: z.record(
    z.object({
      text: z.string().min(10),
      choices: z.array(choiceSchema).default([]),
      outcome: z.enum(["ADEQUADO", "PARCIAL", "INADEQUADO"]).optional(),
    }),
  ),
});
export type CpaTreeSpec = z.infer<typeof treeSchema>;

export const examSchema = z.object({
  code: z.string().regex(/^CPA-S-[A-Z0-9-]+$/),
  kind: z.enum(["DIAGNOSTICO", "MODULO", "INTERMEDIARIO", "COMPLETO", "FINAL", "ATENDIMENTO"]),
  title: z.string(),
  description: z.string().optional(),
  questionCount: z.number().int().min(1).max(200),
  durationMinutes: z.number().int().min(1).max(300),
  distribution: z.record(z.number()).default({}),
  macros: z.array(z.number().int().min(1).max(4)).default([]),
  fixedCodes: z.array(z.string()).default([]),
  pool: z.enum(["FIXACAO", "SIMULADO", "DIAGNOSTICO"]).default("SIMULADO"),
  allowStudyMode: z.boolean().default(true),
  allowBackNav: z.boolean().default(true),
  targetPercent: z.number().int().min(0).max(100).default(70),
});
export type CpaExamSpec = z.infer<typeof examSchema>;

export const structureSchema = z.object({
  chapters: z.array(
    z.object({ number: z.number().int(), macro: z.number().int().min(1).max(4), title: z.string(), officialRef: z.string(), summary: z.string().optional() }),
  ),
});

/** Valida a coerência de uma árvore: nós alcançáveis, transições válidas e finais com desfecho. */
export function checkTree(tree: CpaTreeSpec): string[] {
  const errs: string[] = [];
  if (!tree.nodes[tree.start]) errs.push(`${tree.code}: nó inicial "${tree.start}" não existe`);
  for (const [id, node] of Object.entries(tree.nodes)) {
    if (!node.choices.length && !node.outcome) errs.push(`${tree.code}/${id}: nó final sem desfecho`);
    for (const c of node.choices) if (!tree.nodes[c.next]) errs.push(`${tree.code}/${id}: transição para "${c.next}" inexistente`);
  }
  const seen = new Set<string>();
  const stack = [tree.start];
  while (stack.length) {
    const id = stack.pop()!;
    if (seen.has(id) || !tree.nodes[id]) continue;
    seen.add(id);
    for (const c of tree.nodes[id]!.choices) stack.push(c.next);
  }
  for (const id of Object.keys(tree.nodes)) if (!seen.has(id)) errs.push(`${tree.code}/${id}: nó inalcançável`);
  if (!Object.values(tree.nodes).some((n) => n.outcome === "ADEQUADO")) errs.push(`${tree.code}: nenhum caminho adequado`);
  if (Object.values(tree.nodes).filter((n) => n.choices.length > 1).length < 2) errs.push(`${tree.code}: precisa de ao menos 2 pontos de decisão com caminhos alternativos`);
  return errs;
}

/** Pontuação máxima de uma árvore: maior soma de pontos de qualquer caminho até um final. */
export function maxTreeScore(tree: CpaTreeSpec): number {
  const memo = new Map<string, number>();
  const best = (id: string, depth = 0): number => {
    if (depth > 50) return 0;
    if (memo.has(id)) return memo.get(id)!;
    const node = tree.nodes[id];
    const v = node && node.choices.length ? Math.max(...node.choices.map((c) => c.score + best(c.next, depth + 1))) : 0;
    memo.set(id, v);
    return v;
  };
  return best(tree.start);
}

/** Similaridade de Jaccard entre enunciados (trigramas de palavras): detecta questões repetidas. */
export function similarity(a: string, b: string): number {
  const grams = (s: string) => {
    const w = s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9 ]+/g, " ")
      .split(/\s+/)
      .filter(Boolean);
    const g = new Set<string>();
    for (let i = 0; i + 2 < w.length; i++) g.add(w.slice(i, i + 3).join(" "));
    return g;
  };
  const A = grams(a);
  const B = grams(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  return inter / (A.size + B.size - inter);
}

export const questionHash = (q: CpaQuestionSpec) => hash(JSON.stringify([q.stem, q.options, q.correct, q.explanation, q.items, q.type, q.use, q.difficulty, q.check]));
