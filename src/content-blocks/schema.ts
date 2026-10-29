import { z } from "zod";

/**
 * Formato interno de conteúdo em blocos (docs/FASE-2-BIBLIOTECA.md, seção 5).
 * Não existe campo de aparência (cor, fonte, tamanho, alinhamento) nem HTML livre:
 * todo conteúdo é desenhado pelo BlockRenderer usando apenas os tokens do tema.
 */

const SAFE_HREF = /^(https?:\/\/|mailto:|\/)/i;

export const markSchema = z.enum(["bold", "italic", "underline", "code", "sub", "sup"]);

export const inlineSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("text"), text: z.string().max(20_000), marks: z.array(markSchema).optional() }),
  z.object({
    kind: z.literal("link"),
    text: z.string().max(2_000),
    href: z.string().max(2_000).refine((v) => SAFE_HREF.test(v), "Link inválido"),
  }),
  z.object({ kind: z.literal("footnoteRef"), footnoteId: z.string() }),
]);
export type Inline = z.infer<typeof inlineSchema>;

const inlines = z.array(inlineSchema).max(500);

export type ListItem = { text: Inline[]; children?: ListItem[]; checked?: boolean };
export const listItemSchema: z.ZodType<ListItem> = z.lazy(() =>
  z.object({ text: inlines, children: z.array(listItemSchema).max(200).optional(), checked: z.boolean().optional() }),
);

const cellSchema = z.object({
  text: inlines,
  colSpan: z.number().int().min(1).max(50).optional(),
  rowSpan: z.number().int().min(1).max(500).optional(),
  header: z.boolean().optional(),
});

const sourceRefSchema = z
  .object({
    page: z.number().int().optional(),
    slide: z.number().int().optional(),
    sheet: z.string().optional(),
    range: z.string().optional(),
  })
  .optional();

const base = {
  id: z.string().min(1).max(64),
  source: sourceRefSchema,
  confidence: z.number().min(0).max(1).optional(),
};

export const CALLOUT_VARIANTS = ["destaque", "dica", "atencao", "exemplo", "info"] as const;

type BlockBase = { id: string; source?: z.infer<typeof sourceRefSchema>; confidence?: number };
export type Block = BlockBase &
  (
    | { type: "heading"; level: 2 | 3 | 4; text: Inline[] }
    | { type: "paragraph"; text: Inline[] }
    | { type: "list"; style: "bullet" | "ordered" | "check"; items: ListItem[] }
    | { type: "table"; caption?: Inline[]; header: z.infer<typeof cellSchema>[][]; rows: z.infer<typeof cellSchema>[][] }
    | { type: "image"; assetId?: string; src?: string; alt: string; caption?: Inline[] }
    | { type: "quote"; text: Inline[]; cite?: string }
    | { type: "callout"; variant: (typeof CALLOUT_VARIANTS)[number]; title?: string; blocks: Block[] }
    | { type: "code"; language?: string; code: string }
    | { type: "divider" }
    | { type: "questionSlot"; bankRef?: string }
    | { type: "forumSlot" }
  );

export const blockSchema: z.ZodType<Block> = z.lazy(() =>
  z.discriminatedUnion("type", [
    z.object({ ...base, type: z.literal("heading"), level: z.union([z.literal(2), z.literal(3), z.literal(4)]), text: inlines }),
    z.object({ ...base, type: z.literal("paragraph"), text: inlines }),
    z.object({ ...base, type: z.literal("list"), style: z.enum(["bullet", "ordered", "check"]), items: z.array(listItemSchema).max(500) }),
    z.object({
      ...base,
      type: z.literal("table"),
      caption: inlines.optional(),
      header: z.array(z.array(cellSchema).max(50)).max(5),
      rows: z.array(z.array(cellSchema).max(50)).max(2_000),
    }),
    z.object({
      ...base,
      type: z.literal("image"),
      assetId: z.string().optional(),
      src: z.string().url().refine((v) => v.startsWith("https://"), "Use uma URL https").optional(),
      alt: z.string().max(500),
      caption: inlines.optional(),
    }),
    z.object({ ...base, type: z.literal("quote"), text: inlines, cite: z.string().max(300).optional() }),
    z.object({
      ...base,
      type: z.literal("callout"),
      variant: z.enum(CALLOUT_VARIANTS),
      title: z.string().max(200).optional(),
      blocks: z.array(blockSchema).max(50),
    }),
    z.object({ ...base, type: z.literal("code"), language: z.string().max(30).optional(), code: z.string().max(50_000) }),
    z.object({ ...base, type: z.literal("divider") }),
    z.object({ ...base, type: z.literal("questionSlot"), bankRef: z.string().optional() }),
    z.object({ ...base, type: z.literal("forumSlot") }),
  ]),
);

export const sectionSchema = z.object({
  id: z.string().min(1).max(64),
  kind: z.enum(["section", "material", "atividade", "slide", "sheet", "transcript"]).default("section"),
  /** Tempo estimado em minutos (carga horária real). */
  minutes: z.number().int().min(0).max(1000).optional(),
  title: z.string().max(300),
  blocks: z.array(blockSchema).max(2_000),
});
export type Section = z.infer<typeof sectionSchema>;

export const documentSchema = z.object({
  schemaVersion: z.literal(2),
  title: z.string().max(300),
  sections: z.array(sectionSchema).max(500),
});
export type ContentDocument = z.infer<typeof documentSchema>;

export function emptyDocument(title: string): ContentDocument {
  return { schemaVersion: 2, title, sections: [{ id: newId(), kind: "section", title: "Introdução", blocks: [] }] };
}

/** Lê um documento salvo; conteúdo inválido vira documento vazio (nunca quebra a página). */
export function parseDocument(raw: unknown, fallbackTitle = ""): ContentDocument {
  const res = documentSchema.safeParse(raw);
  return res.success ? res.data : emptyDocument(fallbackTitle);
}

export function newId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export function inlineToPlain(text: Inline[] | undefined): string {
  return (text ?? []).map((i) => ("text" in i ? i.text : "")).join("");
}
