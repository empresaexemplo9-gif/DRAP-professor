import { describe, expect, it } from "vitest";
import { allocate, buildExam, buildSchedule, gradeExam, nextReview, recommendations, updateStreak, walkTree, type BankQuestion } from "@/lib/cpa/engine";

const bank: BankQuestion[] = Array.from({ length: 80 }, (_, i) => ({
  code: `Q${i}`,
  macro: (i % 4) + 1,
  items: [`${(i % 4) + 1}.${i % 7}`],
  type: "conceito",
  difficulty: 1,
  stem: `Enunciado ${i}`,
  options: ["A", "B", "C", "D"].map((k) => ({ key: k, text: `${k}${i}`, justification: "porque sim, justificativa" })),
  correct: "B",
  explanation: "x",
}));

describe("motor de simulados do CPA", () => {
  it("distribui exatamente pela proporção oficial", () => {
    expect(allocate(50, { "1": 20, "2": 40, "3": 30, "4": 10 })).toEqual({ "1": 10, "2": 20, "3": 15, "4": 5 });
    const a = allocate(30, { "1": 20, "2": 40, "3": 30, "4": 10 });
    expect(Object.values(a).reduce((x, y) => x + y, 0)).toBe(30);
  });

  it("monta tentativa proporcional, sem repetir questão, com gabarito remapeado", () => {
    const exam = buildExam({ bank, count: 20, seed: 7 });
    expect(exam).toHaveLength(20);
    expect(new Set(exam.map((e) => e.code)).size).toBe(20);
    expect(exam.filter((e) => e.macro === 2)).toHaveLength(8);
    for (const e of exam) expect(e.options.find((o) => o.key === e.correct)!.originalKey).toBe("B");
  });

  it("respeita lista fixa e filtro de macrotema", () => {
    expect(buildExam({ bank, count: 3, seed: 1, fixedCodes: ["Q1", "Q2", "Q3"] }).map((e) => e.code).sort()).toEqual(["Q1", "Q2", "Q3"]);
    expect(buildExam({ bank, count: 10, seed: 1, macros: [3] }).every((e) => e.macro === 3)).toBe(true);
  });

  it("prefere questões ainda não vistas", () => {
    const seen = new Set(bank.filter((q) => q.macro === 1).slice(0, 15).map((q) => q.code));
    const exam = buildExam({ bank, count: 10, seed: 3, macros: [1], seen });
    expect(exam.filter((e) => seen.has(e.code))).toHaveLength(5);
  });

  it("corrige e relata por macrotema, microtema, tempo e recomendações", () => {
    const exam = buildExam({ bank, count: 8, seed: 9 });
    const answers = Object.fromEntries(exam.map((e, i) => [e.code, i < 6 ? e.correct : e.options.find((o) => o.key !== e.correct)!.key]));
    delete answers[exam[7]!.code];
    const r = gradeExam(exam, answers, Object.fromEntries(exam.map((e) => [e.code, 30])));
    expect(r).toMatchObject({ total: 8, hits: 6, percent: 75, seconds: 240, avgSeconds: 30 });
    expect(r.wrong).toHaveLength(1);
    expect(r.blank).toHaveLength(1);
    expect(r.byMacro.reduce((a, m) => a + m.total, 0)).toBe(8);
    expect(recommendations(r).length).toBeGreaterThan(0);
  });

  it("revisão espaçada avança no acerto e volta ao início no erro", () => {
    const now = new Date("2026-10-29T12:00:00Z");
    let s = nextReview({ stage: 0, lapses: 0 }, true, now);
    expect(s.dueAt.toISOString().slice(0, 10)).toBe("2026-10-30");
    s = nextReview(s, true, now);
    expect(s.dueAt.toISOString().slice(0, 10)).toBe("2026-11-01");
    s = nextReview(s, false, now);
    expect(s).toMatchObject({ stage: 0, lapses: 1 });
    expect(s.dueAt.toISOString().slice(0, 10)).toBe("2026-10-30");
  });

  it("cronograma respeita dias e horas disponíveis e avisa quando não cabe antes da prova", () => {
    const lessons = Array.from({ length: 12 }, (_, i) => ({ code: `L${i}`, minutes: 60, macro: i < 6 ? 1 : 2 }));
    const s = buildSchedule(lessons, { examDate: new Date("2026-11-03"), hoursPerWeek: 4, studyDays: [1, 3] }, new Date("2026-11-02"));
    expect(s.days.every((d) => [1, 3].includes(new Date(d.date).getUTCDay()))).toBe(true);
    expect(s.days.flatMap((d) => d.lessons)).toHaveLength(12);
    expect(s.fitsBeforeExam).toBe(false);
    expect(s.days.some((d) => d.exam)).toBe(true);
  });

  it("sequência de estudo", () => {
    expect(updateStreak(new Date("2026-10-28"), 3, new Date("2026-10-29"))).toBe(4);
    expect(updateStreak(new Date("2026-10-29"), 3, new Date("2026-10-29"))).toBe(3);
    expect(updateStreak(new Date("2026-10-20"), 3, new Date("2026-10-29"))).toBe(1);
  });

  it("percorre árvore de decisão somando pontos e competências", () => {
    const g = {
      start: "a",
      nodes: {
        a: { text: "início", choices: [{ label: "investigar", next: "b", score: 2, feedback: "bom", competence: "Diagnóstico" }, { label: "vender", next: "f", score: -2, feedback: "ruim" }] },
        b: { text: "meio", choices: [{ label: "explicar", next: "ok", score: 1, feedback: "ok", competence: "Transparência" }] },
        ok: { text: "fim", choices: [], outcome: "ADEQUADO" },
        f: { text: "fim ruim", choices: [], outcome: "INADEQUADO" },
      },
    };
    const r = walkTree(g, [0, 0]);
    expect(r).toMatchObject({ node: "ok", score: 3, finished: true, competences: ["Diagnóstico", "Transparência"] });
    expect(() => walkTree(g, [5])).toThrow();
  });
});
