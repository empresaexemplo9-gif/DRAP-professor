import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import data from "../../content/courses/gestao-de-empresas/lessons.json";
import questions from "../../content/courses/gestao-de-empresas/questions.json";
import { documentSchema } from "@/content-blocks/schema";
import {
  BUSINESS_COURSE,
  BUSINESS_COURSE_PATH,
  BUSINESS_TRACKS,
  businessModuleNumber,
} from "@/lib/courses/business-management";

describe("apostila de Gestão de Empresas", () => {
  it("mantém o original e valida todos os capítulos como conteúdo nativo", () => {
    const source = readFileSync(new URL("../../content/courses/gestao-de-empresas/source.docx", import.meta.url));
    expect(createHash("sha256").update(source).digest("hex")).toBe(data.source.sha256);
    expect(data.source.paragraphs).toBe(2212);
    expect(data.source.tables).toBe(57);
    expect(data.topics).toHaveLength(25);
    for (const topic of [...data.topics, ...data.editorialNotes]) {
      expect(documentSchema.safeParse(topic.document).success, topic.title).toBe(true);
    }
  });

  it("totaliza 200 horas sem somar materiais de consulta à carga horária", () => {
    expect(data.topics.filter((topic) => topic.kind === "module")).toHaveLength(18);
    expect(data.topics.reduce((sum, topic) => sum + topic.durationMinutes, 0)).toBe(12000);
    expect(data.topics.find((topic) => topic.kind === "project")?.durationMinutes).toBe(1320);
    expect(data.topics.filter((topic) => topic.kind === "resource")).toHaveLength(5);
    expect(data.topics.filter((topic) => topic.kind === "resource").every((topic) => topic.durationMinutes === 0)).toBe(
      true,
    );
    expect(BUSINESS_TRACKS.reduce((sum, track) => sum + track.hours, 22)).toBe(200);
  });

  it("preserva tabelas, fórmulas, fontes e as orientações editoriais separadas das aulas", () => {
    const content = JSON.stringify(data.topics);
    expect(content).toContain("Frederick Taylor");
    expect(content).toContain("MAPAN");
    expect(content).toContain("WACC");
    expect(content).toContain("https://www.omie.com.br/");
    expect(data.topics.some((topic) => topic.kind === "staff")).toBe(false);
    expect(data.editorialNotes).toHaveLength(1);
    expect(data.editorialNotes[0]?.slug).toBe("guia-da-equipe");
  });

  it("oferece exatamente as 36 questões fornecidas com opções e gabaritos válidos", () => {
    expect(questions).toHaveLength(36);
    expect(new Set(questions.map((question) => question.id)).size).toBe(36);
    for (let number = 1; number <= 18; number++) {
      expect(questions.filter((question) => question.moduleNumber === number)).toHaveLength(2);
    }
    for (const question of questions) {
      expect(question.options.map((option) => option.id)).toEqual(["a", "b", "c", "d"]);
      expect(question.options.some((option) => option.id === question.correctOption)).toBe(true);
    }
    expect(questions.find((question) => question.id === "ge-q21")?.correctOption).toBe("b");
  });

  it("mantém URLs únicas e associa o quiz ao módulo correto", () => {
    expect(BUSINESS_COURSE_PATH).toBe("/cursos/gestao-e-negocios/gestao-de-empresas");
    expect(new Set(BUSINESS_COURSE.topics.map((topic) => topic.slug)).size).toBe(25);
    for (const topic of BUSINESS_COURSE.topics) {
      expect(topic.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(topic.slug.length).toBeLessThanOrEqual(80);
      expect(businessModuleNumber(topic.slug)).toBe("moduleNumber" in topic ? topic.moduleNumber : null);
    }
    expect(businessModuleNumber("nao-existe")).toBeNull();
  });
});
