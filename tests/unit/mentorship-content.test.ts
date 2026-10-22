import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import pequenas from "../../content/courses/mentoria-financeira-pequenas/lessons.json";
import pequenasQuestions from "../../content/courses/mentoria-financeira-pequenas/questions.json";
import medias from "../../content/courses/mentoria-financeira-medias/lessons.json";
import mediasGuide from "../../content/courses/mentoria-financeira-medias/teacher-guide.json";
import { documentSchema } from "@/content-blocks/schema";
import { MENTORSHIP_CONTENT, mentorshipDownloads } from "@/lib/courses/mentorship-content";
import { mentorshipQuestions, mentorshipTeacherGuide } from "@/lib/courses/mentorship-questions";

const sha = (file: string) => createHash("sha256").update(readFileSync(new URL(`../../${file}`, import.meta.url))).digest("hex");

describe("apostilas das mentorias financeiras", () => {
  it("preserva os originais e valida todos os capítulos como conteúdo nativo", () => {
    expect(sha("content/courses/mentoria-financeira-pequenas/source.docx")).toBe(pequenas.source.sha256);
    expect(sha("content/courses/mentoria-financeira-medias/source.md")).toBe(medias.source.sha256);
    for (const topic of [...pequenas.topics, ...medias.topics]) expect(documentSchema.safeParse(topic.document).success, topic.title).toBe(true);
    expect(documentSchema.safeParse(mediasGuide).success).toBe(true);
  });

  it("respeita a carga horária de cada apostila", () => {
    const total = (topics: { durationMinutes: number }[]) => topics.reduce((sum, t) => sum + t.durationMinutes, 0);
    expect(total(pequenas.topics)).toBe(MENTORSHIP_CONTENT.pequenas!.hours * 60);
    expect(total(medias.topics)).toBe(MENTORSHIP_CONTENT.medias!.hours * 60);
    expect(pequenas.topics.filter((t) => t.kind === "module")).toHaveLength(8);
    expect(medias.topics.filter((t) => t.kind === "module")).toHaveLength(8);
    expect(medias.topics.find((t) => t.kind === "project")?.durationMinutes).toBe(16 * 60);
  });

  it("transforma a avaliação de cada módulo das pequenas empresas em 5 questões com gabarito", () => {
    expect(pequenasQuestions).toHaveLength(40);
    expect(mentorshipQuestions({ key: "pequenas" }, "modulo-1-diagnostico-financeiro-e-governanca").map((q) => q.correctOption).join("")).toBe("bbacb");
    expect(mentorshipQuestions({ key: "pequenas" }, "apresentacao")).toHaveLength(0);
    expect(mentorshipQuestions({ key: "medias" }, "modulo-1-medias-empresas-governanca-e-funcao-financeira")).toHaveLength(0);
  });

  it("mantém o Apêndice A das médias empresas restrito à equipe docente", () => {
    const published = JSON.stringify(medias.topics);
    expect(published).not.toContain("Gabarito das questões objetivas");
    expect(published).not.toContain("Critérios das questões discursivas");
    expect(published).toContain("Prova do Módulo 8");
    const slug = "modulo-2-demonstracoes-financeiras-e-analise-integrada";
    expect(mentorshipTeacherGuide({ key: "medias" }, slug, false)).toBeNull();
    expect(mentorshipTeacherGuide({ key: "medias" }, slug, true)?.sections.length).toBeGreaterThan(0);
    expect(mentorshipDownloads({ key: "medias" }, false)).toHaveLength(0);
    expect(mentorshipDownloads({ key: "medias" }, true).map((d) => d.id)).toEqual(["pdf", "md"]);
    expect(mentorshipDownloads({ key: "pequenas" }, false).map((d) => d.id)).toEqual(["pdf", "docx"]);
  });
});
