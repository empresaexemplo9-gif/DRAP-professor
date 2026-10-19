"use client";
import { useMemo, useState, useTransition } from "react";
import { clsx } from "clsx";
import { publishTopicAction, saveTopicDraftAction } from "../../actions";
import { CALLOUT_VARIANTS, newId, type Block, type ContentDocument, type Section } from "@/content-blocks/schema";
import { parseInline, serializeInline } from "@/content-blocks/inline";
import { DocumentView } from "@/content-blocks/BlockRenderer";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/misc";

type Meta = { id: string; title: string; slug: string; durationMinutes: number };

const BLOCK_TYPES = [
  { type: "paragraph", label: "Parágrafo" },
  { type: "heading", label: "Título" },
  { type: "list", label: "Lista" },
  { type: "callout:destaque", label: "Destaque" },
  { type: "callout:dica", label: "Dica" },
  { type: "callout:atencao", label: "Atenção" },
  { type: "callout:exemplo", label: "Exemplo" },
  { type: "quote", label: "Citação" },
  { type: "table", label: "Tabela" },
  { type: "image", label: "Imagem (URL)" },
  { type: "code", label: "Código" },
  { type: "divider", label: "Divisor" },
] as const;

const CALLOUT_LABEL: Record<(typeof CALLOUT_VARIANTS)[number], string> = {
  destaque: "Destaque",
  dica: "Dica",
  atencao: "Atenção",
  exemplo: "Exemplo",
  info: "Informação",
};

function makeBlock(kind: (typeof BLOCK_TYPES)[number]["type"]): Block {
  const id = newId();
  if (kind.startsWith("callout:")) {
    const variant = kind.split(":")[1] as (typeof CALLOUT_VARIANTS)[number];
    return { id, type: "callout", variant, blocks: [{ id: newId(), type: "paragraph", text: [] }] };
  }
  switch (kind) {
    case "heading":
      return { id, type: "heading", level: 3, text: [] };
    case "list":
      return { id, type: "list", style: "bullet", items: [{ text: [] }] };
    case "quote":
      return { id, type: "quote", text: [] };
    case "table":
      return { id, type: "table", header: [[{ text: [{ kind: "text", text: "Coluna 1" }] }, { text: [{ kind: "text", text: "Coluna 2" }] }]], rows: [] };
    case "image":
      return { id, type: "image", alt: "" };
    case "code":
      return { id, type: "code", code: "" };
    case "divider":
      return { id, type: "divider" };
    default:
      return { id, type: "paragraph", text: [] };
  }
}

const input =
  "w-full rounded-md border border-border-strong bg-bg px-3 py-2 text-sm text-text placeholder:text-text-muted hover:border-primary focus-visible:border-primary";

function tableToText(b: Extract<Block, { type: "table" }>) {
  const rows = [...b.header, ...b.rows];
  return rows.map((r) => r.map((c) => serializeInline(c.text)).join(" | ")).join("\n");
}

function textToTable(text: string): { header: Extract<Block, { type: "table" }>["header"]; rows: Extract<Block, { type: "table" }>["rows"] } {
  const lines = text.split("\n").filter((l) => l.trim());
  const cells = lines.map((l) => l.split("|").map((c) => ({ text: parseInline(c.trim()) })));
  return { header: cells.slice(0, 1), rows: cells.slice(1) };
}

