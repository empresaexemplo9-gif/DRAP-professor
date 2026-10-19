import type { ReactNode } from "react";
import type { Block, ContentDocument, Inline, ListItem } from "./schema";
import { clsx } from "clsx";

/**
 * Renderizador único de blocos. Cada tipo é mapeado para um componente que usa
 * apenas utilitários ligados aos tokens do tema — nenhum estilo vem do conteúdo.
 */

export function InlineText({ text }: { text: Inline[] | undefined }) {
  return (
    <>
      {(text ?? []).map((node, i) => {
        if (node.kind === "link") {
          const external = /^https?:\/\//.test(node.href);
          return (
            <a
              key={i}
              href={node.href}
              className="underline decoration-1 underline-offset-2 hover:decoration-2"
              {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            >
              {node.text}
            </a>
          );
        }
        if (node.kind === "footnoteRef") return <sup key={i}>*</sup>;
        let el: ReactNode = node.text;
        const marks = node.marks ?? [];
        if (marks.includes("code")) el = <code>{el}</code>;
        if (marks.includes("bold")) el = <strong className="font-semibold">{el}</strong>;
        if (marks.includes("italic")) el = <em>{el}</em>;
        if (marks.includes("underline")) el = <u>{el}</u>;
        if (marks.includes("sub")) el = <sub>{el}</sub>;
        if (marks.includes("sup")) el = <sup>{el}</sup>;
        return <span key={i}>{el}</span>;
      })}
    </>
  );
}

function List({ items, style }: { items: ListItem[]; style: "bullet" | "ordered" | "check" }) {
  const Tag = style === "ordered" ? "ol" : "ul";
  return (
    <Tag className={clsx(style === "check" && "!list-none !pl-0")}>
      {items.map((item, i) => (
        <li key={i} className={clsx(style === "check" && "flex gap-2")}>
          {style === "check" && (
            <span aria-hidden className={item.checked ? "text-success" : "text-text-muted"}>
              {item.checked ? "☑" : "☐"}
            </span>
          )}
          <span>
            {style === "check" && <span className="sr-only">{item.checked ? "Concluído: " : "Pendente: "}</span>}
            <InlineText text={item.text} />
          </span>
          {item.children?.length ? <List items={item.children} style={style} /> : null}
        </li>
      ))}
    </Tag>
  );
}

const CALLOUT_STYLES = {
  destaque: { label: "Destaque", icon: "★", className: "border-accent bg-surface", title: "text-accent-text" },
  dica: { label: "Dica", icon: "💡", className: "border-primary bg-surface", title: "text-primary-text" },
  atencao: { label: "Atenção", icon: "⚠", className: "border-warning bg-surface", title: "text-warning" },
  exemplo: { label: "Exemplo", icon: "✎", className: "border-border-strong bg-surface-raised", title: "text-text" },
  info: { label: "Informação", icon: "ℹ", className: "border-border-strong bg-surface", title: "text-text-muted" },
} as const;

export function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case "heading": {
      const Tag = `h${block.level}` as "h2" | "h3" | "h4";
      return (
        <Tag id={`b-${block.id}`} className="scroll-mt-24 font-display text-text">
          <InlineText text={block.text} />
        </Tag>
      );
    }
    case "paragraph":
      return (
        <p>
          <InlineText text={block.text} />
        </p>
      );
    case "list":
      return <List items={block.items} style={block.style} />;
    case "quote":
      return (
        <blockquote className="border-l-4 border-accent pl-4 font-display text-lg italic text-text">
          <InlineText text={block.text} />
          {block.cite && <footer className="mt-2 font-body text-sm not-italic text-text-muted">— {block.cite}</footer>}
        </blockquote>
      );
    case "callout": {
      const s = CALLOUT_STYLES[block.variant];
      return (
        <aside className={clsx("rounded-lg border-l-4 p-4 shadow-sm", s.className)} role="note" aria-label={s.label}>
          <p className={clsx("mb-1 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide", s.title)}>
            <span aria-hidden>{s.icon}</span>
            {block.title || s.label}
          </p>
          <div className="space-y-2">
            {block.blocks.map((b) => (
              <BlockView key={b.id} block={b} />
            ))}
          </div>
        </aside>
      );
    }
    case "code":
      return (
        <pre tabIndex={0} className="overflow-x-auto rounded-lg border border-border bg-surface-raised p-4 text-sm">
          <code className="font-mono">{block.code}</code>
        </pre>
      );
    case "divider":
      return <hr className="border-border" />;
    case "image":
      if (!block.src) return null;
      return (
        <figure>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={block.src}
            alt={block.alt}
            loading="lazy"
            className="h-auto max-w-full rounded-lg border border-border"
          />
          {block.caption?.length ? (
            <figcaption className="mt-2 text-sm text-text-muted">
              <InlineText text={block.caption} />
            </figcaption>
          ) : null}
        </figure>
      );
    case "table":
      return (
        <figure
          tabIndex={0}
          aria-label="Tabela do conteúdo com rolagem horizontal"
          className="overflow-x-auto rounded-lg border border-border"
        >
          <table className="w-full border-collapse text-left text-sm">
            {block.caption?.length ? (
              <caption className="p-3 text-left text-text-muted">
                <InlineText text={block.caption} />
              </caption>
            ) : null}
            <thead className="bg-surface-raised">
              {block.header.map((row, r) => (
                <tr key={r}>
                  {row.map((cell, c) => (
                    <th key={c} scope="col" colSpan={cell.colSpan} className="border-b border-border p-3 font-semibold">
                      <InlineText text={cell.text} />
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {block.rows.map((row, r) => (
                <tr key={r} className="border-b border-border last:border-0">
                  {row.map((cell, c) => (
                    <td
                      key={c}
                      colSpan={cell.colSpan}
                      rowSpan={cell.rowSpan}
                      className="whitespace-pre-line p-3 tabular-nums"
                    >
                      <InlineText text={cell.text} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </figure>
      );
    case "questionSlot":
      return (
        <SlotPlaceholder title="Questões do assunto" text="O banco de questões deste assunto será ativado na Fase 3." />
      );
    case "forumSlot":
      return (
        <SlotPlaceholder title="Fórum do assunto" text="O fórum de discussão deste assunto será ativado na Fase 3." />
      );
  }
}

export function SlotPlaceholder({ title, text }: { title: string; text: string }) {
  return (
    <section className="rounded-lg border border-dashed border-border-strong bg-surface p-5">
      <h3 className="font-display text-lg text-text">{title}</h3>
      <p className="mt-1 text-sm text-text-muted">{text}</p>
    </section>
  );
}

export function DocumentView({ doc }: { doc: ContentDocument }) {
  return (
    <div className="drap-content">
      {doc.sections.map((section) => (
        <section key={section.id} id={`s-${section.id}`} aria-labelledby={`st-${section.id}`} className="scroll-mt-24">
          <h2 id={`st-${section.id}`} className="font-display text-text">
            {section.title}
          </h2>
          <div className="mt-4 space-y-4">
            {section.blocks.map((b) => (
              <BlockView key={b.id} block={b} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

/** Índice automático: seções e títulos de nível 2/3. */
export function tableOfContents(doc: ContentDocument) {
  return doc.sections.map((s) => ({
    id: `s-${s.id}`,
    title: s.title,
    children: s.blocks
      .filter((b): b is Extract<Block, { type: "heading" }> => b.type === "heading" && b.level <= 3)
      .map((b) => ({ id: `b-${b.id}`, title: b.text.map((t) => ("text" in t ? t.text : "")).join("") })),
  }));
}
