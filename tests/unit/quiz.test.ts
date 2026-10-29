import { describe, expect, it } from "vitest";
import { buildAttempt, DEFAULT_QUIZ, finalGrade, grade, quizGate, type QuestionForQuiz } from "@/lib/quiz";

const bank: QuestionForQuiz[] = Array.from({ length: 20 }, (_, i) => ({
  id: `q${i}`,
  code: `C-M1-Q${i}`,
  version: 1,
  objective: `O${(i % 4) + 1}`,
  bloom: "APLICAR",
  kind: "MULTIPLA",
  stem: `Enunciado ${i}`,
  options: ["A", "B", "C", "D"].map((k) => ({ key: k, text: `Alternativa ${k} da ${i}` })),
  correct: "B",
  commentary: "Porque sim.",
}));

describe("montagem da prova", () => {
  it("sorteia 10 de 20 sem repetir, cobrindo todos os objetivos", () => {
    const items = buildAttempt(bank, 10, 42);
    expect(items).toHaveLength(10);
    expect(new Set(items.map((i) => i.questionId)).size).toBe(10);
    expect(new Set(items.map((i) => i.objective)).size).toBe(4);
  });

  it("é reproduzível pela semente e varia entre sementes", () => {
    expect(buildAttempt(bank, 10, 7)).toEqual(buildAttempt(bank, 10, 7));
    expect(buildAttempt(bank, 10, 7).map((i) => i.questionId)).not.toEqual(buildAttempt(bank, 10, 8).map((i) => i.questionId));
  });

  it("embaralha alternativas mantendo o gabarito correto", () => {
    for (const item of buildAttempt(bank, 10, 3)) {
      const right = item.options.find((o) => o.key === item.correct)!;
      expect(right.originalKey).toBe("B");
    }
  });
});

describe("correção", () => {
  it("calcula a nota em % e conta ausentes como erro", () => {
    const items = buildAttempt(bank, 10, 1);
    const answers = Object.fromEntries(items.slice(0, 7).map((i) => [i.questionId, i.correct]));
    const r = grade(items, answers);
    expect(r.score).toBe(70);
    expect(r.hits).toBe(7);
  });

  it("nota final é a média das melhores notas de cada módulo", () => {
    expect(finalGrade([80, 70, 90, 100])).toBe(85);
    expect(finalGrade([80, null])).toBeNull();
  });
});

describe("liberação da prova", () => {
  const now = new Date("2026-10-19T12:00:00Z");
  const base = { hasQuestions: true, passed: false, lessonsDone: 4, lessonsTotal: 4, attemptsInCycle: [], inProgress: false };

  it("exige 80% das aulas concluídas", () => {
    expect(quizGate({ ...base, lessonsDone: 3, lessonsTotal: 4 }, DEFAULT_QUIZ, now)).toMatchObject({ ok: false, reason: "PRESENCA", presencePercent: 75 });
    expect(quizGate({ ...base, lessonsDone: 4, lessonsTotal: 5 }, DEFAULT_QUIZ, now)).toMatchObject({ ok: true, attemptNumber: 1, remaining: 3 });
  });

  it("respeita o intervalo de 24 h entre tentativas", () => {
    const last = new Date(now.getTime() - 23 * 3600_000);
    const g = quizGate({ ...base, attemptsInCycle: [{ submittedAt: last, passed: false }] }, DEFAULT_QUIZ, now);
    expect(g).toMatchObject({ ok: false, reason: "INTERVALO" });
    const later = quizGate({ ...base, attemptsInCycle: [{ submittedAt: new Date(now.getTime() - 25 * 3600_000), passed: false }] }, DEFAULT_QUIZ, now);
    expect(later).toMatchObject({ ok: true, attemptNumber: 2, remaining: 2 });
  });

  it("bloqueia após 3 tentativas no ciclo", () => {
    const old = new Date("2026-10-01T00:00:00Z");
    const attempts = [1, 2, 3].map(() => ({ submittedAt: old, passed: false }));
    expect(quizGate({ ...base, attemptsInCycle: attempts }, DEFAULT_QUIZ, now)).toMatchObject({ ok: false, reason: "CICLO_ESGOTADO" });
  });

  it("não libera nova prova para quem já foi aprovado", () => {
    expect(quizGate({ ...base, passed: true }, DEFAULT_QUIZ, now)).toMatchObject({ ok: false, reason: "APROVADO" });
  });
});
