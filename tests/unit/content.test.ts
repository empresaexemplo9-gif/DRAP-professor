import { describe, expect, it } from "vitest";
import { parseInline, serializeInline } from "@/content-blocks/inline";
import { documentSchema, parseDocument } from "@/content-blocks/schema";
import { SAMPLE_DOCUMENT } from "@/content-blocks/sample";
import { slugify } from "@/lib/slug";
import { isValidCpf, maskCpf } from "@/lib/cpf";
import { parseLevelConfig } from "@/lib/levels";

describe("marcação inline", () => {
  it("converte negrito, itálico, código e links", () => {
    expect(parseInline("a **b** *c* `d` [e](https://x.com)")).toEqual([
      { kind: "text", text: "a " },
      { kind: "text", text: "b", marks: ["bold"] },
      { kind: "text", text: " " },
      { kind: "text", text: "c", marks: ["italic"] },
      { kind: "text", text: " " },
      { kind: "text", text: "d", marks: ["code"] },
      { kind: "text", text: " " },
      { kind: "link", text: "e", href: "https://x.com" },
    ]);
  });

  it("nunca gera link javascript:", () => {
    expect(parseInline("[x](javascript:alert(1))")).toEqual([{ kind: "text", text: "x" }, { kind: "text", text: ")" }]);
  });

  it("é reversível", () => {
    const src = "Texto **forte** e [link](/cursos).";
    expect(serializeInline(parseInline(src))).toBe(src);
  });
});

describe("schema de blocos", () => {
  it("valida o documento de exemplo", () => {
    expect(documentSchema.safeParse(SAMPLE_DOCUMENT).success).toBe(true);
  });

  it("rejeita campos de estilo e HTML", () => {
    const bad = structuredClone(SAMPLE_DOCUMENT) as unknown as { sections: { blocks: Record<string, unknown>[] }[] };
    bad.sections[0]!.blocks.push({ id: "x", type: "html", html: "<b style='color:red'>oi</b>" });
    expect(documentSchema.safeParse(bad).success).toBe(false);
  });

  it("descarta propriedades desconhecidas (ex.: cor do arquivo original)", () => {
    const withStyle = structuredClone(SAMPLE_DOCUMENT) as unknown as { sections: { blocks: Record<string, unknown>[] }[] };
    withStyle.sections[0]!.blocks[0]!.color = "#FF0000";
    const parsed = documentSchema.parse(withStyle);
    expect(JSON.stringify(parsed)).not.toContain("#FF0000");
  });

  it("documento inválido vira documento vazio, sem quebrar a página", () => {
    expect(parseDocument({ foo: 1 }, "T").sections).toHaveLength(1);
  });
});

describe("utilitários", () => {
  it("gera slugs sem acentos", () => {
    expect(slugify("Gestão de Safra — Módulo 1")).toBe("gestao-de-safra-modulo-1");
  });

  it("valida e mascara CPF", () => {
    expect(isValidCpf("529.982.247-25")).toBe(true);
    expect(isValidCpf("111.111.111-11")).toBe(false);
    expect(maskCpf("52998224725")).toBe("***.982.247-**");
  });

  it("configuração de nível usa padrões e trata checkbox ausente como falso", () => {
    expect(parseLevelConfig("CAPACITACAO", {})).toEqual({ minAttendancePercent: 75, minScore: 70 });
    expect(parseLevelConfig("CURSO", { minScore: "80" })).toEqual({ sequential: false, finalExam: false, minScore: 80 });
  });
});
