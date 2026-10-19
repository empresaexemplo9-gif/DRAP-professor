// Garante a regra central do design system: nenhuma cor literal fora do arquivo de tema.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("../src", import.meta.url).pathname;
const ALLOWED = new Set(["theme/tokens.ts"]);
const COLOR = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab|lab|lch)\(/g;
const EXT = /\.(tsx?|css|mjs)$/;

function walk(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : EXT.test(f) ? [p] : [];
  });
}

const problems = [];
for (const file of walk(ROOT)) {
  const rel = relative(ROOT, file);
  if (ALLOWED.has(rel)) continue;
  readFileSync(file, "utf8")
    .split("\n")
    .forEach((line, i) => {
      // Ignora entidades HTML numéricas e âncoras de URL (#conteudo, #s-id).
      const cleaned = line.replace(/&#\d+;/g, "").replace(/href=["'`{][^"'`}]*["'`}]/g, "");
      for (const m of cleaned.matchAll(COLOR)) {
        if (/^#[0-9a-fA-F]+$/.test(m[0]) && !/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(m[0])) continue;
        problems.push(`${rel}:${i + 1}: cor literal "${m[0]}" — use um token de src/theme/tokens.ts`);
      }
    });
}

if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log("check-tokens: nenhuma cor literal fora do arquivo de tema.");
