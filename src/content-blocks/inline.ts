import type { Inline } from "./schema";

/**
 * Converte a marcação simples do editor em Inline[] e vice-versa:
 *   **negrito**, *itálico*, `código`, [texto](https://link)
 * Nada além disso é interpretado — o texto nunca vira HTML.
 */
const TOKEN = /\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|\[([^\]]+)\]\(([^)\s]+)\)/g;
const SAFE_HREF = /^(https?:\/\/|mailto:|\/)/i;

export function parseInline(src: string): Inline[] {
  const out: Inline[] = [];
  let last = 0;
  for (const m of src.matchAll(TOKEN)) {
    const idx = m.index ?? 0;
    if (idx > last) out.push({ kind: "text", text: src.slice(last, idx) });
    const [, bold, italic, code, linkText, href] = m;
    if (bold !== undefined) out.push({ kind: "text", text: bold, marks: ["bold"] });
    else if (italic !== undefined) out.push({ kind: "text", text: italic, marks: ["italic"] });
    else if (code !== undefined) out.push({ kind: "text", text: code, marks: ["code"] });
    else if (linkText !== undefined && href !== undefined) {
      if (SAFE_HREF.test(href)) out.push({ kind: "link", text: linkText, href });
      else out.push({ kind: "text", text: linkText });
    }
    last = idx + m[0].length;
  }
  if (last < src.length) out.push({ kind: "text", text: src.slice(last) });
  return out;
}

export function serializeInline(text: Inline[] | undefined): string {
  return (text ?? [])
    .map((i) => {
      if (i.kind === "link") return `[${i.text}](${i.href})`;
      if (i.kind === "footnoteRef") return "";
      const marks = i.marks ?? [];
      if (marks.includes("bold")) return `**${i.text}**`;
      if (marks.includes("italic")) return `*${i.text}*`;
      if (marks.includes("code")) return `\`${i.text}\``;
      return i.text;
    })
    .join("");
}
