import { describe, expect, it } from "vitest";
import { CourseFormatError, parseCourse } from "@/content-import/course";
import { markdownToBlocks } from "@/content-import/markdown";

function question(n: number, objective = "O1", caso = true) {
  return `### Q${String(n).padStart(2, "0")} | ${objective} | aplicar${caso ? " | caso" : ""}
Situação ${n}: qual a melhor conduta?
A) Opção um ${n}
B) Opção dois ${n}
C) Opção três ${n}
D) Opção quatro ${n}
Gabarito: B
Comentário: Explicação ${n}.`;
}

function course({ questions = 20, hours = "2" } = {}) {
  return `---
codigo: TST-001
titulo: Curso de teste
segmento: Testes
carga_horaria: ${hours}
questoes_por_prova: 10
instrutor: Fulano
objetivo_geral: Testar
---
## Bibliografia
- Livro A

# M1 — Primeiro módulo
Objetivos:
- O1 (aplicar): Aplicar o conceito.

## Aula 1 — Introdução [40 min]
Texto da aula com **negrito**.

### Subtítulo
- item 1
- item 2

> [!DICA] Lembre-se
> Faça pausas.

| A | B |
|---|---|
| 1 | 2 |

## Material de apoio — Checklist [20 min]
- [ ] Passo 1
- [x] Passo 2

## Atividade prática — Exercício [40 min]
Faça o exercício.

## Questões
${Array.from({ length: questions }, (_, i) => question(i + 1)).join("\n\n")}
`;
}

describe("leitor de cursos em Markdown", () => {
  it("lê ficha, módulos, aulas, material, atividade e questões", () => {
    const c = parseCourse(course());
    expect(c.code).toBe("TST-001");
    expect(c.intro[0]!.title).toBe("Bibliografia");
    expect(c.modules).toHaveLength(1);
    const m = c.modules[0]!;
    expect(m.objectives).toEqual([{ code: "O1", bloom: "aplicar", text: "Aplicar o conceito." }]);
    expect(m.document.sections.map((s) => s.kind)).toEqual(["section", "material", "atividade"]);
    expect(m.minutes).toBe(120);
    expect(m.questions).toHaveLength(20);
    expect(m.questions[0]).toMatchObject({ code: "TST001-M1-Q01", correct: "B", isCase: true });
  });

  it("converte Markdown em blocos sem estilo", () => {
    const blocks = markdownToBlocks("Texto\n\n### T\n- a\n- b\n\n> [!ATENCAO] Cuidado\n> Não faça isso.\n\n| x | y |\n|---|---|\n| 1 | 2 |", "t");
    expect(blocks.map((b) => b.type)).toEqual(["paragraph", "heading", "list", "callout", "table"]);
  });

  it("recusa banco com menos de 2x as questões aplicadas", () => {
    expect(() => parseCourse(course({ questions: 19 }))).toThrow(CourseFormatError);
  });

  it("recusa carga horária inflada", () => {
    expect(() => parseCourse(course({ hours: "3" }))).toThrow(/carga horária/);
  });
});
