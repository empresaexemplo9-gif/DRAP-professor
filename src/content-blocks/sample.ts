import type { ContentDocument } from "./schema";

/** Documento de exemplo com todos os tipos de bloco (design system e testes). */
export const SAMPLE_DOCUMENT: ContentDocument = {
  schemaVersion: 2,
  title: "Exemplo",
  sections: [
    {
      id: "ex1",
      kind: "section",
      title: "Planejamento de plantio",
      blocks: [
        { id: "b1", type: "paragraph", text: [{ kind: "text", text: "O planejamento começa pela " }, { kind: "text", text: "análise de solo", marks: ["bold"] }, { kind: "text", text: " e pela janela climática." }] },
        { id: "b2", type: "heading", level: 3, text: [{ kind: "text", text: "Etapas" }] },
        { id: "b3", type: "list", style: "ordered", items: [{ text: [{ kind: "text", text: "Coleta de amostras" }] }, { text: [{ kind: "text", text: "Correção de acidez" }] }, { text: [{ kind: "text", text: "Escolha da cultivar" }] }] },
        { id: "b4", type: "callout", variant: "dica", blocks: [{ id: "b4p", type: "paragraph", text: [{ kind: "text", text: "Registre cada talhão separadamente para comparar a produtividade." }] }] },
        { id: "b5", type: "table", header: [[{ text: [{ kind: "text", text: "Cultura" }] }, { text: [{ kind: "text", text: "Janela" }] }, { text: [{ kind: "text", text: "Produtividade (sc/ha)" }] }]], rows: [[{ text: [{ kind: "text", text: "Soja" }] }, { text: [{ kind: "text", text: "Out–Dez" }] }, { text: [{ kind: "text", text: "62" }] }], [{ text: [{ kind: "text", text: "Milho safrinha" }] }, { text: [{ kind: "text", text: "Jan–Mar" }] }, { text: [{ kind: "text", text: "105" }] }]] },
        { id: "b6", type: "quote", text: [{ kind: "text", text: "Quem não mede, não gerencia." }], cite: "Ditado de gestão" },
        { id: "b7", type: "callout", variant: "atencao", title: "Atenção", blocks: [{ id: "b7p", type: "paragraph", text: [{ kind: "text", text: "Respeite o zoneamento agrícola de risco climático (ZARC)." }] }] },
        { id: "b8", type: "divider" },
        { id: "b9", type: "code", language: "texto", code: "Custo por hectare = insumos + operações + arrendamento" },
      ],
    },
  ],
};
