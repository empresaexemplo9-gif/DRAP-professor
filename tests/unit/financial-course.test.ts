import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import data from "../../content/courses/consultoria-financeira/lessons.json";
import practice from "../../content/courses/consultoria-financeira/practice.json";
import { documentSchema } from "@/content-blocks/schema";
import { FINANCIAL_COURSE, FINANCIAL_TRACKS } from "@/lib/courses/financial-consulting";

describe("conteúdo consolidado de Consultoria Financeira", () => {
  it("preserva os arquivos originais e valida todos os capítulos", () => {
    for (const source of data.sources)
      expect(
        createHash("sha256")
          .update(readFileSync(`content/courses/consultoria-financeira/${source.file}`))
          .digest("hex"),
      ).toBe(source.sha256);
    expect(data.verification).toEqual({ apostilaParagraphs: 700, cadernoParagraphs: 857, tables: 2 });
    expect(data.topics).toHaveLength(21);
    for (const t of data.topics) expect(documentSchema.safeParse(t.document).success, t.title).toBe(true);
  });
  it("totaliza 400 horas, com os módulos e a supervisão do projeto sem duplicação", () => {
    expect(data.topics.reduce((sum, t) => sum + t.durationMinutes, 0)).toBe(24000);
    expect(data.topics.filter((t) => t.kind === "module")).toHaveLength(18);
    expect(data.topics.find((t) => t.kind === "project")?.durationMinutes).toBe(720);
    expect(FINANCIAL_TRACKS.flatMap((t) => t.numbers)).toEqual(Array.from({ length: 18 }, (_, i) => i + 1));
    expect(new Set(FINANCIAL_COURSE.topics.map((t) => t.slug)).size).toBe(21);
  });
  it("importa as 90 questões e 72 atividades de aprofundamento com suas orientações", () => {
    expect(practice).toHaveLength(18);
    expect(practice.flatMap((m) => m.questions)).toHaveLength(162);
    expect(practice.flatMap((m) => m.questions).filter((q) => q.kind === "Questão de estudo")).toHaveLength(90);
    for (const m of practice) {
      expect(m.questions).toHaveLength(9);
      expect(m.questions.every((q) => q.prompt && q.guidance)).toBe(true);
    }
    expect(
      data.topics
        .filter((t) => t.kind === "module")
        .every((t) => t.document.sections.some((s) => s.title.startsWith("Exercício resolvido"))),
    ).toBe(true);
  });
  it("preserva a resolução original e registra a conferência aritmética do VPL", () => {
    const presentValue = (45000 * (1 - Math.pow(1.1, -3))) / 0.1 - 100000;
    expect(presentValue).toBeCloseTo(11908.34, 2);
    const module7 = JSON.stringify(data.topics.find((t) => "moduleNumber" in t && t.moduleNumber === 7));
    expect(module7).toContain("11.907");
    expect(module7).toContain("11.908,34");
    expect(data.editorialNotes).toHaveLength(1);
  });
});
