import { createHash } from "node:crypto";
import type { ContentDocument, Section } from "@/content-blocks/schema";
import { markdownToBlocks } from "./markdown";

/**
 * Leitor do formato de curso em Markdown (docs/CURSOS-FORMATO.md):
 *
 *   ---                         ficha do curso (chave: valor)
 *   # M1 — Título do módulo     módulos (assuntos da plataforma)
 *   Objetivos:  - O1 (aplicar): …
 *   ## Aula 1 — Título [15 min]                 seções de aula (contam para a presença)
 *   ## Material de apoio — Título [25 min]      material de apoio
 *   ## Atividade prática — Título [75 min]      atividade prática
 *   ## Questões                                 banco de questões do módulo
 *   ### Q01 | O1 | aplicar | caso | vf
 *   Enunciado…  A) … B) … C) … D) …  Gabarito: B  Comentário: …
 *
 * Seções "## " antes do primeiro módulo são textos do curso (ex.: Bibliografia, Como você será avaliado).
 */

export type Bloom = "LEMBRAR" | "COMPREENDER" | "APLICAR" | "ANALISAR";
export type Kind = "MULTIPLA" | "VF" | "ASSOCIACAO";

export type QuestionSpec = {
  code: string;
  objective: string;
  bloom: Bloom;
  kind: Kind;
  isCase: boolean;
  stem: string;
  options: { key: string; text: string }[];
  correct: string;
  commentary: string;
};

export type ModuleSpec = {
  number: number;
  title: string;
  slug: string;
  objectives: { code: string; bloom: string; text: string }[];
  document: ContentDocument;
  minutes: number;
  questions: QuestionSpec[];
};

export type CourseSpec = {
  sheet: Record<string, string>;
  code: string;
  title: string;
  slug: string;
  segment: { name: string; slug: string; description?: string };
  hours: number;
  questionsPerQuiz: number;
  intro: { title: string; markdown: string }[];
  modules: ModuleSpec[];
  computedMinutes: number;
  hash: string;
};

const BLOOM: Record<string, Bloom> = { lembrar: "LEMBRAR", compreender: "COMPREENDER", aplicar: "APLICAR", analisar: "ANALISAR" };

export class CourseFormatError extends Error {}