function BlockFields({ block, onChange }: { block: Block; onChange: (b: Block) => void }) {
  switch (block.type) {
    case "paragraph":
      return (
        <textarea aria-label="Texto do parágrafo" className={clsx(input, "min-h-24")} value={serializeInline(block.text)} onChange={(e) => onChange({ ...block, text: parseInline(e.target.value) })} placeholder="Texto. Use **negrito**, *itálico*, `código` e [link](https://…)." />
      );
    case "heading":
      return (
        <div className="flex gap-2">
          <select aria-label="Nível do título" className={clsx(input, "w-28")} value={block.level} onChange={(e) => onChange({ ...block, level: Number(e.target.value) as 2 | 3 | 4 })}>
            <option value={2}>Título 1</option>
            <option value={3}>Título 2</option>
            <option value={4}>Título 3</option>
          </select>
          <input aria-label="Texto do título" className={input} value={serializeInline(block.text)} onChange={(e) => onChange({ ...block, text: parseInline(e.target.value) })} />
        </div>
      );
    case "list":
      return (
        <div className="space-y-2">
          <select aria-label="Tipo de lista" className={clsx(input, "w-44")} value={block.style} onChange={(e) => onChange({ ...block, style: e.target.value as "bullet" | "ordered" | "check" })}>
            <option value="bullet">Marcadores</option>
            <option value="ordered">Numerada</option>
            <option value="check">Checklist</option>
          </select>
          <textarea
            aria-label="Itens da lista (um por linha)"
            className={clsx(input, "min-h-24")}
            value={block.items.map((i) => serializeInline(i.text)).join("\n")}
            onChange={(e) => onChange({ ...block, items: e.target.value.split("\n").map((l) => ({ text: parseInline(l) })) })}
            placeholder="Um item por linha"
          />
        </div>
      );
    case "quote":
      return (
        <div className="space-y-2">
          <textarea aria-label="Citação" className={clsx(input, "min-h-20")} value={serializeInline(block.text)} onChange={(e) => onChange({ ...block, text: parseInline(e.target.value) })} />
          <input aria-label="Autor da citação" className={input} placeholder="Autor (opcional)" value={block.cite ?? ""} onChange={(e) => onChange({ ...block, cite: e.target.value || undefined })} />
        </div>
      );
    case "callout": {
      const text = block.blocks.map((b) => (b.type === "paragraph" ? serializeInline(b.text) : "")).join("\n\n");
      return (
        <div className="space-y-2">
          <div className="flex gap-2">
            <select aria-label="Tipo de destaque" className={clsx(input, "w-36")} value={block.variant} onChange={(e) => onChange({ ...block, variant: e.target.value as (typeof CALLOUT_VARIANTS)[number] })}>
              {CALLOUT_VARIANTS.map((v) => <option key={v} value={v}>{CALLOUT_LABEL[v]}</option>)}
            </select>
            <input aria-label="Título do destaque" className={input} placeholder="Título (opcional)" value={block.title ?? ""} onChange={(e) => onChange({ ...block, title: e.target.value || undefined })} />
          </div>
          <textarea
            aria-label="Texto do destaque"
            className={clsx(input, "min-h-20")}
            value={text}
            onChange={(e) =>
              onChange({ ...block, blocks: e.target.value.split(/\n{2,}/).map((p, i) => ({ id: block.blocks[i]?.id ?? newId(), type: "paragraph" as const, text: parseInline(p) })) })
            }
          />
        </div>
      );
    }
    case "table":
      return (
        <textarea
          aria-label="Tabela: uma linha por linha, colunas separadas por |, primeira linha é o cabeçalho"
          className={clsx(input, "min-h-28 font-mono")}
          defaultValue={tableToText(block)}
          onBlur={(e) => onChange({ ...block, ...textToTable(e.target.value) })}
          placeholder={"Cabeçalho A | Cabeçalho B\nValor 1 | Valor 2"}
        />
      );
    case "image":
      return (
        <div className="grid gap-2 sm:grid-cols-2">
          <input aria-label="URL da imagem (https)" className={input} placeholder="https://…" value={block.src ?? ""} onChange={(e) => onChange({ ...block, src: e.target.value || undefined })} />
          <input aria-label="Texto alternativo" className={input} placeholder="Descrição da imagem (acessibilidade)" value={block.alt} onChange={(e) => onChange({ ...block, alt: e.target.value })} />
          <input aria-label="Legenda" className={clsx(input, "sm:col-span-2")} placeholder="Legenda (opcional)" value={serializeInline(block.caption)} onChange={(e) => onChange({ ...block, caption: e.target.value ? parseInline(e.target.value) : undefined })} />
        </div>
      );
    case "code":
      return (
        <div className="space-y-2">
          <input aria-label="Linguagem" className={clsx(input, "w-40")} placeholder="Linguagem" value={block.language ?? ""} onChange={(e) => onChange({ ...block, language: e.target.value || undefined })} />
          <textarea aria-label="Código" className={clsx(input, "min-h-28 font-mono")} value={block.code} onChange={(e) => onChange({ ...block, code: e.target.value })} />
        </div>
      );
    case "divider":
      return <hr className="border-border" />;
    default:
      return <p className="text-sm text-text-muted">Bloco gerado pela importação de materiais.</p>;
  }
}

const BLOCK_LABEL: Record<string, string> = {
  paragraph: "Parágrafo",
  heading: "Título",
  list: "Lista",
  quote: "Citação",
  callout: "Destaque",
  table: "Tabela",
  image: "Imagem",
  code: "Código",
  divider: "Divisor",
  questionSlot: "Questões",
  forumSlot: "Fórum",
};

