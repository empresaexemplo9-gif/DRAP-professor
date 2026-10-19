import type { ContentDocument } from "./schema";

/** Documento de exemplo com todos os tipos de bloco (design system e testes). */
export const SAMPLE_DOCUMENT: ContentDocument = {
  schemaVersion: 2,
  title: "Exemplo",
  sections: [
    {
      id: "ex1",
      kind: "section",
      title: "Planejamento de um projeto",
      blocks: [
        { id: "b1", type: "paragraph", text: [{ kind: "text", text: "Todo projeto começa pela " }, { kind: "text", text: "definição do objetivo", marks: ["bold"] }, { kind: "text", text: " e dos critérios de sucesso." }] },
        { id: "b2", type: "heading", level: 3, text: [{ kind: "text", text: "Etapas" }] },
        { id: "b3", type: "list", style: "ordered", items: [{ text: [{ kind: "text", text: "Levantamento de requisitos" }] }, { text: [{ kind: "text", text: "Cronograma e responsáveis" }] }, { text: [{ kind: "text", text: "Acompanhamento de indicadores" }] }] },
        { id: "b4", type: "callout", variant: "dica", blocks: [{ id: "b4p", type: "paragraph", text: [{ kind: "text", text: "Registre as decisões do projeto em um único lugar, acessível a toda a equipe." }] }] },
        { id: "b5", type: "table", header: [[{ text: [{ kind: "text", text: "Etapa" }] }, { text: [{ kind: "text", text: "Prazo" }] }, { text: [{ kind: "text", text: "Responsável" }] }]], rows: [[{ text: [{ kind: "text", text: "Requisitos" }] }, { text: [{ kind: "text", text: "2 semanas" }] }, { text: [{ kind: "text", text: "Coordenação" }] }], [{ text: [{ kind: "text", text: "Execução" }] }, { text: [{ kind: "text", text: "8 semanas" }] }, { text: [{ kind: "text", text: "Equipe técnica" }] }]] },
        { id: "b6", type: "quote", text: [{ kind: "text", text: "Quem não mede, não gerencia." }], cite: "Ditado de gestão" },
        { id: "b7", type: "callout", variant: "atencao", title: "Atenção", blocks: [{ id: "b7p", type: "paragraph", text: [{ kind: "text", text: "Mudanças de escopo devem ser aprovadas antes de entrar no cronograma." }] }] },
        { id: "b8", type: "divider" },
        { id: "b9", type: "code", language: "texto", code: "Desvio de prazo = data real − data planejada" },
      ],
    },
  ],
};
