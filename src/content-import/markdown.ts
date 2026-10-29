import { parseInline } from "@/content-blocks/inline";
import { CALLOUT_VARIANTS, type Block, type Inline, type ListItem } from "@/content-blocks/schema";

/**
 * Converte um subconjunto de Markdown em blocos da plataforma (sem HTML, sem estilo):
 *   ### / ####  títulos            -, *  listas            1.  lista numerada
 *   - [ ] / - [x]  checklist       | a | b |  tabelas      ```  código
 *   > [!DICA] Título  destaque (DICA, ATENCAO, DESTAQUE, EXEMPLO, INFO)
 *   > texto / > — Autor  citação  ---  divisor               demais linhas: parágrafos
 *   $$ … $$  fórmula (LaTeX, uma ou várias linhas)
 * Os ids são determinísticos (prefixo + posição) para manter âncoras estáveis entre importações.
 */

const CALLOUT_MAP: Record<string, (typeof CALLOUT_VARIANTS)[number]> = {
  DICA: "dica",
  ATENCAO: "atencao",
  ATENÇÃO: "atencao",
  DESTAQUE: "destaque",
  EXEMPLO: "exemplo",
  INFO: "info",
};

export function markdownToBlocks(md: string, idPrefix: string): Block[] {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let n = 0;
  const id = () => `${idPrefix}-${++n}`;
  let i = 0;

  const isSpecial = (l: string) =>
    /^#{3,4}\s/.test(l) || /^\s*([-*]|\d+\.)\s/.test(l) || l.startsWith("|") || l.startsWith(">") || l.startsWith("```") || l.trim().startsWith("$$") || /^-{3,}\s*$/.test(l);

  while (i < lines.length) {
    const line = lines[i]!;
    if (!line.trim()) {
      i++;
      continue;
    }
    // Títulos
    const h = /^(#{3,4})\s+(.*)$/.exec(line);
    if (h) {
      blocks.push({ id: id(), type: "heading", level: h[1]!.length === 3 ? 3 : 4, text: parseInline(h[2]!.trim()) });
      i++;
      continue;
    }
    // Divisor
    if (/^-{3,}\s*$/.test(line)) {
      blocks.push({ id: id(), type: "divider" });
      i++;
      continue;
    }
    // Fórmula
    if (line.trim().startsWith("$$")) {
      let body = line.trim().slice(2);
      i++;
      if (!body.trim().endsWith("$$")) {
        while (i < lines.length && !lines[i]!.trim().endsWith("$$")) body += "\n" + lines[i++]!;
        body += "\n" + (lines[i++] ?? "");
      }
      blocks.push({ id: id(), type: "formula", latex: body.trim().replace(/\$\$\s*$/, "").trim() });
      continue;
    }
    // Código
    if (line.startsWith("```")) {
      const language = line.slice(3).trim() || undefined;
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i]!.startsWith("```")) code.push(lines[i++]!);
      i++;
      blocks.push({ id: id(), type: "code", language, code: code.join("\n") });
      continue;
    }
    // Destaque ou citação
    if (line.startsWith(">")) {
      const quoted: string[] = [];
      while (i < lines.length && lines[i]!.startsWith(">")) quoted.push(lines[i++]!.replace(/^>\s?/, ""));
      const tag = /^\[!([A-ZÇÃ]+)\]\s*(.*)$/.exec(quoted[0] ?? "");
      if (tag && CALLOUT_MAP[tag[1]!]) {
        const inner = markdownToBlocks(quoted.slice(1).join("\n"), `${idPrefix}-${n + 1}c`);
        blocks.push({ id: id(), type: "callout", variant: CALLOUT_MAP[tag[1]!]!, title: tag[2]?.trim() || undefined, blocks: inner });
      } else {
        const last = quoted[quoted.length - 1] ?? "";
        const cite = /^[—-]\s+(.+)$/.exec(last);
        const text = (cite ? quoted.slice(0, -1) : quoted).join(" ").trim();
        blocks.push({ id: id(), type: "quote", text: parseInline(text), cite: cite?.[1]?.trim() });
      }
      continue;
    }
    // Tabela
    if (line.startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i]!.startsWith("|")) {
        const cells = lines[i]!.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
        if (!cells.every((c) => /^:?-{2,}:?$/.test(c))) rows.push(cells);
        i++;
      }
      const toCells = (r: string[]) => r.map((c) => ({ text: parseInline(c) }));
      blocks.push({ id: id(), type: "table", header: rows.length ? [toCells(rows[0]!)] : [], rows: rows.slice(1).map(toCells) });
      continue;
    }
    // Listas (com um nível de aninhamento por indentação)
    const li = /^(\s*)([-*]|\d+\.)\s+(.*)$/.exec(line);
    if (li) {
      const ordered = /\d+\./.test(li[2]!);
      const check = /^\[( |x|X)\]\s/.test(li[3]!);
      const items: ListItem[] = [];
      while (i < lines.length) {
        const m = /^(\s*)([-*]|\d+\.)\s+(.*)$/.exec(lines[i]!);
        if (!m) {
          // continuação de item (linha indentada)
          if (/^\s{2,}\S/.test(lines[i]!) && items.length) {
            const last = items[items.length - 1]!;
            last.text = [...last.text, { kind: "text", text: " " } as Inline, ...parseInline(lines[i]!.trim())];
            i++;
            continue;
          }
          break;
        }
        const indent = m[1]!.length;
        let text = m[3]!;
        let checked: boolean | undefined;
        const cb = /^\[( |x|X)\]\s+(.*)$/.exec(text);
        if (cb) {
          checked = cb[1] !== " ";
          text = cb[2]!;
        }
        const item: ListItem = { text: parseInline(text), ...(check ? { checked } : {}) };
        if (indent >= 2 && items.length) (items[items.length - 1]!.children ??= []).push(item);
        else items.push(item);
        i++;
      }
      blocks.push({ id: id(), type: "list", style: check ? "check" : ordered ? "ordered" : "bullet", items });
      continue;
    }
    // Parágrafo (linhas consecutivas)
    const para: string[] = [];
    while (i < lines.length && lines[i]!.trim() && !isSpecial(lines[i]!)) para.push(lines[i++]!.trim());
    if (para.length) blocks.push({ id: id(), type: "paragraph", text: parseInline(para.join(" ")) });
    else i++;
  }
  return blocks;
}