function slugify(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function minutesOf(title: string): { title: string; minutes: number } {
  const m = /\[(\d+)\s*min\]\s*$/.exec(title);
  return m ? { title: title.slice(0, m.index).trim(), minutes: Number(m[1]) } : { title: title.trim(), minutes: 0 };
}

function splitBy(lines: string[], re: RegExp): { head: string; body: string[] }[] {
  const out: { head: string; body: string[] }[] = [];
  for (const line of lines) {
    if (re.test(line)) out.push({ head: line, body: [] });
    else if (out.length) out[out.length - 1]!.body.push(line);
  }
  return out;
}

export function parseQuestions(md: string, prefix: string, where: string): QuestionSpec[] {
  const blocks = splitBy(md.split("\n"), /^###\s+/);
  return blocks.map(({ head, body }) => {
    const parts = head.replace(/^###\s+/, "").split("|").map((p) => p.trim());
    const [qid, objective, bloomRaw, ...flags] = parts;
    const loc = `${where} ${qid}`;
    if (!qid || !objective || !bloomRaw) throw new CourseFormatError(`${loc}: cabeçalho deve ser "### Qnn | Objetivo | nível"`);
    const bloom = BLOOM[bloomRaw.toLowerCase()];
    if (!bloom) throw new CourseFormatError(`${loc}: nível "${bloomRaw}" inválido`);
    const stem: string[] = [];
    const options: { key: string; text: string }[] = [];
    let correct = "";
    const commentary: string[] = [];
    let mode: "stem" | "options" | "comment" = "stem";
    for (const raw of body) {
      const line = raw.trimEnd();
      const opt = /^([A-D])\)\s+(.*)$/.exec(line.trim());
      const gab = /^Gabarito:\s*([A-D])\s*$/i.exec(line.trim());
      const com = /^Coment[áa]rio:\s*(.*)$/i.exec(line.trim());
      if (gab) {
        correct = gab[1]!.toUpperCase();
        continue;
      }
      if (com) {
        mode = "comment";
        if (com[1]) commentary.push(com[1]);
        continue;
      }
      if (opt && mode !== "comment") {
        mode = "options";
        options.push({ key: opt[1]!, text: opt[2]!.trim() });
        continue;
      }
      if (mode === "stem") stem.push(line);
      else if (mode === "options" && line.trim() && options.length) options[options.length - 1]!.text += " " + line.trim();
      else if (mode === "comment") commentary.push(line);
    }
    if (options.length !== 4 || options.map((o) => o.key).join("") !== "ABCD") throw new CourseFormatError(`${loc}: são exigidas exatamente 4 alternativas A–D`);
    if (!correct) throw new CourseFormatError(`${loc}: falta "Gabarito:"`);
    if (!commentary.join("").trim()) throw new CourseFormatError(`${loc}: falta "Comentário:"`);
    if (new Set(options.map((o) => o.text.toLowerCase())).size !== 4) throw new CourseFormatError(`${loc}: alternativas repetidas`);
    if (options.some((o) => /todas as (anteriores|alternativas)|nenhuma das (anteriores|alternativas)/i.test(o.text)))
      throw new CourseFormatError(`${loc}: alternativa do tipo "todas/nenhuma das anteriores" não é permitida`);
    const lowerFlags = flags.map((f) => f.toLowerCase());
    return {
      code: `${prefix}-${qid}`,
      objective,
      bloom,
      kind: lowerFlags.includes("vf") ? "VF" : lowerFlags.includes("associacao") ? "ASSOCIACAO" : "MULTIPLA",
      isCase: lowerFlags.includes("caso"),
      stem: stem.join("\n").trim(),
      options,
      correct,
      commentary: commentary.join("\n").trim(),
    };
  });
}

export function parseCourse(source: string, file = "curso"): CourseSpec {
  const text = source.replace(/\r\n/g, "\n");
  const fm = /^---\n([\s\S]*?)\n---\n/.exec(text);
  if (!fm) throw new CourseFormatError(`${file}: falta a ficha do curso entre "---"`);
  const sheet: Record<string, string> = {};
  for (const line of fm[1]!.split("\n")) {
    const m = /^([a-z_]+):\s*(.*)$/.exec(line);
    if (m) sheet[m[1]!] = m[2]!.trim();
  }
  for (const k of ["codigo", "titulo", "segmento", "carga_horaria", "instrutor", "objetivo_geral"]) {
    if (!sheet[k]) throw new CourseFormatError(`${file}: ficha sem "${k}"`);
  }
  const code = sheet.codigo!;
  const prefix = code.replace(/[^A-Za-z0-9]/g, "");
  const body = text.slice(fm[0].length).split("\n");

  const firstModule = body.findIndex((l) => /^#\s+M\d+/.test(l));
  if (firstModule < 0) throw new CourseFormatError(`${file}: nenhum módulo "# M1 — …"`);
  const intro = splitBy(body.slice(0, firstModule), /^##\s+/).map((s) => ({ title: s.head.replace(/^##\s+/, "").trim(), markdown: s.body.join("\n").trim() }));

  const questionsPerQuiz = Number(sheet.questoes_por_prova ?? 10);
  const modules: ModuleSpec[] = splitBy(body.slice(firstModule), /^#\s+M\d+/).map(({ head, body: mBody }, mi) => {
    const hm = /^#\s+M(\d+)\s*[—–-]\s*(.+)$/.exec(head);
    if (!hm) throw new CourseFormatError(`${file}: cabeçalho de módulo inválido: ${head}`);
    const number = Number(hm[1]);
    const title = hm[2]!.trim();
    const where = `${file} M${number}`;
    const firstSection = mBody.findIndex((l) => /^##\s+/.test(l));
    const preamble = mBody.slice(0, firstSection < 0 ? mBody.length : firstSection);
    const objectives = preamble
      .map((l) => /^\s*-\s+(O\d+)\s*\(([^)]+)\):\s*(.+)$/.exec(l))
      .filter((m): m is RegExpExecArray => Boolean(m))
      .map((m) => ({ code: m[1]!, bloom: m[2]!.trim(), text: m[3]!.trim() }));
    if (!objectives.length) throw new CourseFormatError(`${where}: defina os objetivos ("- O1 (aplicar): …")`);

    const sections: Section[] = [];
    let questions: QuestionSpec[] = [];
    for (const [si, s] of splitBy(mBody.slice(Math.max(firstSection, 0)), /^##\s+/).entries()) {
      const rawTitle = s.head.replace(/^##\s+/, "").trim();
      if (/^Quest[õo]es\b/i.test(rawTitle)) {
        questions = parseQuestions(s.body.join("\n"), `${prefix}-M${number}`, where);
        continue;
      }
      const { title: secTitle, minutes } = minutesOf(rawTitle);
      if (!minutes) throw new CourseFormatError(`${where}: seção "${rawTitle}" sem duração "[N min]"`);
      const kind = /^Material de apoio/i.test(secTitle) ? "material" : /^Atividade/i.test(secTitle) ? "atividade" : "section";
      sections.push({
        id: `${prefix.toLowerCase()}-m${number}-s${si + 1}`,
        kind,
        title: secTitle,
        minutes,
        blocks: markdownToBlocks(s.body.join("\n"), `${prefix.toLowerCase()}-m${number}-s${si + 1}`),
      });
    }
    if (!sections.some((s) => s.kind === "section")) throw new CourseFormatError(`${where}: módulo sem aulas`);
    const minQuestions = questionsPerQuiz * 2;
    if (questions.length < minQuestions) throw new CourseFormatError(`${where}: banco com ${questions.length} questões; mínimo ${minQuestions} (2x as aplicadas)`);
    const cases = questions.filter((q) => q.isCase).length;
    if (cases / questions.length < 0.6) throw new CourseFormatError(`${where}: ${cases}/${questions.length} questões de caso prático; mínimo 60%`);
    for (const q of questions) {
      if (!objectives.some((o) => o.code === q.objective)) throw new CourseFormatError(`${where} ${q.code}: objetivo ${q.objective} não existe no módulo`);
    }
    const examMinutes = questionsPerQuiz * 2;
    const minutes = sections.reduce((s, x) => s + (x.minutes ?? 0), 0) + examMinutes;
    return {
      number,
      title,
      slug: slugify(`m${number}-${title}`),
      objectives,
      minutes,
      questions,
      document: { schemaVersion: 2, title, sections },
    } satisfies ModuleSpec & { number: number };
  });
  modules.forEach((m, i) => {
    if (m.number !== i + 1) throw new CourseFormatError(`${file}: módulos fora de ordem (esperado M${i + 1})`);
  });

  const computedMinutes = modules.reduce((s, m) => s + m.minutes, 0);
  const hours = Number(sheet.carga_horaria);
  if (computedMinutes !== hours * 60)
    throw new CourseFormatError(`${file}: carga horária declarada ${hours}h, mas o conteúdo soma ${(computedMinutes / 60).toFixed(2)}h. Ajuste os tempos (não inflar).`);

  return {
    sheet,
    code,
    title: sheet.titulo!,
    slug: sheet.slug || slugify(sheet.titulo!),
    segment: { name: sheet.segmento!, slug: sheet.segmento_slug || slugify(sheet.segmento!), description: sheet.segmento_descricao },
    hours,
    questionsPerQuiz,
    intro,
    modules,
    computedMinutes,
    hash: createHash("sha256").update(text).digest("hex").slice(0, 16),
  };
}

/** Hash estável de um documento — decide se é preciso publicar nova versão. */
export function documentHash(doc: unknown): string {
  return createHash("sha256").update(JSON.stringify(doc)).digest("hex").slice(0, 16);
}

/** Hash estável do conteúdo de uma questão — decide se é preciso nova versão. */
export function questionHash(q: QuestionSpec): string {
  return createHash("sha256").update(JSON.stringify([q.stem, q.options, q.correct, q.commentary, q.objective, q.bloom, q.kind, q.isCase])).digest("hex").slice(0, 16);
}
