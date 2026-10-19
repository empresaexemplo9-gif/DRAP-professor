/**
 * Valida os cursos de content/cursos/*.md no formato de docs/CURSOS-FORMATO.md.
 *   npx tsx scripts/validar-cursos.ts [arquivo.md …]
 * Erros de formato (ficha, tempos, banco de questões) interrompem; avisos apontam densidade de texto
 * incompatível com o tempo declarado ("não inflar") e gabaritos concentrados numa mesma letra.
 */
import { readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { parseCourse } from "../src/content-import/course";
import type { Block } from "../src/content-blocks/schema";

const DIR = join(__dirname, "..", "content", "cursos");
const args = process.argv.slice(2);
const files = args.length ? args : readdirSync(DIR).filter((f) => f.endsWith(".md")).sort().map((f) => join(DIR, f));

// Leitura técnica com pausas para reflexão: mínimo de 90 palavras por minuto declarado nas aulas.
const LESSON_WPM = 90;
const MATERIAL_WPM = 35;

function words(blocks: Block[]): number {
  return JSON.stringify(blocks)
    .replace(/"(id|type|variant|kind|style|marks|href|level|checked)":"[^"]*"/g, "")
    .replace(/[{}[\]":,]/g, " ")
    .split(/\s+/)
    .filter((w) => /\p{L}/u.test(w) && !["text", "blocks", "items", "children", "rows", "header", "cells", "title"].includes(w)).length;
}

let failed = 0;
for (const file of files) {
  const name = basename(file);
  try {
    const c = parseCourse(readFileSync(file, "utf8"), name);
    const warnings: string[] = [];
    let total = 0;
    console.log(`\n${c.code} · ${c.title} · ${c.hours}h · segmento "${c.segment.name}"`);
    for (const m of c.modules) {
      const letters = m.questions.reduce<Record<string, number>>((a, q) => ((a[q.correct] = (a[q.correct] ?? 0) + 1), a), {});
      const caseShare = Math.round((m.questions.filter((q) => q.isCase).length / m.questions.length) * 100);
      const lessonWords = m.document.sections.filter((s) => s.kind === "section").map((s) => ({ s, w: words(s.blocks) }));
      const mw = lessonWords.reduce((a, x) => a + x.w, 0);
      total += mw;
      console.log(
        `  M${m.number} ${m.title} — ${m.minutes} min · ${m.document.sections.length} seções · ${m.questions.length} questões (${caseShare}% caso) · gabaritos ${Object.entries(letters).sort().map(([k, v]) => `${k}:${v}`).join(" ")} · ${mw} palavras nas aulas`,
      );
      for (const { s, w } of lessonWords) if (w < (s.minutes ?? 0) * LESSON_WPM) warnings.push(`M${m.number} "${s.title}": ${w} palavras para ${s.minutes} min (mínimo ${(s.minutes ?? 0) * LESSON_WPM})`);
      for (const s of m.document.sections.filter((x) => x.kind === "material")) {
        const w = words(s.blocks);
        if (w < (s.minutes ?? 0) * MATERIAL_WPM) warnings.push(`M${m.number} "${s.title}": ${w} palavras para ${s.minutes} min (mínimo ${(s.minutes ?? 0) * MATERIAL_WPM})`);
      }
      const max = Math.max(...Object.values(letters));
      if (max > m.questions.length * 0.4) warnings.push(`M${m.number}: gabarito concentrado (${max} de ${m.questions.length} na mesma letra)`);
      for (const o of m.objectives) {
        const n = m.questions.filter((q) => q.objective === o.code).length;
        if (n < 4) warnings.push(`M${m.number} ${o.code}: só ${n} questões (mínimo 4 por objetivo)`);
      }
      const share = (levels: string[]) => m.questions.filter((q) => levels.includes(q.bloom)).length / m.questions.length;
      if (share(["LEMBRAR", "COMPREENDER"]) > 0.3) warnings.push(`M${m.number}: mais de 30% das questões em lembrar/compreender`);
      if (share(["APLICAR"]) < 0.4) warnings.push(`M${m.number}: menos de 40% das questões em aplicar`);
      if (share(["ANALISAR"]) < 0.2) warnings.push(`M${m.number}: menos de 20% das questões em analisar`);
      for (const q of m.questions) if (q.commentary.split(/\s+/).length < 25) warnings.push(`${q.code}: comentário curto — explique por que a correta é correta e as outras não`);
    }
    console.log(`  Total: ${c.computedMinutes / 60}h · ${total} palavras nas aulas`);
    for (const w of warnings) console.log(`  AVISO ${w}`);
  } catch (e) {
    failed++;
    console.error(`\nERRO ${name}: ${(e as Error).message}`);
  }
}
if (failed) process.exit(1);
