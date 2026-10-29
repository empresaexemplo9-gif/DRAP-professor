/**
 * Valida todo o conteúdo do preparatório CPA (content/cpa) e mostra a matriz de cobertura.
 *   npm run cpa:validar            → erros (falha), avisos e cobertura por macrotema
 *   npm run cpa:validar -- --lacunas   → lista os microtemas-folha sem aula ou sem questão
 *   npm run cpa:validar -- --capitulo 3 --lacunas   → só os arquivos e microtemas do capítulo 3
 */
import { loadCpaCatalog, validateCpaCatalog } from "../src/lib/cpa/catalog";

const chapterArg = process.argv.indexOf("--capitulo");
const chapter = chapterArg > 0 ? Number(process.argv[chapterArg + 1]) : undefined;
const { catalog, errors: parseErrors } = loadCpaCatalog(undefined, chapter);
const report = validateCpaCatalog(catalog);
if (chapter) report.coverage = report.coverage.filter((r) => r.chapter === chapter);
const errors = [...parseErrors, ...report.errors];

const leaves = report.coverage;
const byMacro = [1, 2, 3, 4].map((m) => {
  const rows = leaves.filter((r) => r.macro === m);
  return { m, total: rows.length, lesson: rows.filter((r) => r.lessons.length).length, question: rows.filter((r) => r.questions.length).length };
});
console.log(`Programa: ${catalog.program.fonte} · versão ${catalog.program.versao} · vigência ${catalog.program.vigencia}`);
console.log(`Aulas: ${catalog.lessons.length} · questões: ${catalog.questions.length} (fixação ${catalog.questions.filter((q) => q.use === "fixacao").length}, simulado ${catalog.questions.filter((q) => q.use === "simulado").length}, diagnóstico ${catalog.questions.filter((q) => q.use === "diagnostico").length}) · cartões: ${catalog.cards.length} · árvores: ${catalog.trees.length} · simulados: ${catalog.exams.length}`);
for (const r of byMacro) console.log(`  Macrotema ${r.m}: ${r.lesson}/${r.total} microtemas com aula · ${r.question}/${r.total} com questão`);
const full = leaves.filter((r) => r.lessons.length && r.questions.length).length;
console.log(`  Cobertura completa (aula + questão): ${full}/${leaves.length}`);
if (process.argv.includes("--lacunas")) {
  for (const r of leaves.filter((x) => !x.lessons.length || !x.questions.length))
    console.log(`  LACUNA ${r.code} [cap. ${r.chapter}] ${!r.lessons.length ? "sem aula " : ""}${!r.questions.length ? "sem questão" : ""} — ${r.text}`);
}
for (const w of report.warnings) console.log(`AVISO ${w}`);
for (const e of errors) console.error(`ERRO ${e}`);
if (errors.length) process.exit(1);