function AddBlockMenu({ onAdd }: { onAdd: (b: Block) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Adicionar bloco">
      {BLOCK_TYPES.map((t) => (
        <button key={t.type} type="button" onClick={() => onAdd(makeBlock(t.type))} className="min-h-9 rounded-md border border-border px-2.5 text-xs text-text-muted hover:border-primary hover:text-text">
          + {t.label}
        </button>
      ))}
    </div>
  );
}

const PREVIEW_WIDTHS = { desktop: { label: "Desktop", w: "100%" }, tablet: { label: "Tablet", w: "820px" }, mobile: { label: "Celular", w: "390px" } } as const;

export function TopicEditor({ meta: initialMeta, document: initialDoc, canPublish }: { meta: Meta; document: ContentDocument; canPublish: boolean }) {
  const [meta, setMeta] = useState(initialMeta);
  const [doc, setDoc] = useState(initialDoc);
  const [mode, setMode] = useState<"edit" | keyof typeof PREVIEW_WIDTHS>("edit");
  const [msg, setMsg] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [pending, start] = useTransition();
  const previewDoc = useMemo(() => ({ ...doc, title: meta.title }), [doc, meta.title]);

  function update(fn: (sections: Section[]) => Section[]) {
    setDoc((d) => ({ ...d, sections: fn(d.sections) }));
    setDirty(true);
  }
  const setSection = (si: number, s: Section) => update((ss) => ss.map((x, i) => (i === si ? s : x)));
  const setBlock = (si: number, bi: number, b: Block) =>
    update((ss) => ss.map((s, i) => (i === si ? { ...s, blocks: s.blocks.map((x, j) => (j === bi ? b : x)) } : s)));
  const moveBlock = (si: number, bi: number, dir: -1 | 1) =>
    update((ss) =>
      ss.map((s, i) => {
        if (i !== si) return s;
        const blocks = [...s.blocks];
        const j = bi + dir;
        if (j < 0 || j >= blocks.length) return s;
        [blocks[bi], blocks[j]] = [blocks[j]!, blocks[bi]!];
        return { ...s, blocks };
      }),
    );
  const removeBlock = (si: number, bi: number) => update((ss) => ss.map((s, i) => (i === si ? { ...s, blocks: s.blocks.filter((_, j) => j !== bi) } : s)));
  const splitAt = (si: number, bi: number) =>
    update((ss) => {
      const s = ss[si]!;
      const head = { ...s, blocks: s.blocks.slice(0, bi) };
      const tail: Section = { id: newId(), kind: "section", title: "Nova seção", blocks: s.blocks.slice(bi) };
      return [...ss.slice(0, si), head, tail, ...ss.slice(si + 1)];
    });
  const mergeNext = (si: number) =>
    update((ss) => {
      const a = ss[si]!;
      const b = ss[si + 1];
      if (!b) return ss;
      return [...ss.slice(0, si), { ...a, blocks: [...a.blocks, ...b.blocks] }, ...ss.slice(si + 2)];
    });
  const moveSection = (si: number, dir: -1 | 1) =>
    update((ss) => {
      const j = si + dir;
      if (j < 0 || j >= ss.length) return ss;
      const out = [...ss];
      [out[si], out[j]] = [out[j]!, out[si]!];
      return out;
    });

  function save(then?: () => Promise<void>) {
    setMsg(null);
    start(async () => {
      const res = await saveTopicDraftAction({ meta, document: doc });
      if (!res.ok) {
        setMsg({ tone: "danger", text: res.error ?? Object.values(res.fieldErrors ?? {})[0] ?? "Não foi possível salvar." });
        return;
      }
      setDirty(false);
      if (then) await then();
      else setMsg({ tone: "success", text: res.message ?? "Salvo." });
    });
  }

  function publish() {
    const note = window.prompt("Nota desta versão (opcional):") ?? undefined;
    save(async () => {
      const res = await publishTopicAction({ id: meta.id, changeNote: note });
      setMsg(res.ok ? { tone: "success", text: res.message ?? "Publicado." } : { tone: "danger", text: res.error ?? "Falha ao publicar." });
    });
  }

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-20 -mx-4 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-bg/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-lg sm:border">
        <div role="group" aria-label="Modo de exibição" className="flex flex-wrap gap-1">
          <Button size="sm" variant={mode === "edit" ? "primary" : "secondary"} onClick={() => setMode("edit")}>Editar</Button>
          {(Object.keys(PREVIEW_WIDTHS) as (keyof typeof PREVIEW_WIDTHS)[]).map((k) => (
            <Button key={k} size="sm" variant={mode === k ? "primary" : "secondary"} onClick={() => setMode(k)}>
              Prévia {PREVIEW_WIDTHS[k].label}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {dirty && <span className="text-xs text-warning">Alterações não salvas</span>}
          <Button size="sm" variant="secondary" onClick={() => save()} loading={pending}>Salvar rascunho</Button>
          {canPublish && <Button size="sm" onClick={publish} loading={pending}>Publicar</Button>}
        </div>
      </div>
      {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}

      {mode !== "edit" ? (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface-raised p-4">
          <div className="mx-auto rounded-lg border border-border bg-bg p-5 sm:p-8" style={{ width: PREVIEW_WIDTHS[mode].w, maxWidth: "100%" }}>
            <h1 className="mb-6 font-display text-3xl text-text">{meta.title}</h1>
            <DocumentView doc={previewDoc} />
          </div>
        </div>
      ) : (
        <>
          <fieldset className="grid gap-4 rounded-lg border border-border bg-surface p-4 sm:grid-cols-[1fr_14rem_9rem]">
            <legend className="px-2 font-display text-lg text-text">Assunto</legend>
            <label className="space-y-1 text-sm text-text">
              <span>Título</span>
              <input className={input} value={meta.title} onChange={(e) => { setMeta({ ...meta, title: e.target.value }); setDirty(true); }} />
            </label>
            <label className="space-y-1 text-sm text-text">
              <span>Endereço (slug)</span>
              <input className={input} value={meta.slug} onChange={(e) => { setMeta({ ...meta, slug: e.target.value }); setDirty(true); }} />
            </label>
            <label className="space-y-1 text-sm text-text">
              <span>Duração (min)</span>
              <input type="number" min={0} className={input} value={meta.durationMinutes} onChange={(e) => { setMeta({ ...meta, durationMinutes: Number(e.target.value) }); setDirty(true); }} />
            </label>
          </fieldset>

          {doc.sections.map((section, si) => (
            <section key={section.id} className="space-y-4 rounded-lg border border-border bg-surface p-4" aria-label={`Seção ${si + 1}`}>
              <div className="flex flex-wrap items-center gap-2">
                <input aria-label={`Título da seção ${si + 1}`} className={clsx(input, "max-w-md flex-1 font-display text-lg")} value={section.title} onChange={(e) => setSection(si, { ...section, title: e.target.value })} />
                <Button size="sm" variant="ghost" onClick={() => moveSection(si, -1)} disabled={si === 0} aria-label="Mover seção para cima">↑</Button>
                <Button size="sm" variant="ghost" onClick={() => moveSection(si, 1)} disabled={si === doc.sections.length - 1} aria-label="Mover seção para baixo">↓</Button>
                {si < doc.sections.length - 1 && <Button size="sm" variant="ghost" onClick={() => mergeNext(si)}>Juntar com a próxima</Button>}
                {doc.sections.length > 1 && <Button size="sm" variant="danger" onClick={() => update((ss) => ss.filter((_, i) => i !== si))}>Excluir seção</Button>}
              </div>
              {section.blocks.map((block, bi) => (
                <div key={block.id} className="rounded-md border border-border bg-bg p-3">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-medium uppercase tracking-wide text-text-muted">{BLOCK_LABEL[block.type] ?? block.type}</span>
                    <div className="flex flex-wrap gap-1">
                      <Button size="sm" variant="ghost" onClick={() => moveBlock(si, bi, -1)} disabled={bi === 0} aria-label="Mover bloco para cima">↑</Button>
                      <Button size="sm" variant="ghost" onClick={() => moveBlock(si, bi, 1)} disabled={bi === section.blocks.length - 1} aria-label="Mover bloco para baixo">↓</Button>
                      {bi > 0 && <Button size="sm" variant="ghost" onClick={() => splitAt(si, bi)}>Dividir seção aqui</Button>}
                      <Button size="sm" variant="ghost" onClick={() => removeBlock(si, bi)} aria-label="Excluir bloco">Excluir</Button>
                    </div>
                  </div>
                  <BlockFields block={block} onChange={(b) => setBlock(si, bi, b)} />
                </div>
              ))}
              <AddBlockMenu onAdd={(b) => setSection(si, { ...section, blocks: [...section.blocks, b] })} />
            </section>
          ))}
          <Button variant="secondary" onClick={() => update((ss) => [...ss, { id: newId(), kind: "section", title: "Nova seção", blocks: [] }])}>
            + Nova seção
          </Button>
        </>
      )}
    </div>
  );
}
