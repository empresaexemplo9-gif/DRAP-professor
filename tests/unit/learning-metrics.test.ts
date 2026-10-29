import { describe, expect, it } from "vitest";
import { average, hakeGain, itemStatistics, pointBiserial, type ItemResponse } from "@/lib/learning-metrics";

describe("métricas de aprendizagem", () => {
  it("correlação ponto-bisserial confere com o cálculo manual", () => {
    // Acertadores com notas 80 e 90; erradores com 40 e 50: média 1 = 85, média 0 = 45, dp = 21,65, p = 0,5
    const r = pointBiserial([1, 1, 0, 0], [80, 90, 40, 50])!;
    expect(r).toBeCloseTo(((85 - 45) / Math.sqrt(((80 - 65) ** 2 + (90 - 65) ** 2 + (40 - 65) ** 2 + (50 - 65) ** 2) / 4)) * 0.5, 6);
    expect(r).toBeGreaterThan(0.9);
  });

  it("ganho normalizado de Hake", () => {
    expect(hakeGain(40, 70)).toBe(0.5);
    expect(hakeGain(60, 60)).toBe(0);
    expect(hakeGain(100, 100)).toBeNull();
  });

  it("aponta questão com gabarito suspeito (discriminação negativa)", () => {
    const responses: ItemResponse[] = [];
    // 12 alunos: os melhores (nota alta) erram o item; os piores acertam.
    for (let i = 0; i < 12; i++) {
      const strong = i < 6;
      responses.push({ attemptId: `a${i}`, questionId: "suspeita", chosenOriginalKey: strong ? "C" : "B", correct: !strong, attemptScore: strong ? 90 : 40, attemptSize: 10 });
    }
    const [s] = itemStatistics(responses);
    expect(s!.p).toBe(0.5);
    expect(s!.discrimination!).toBeLessThan(0);
    expect(s!.flags).toContain("DISCRIMINACAO_NEGATIVA");
    expect(s!.distractors).toEqual({ C: 6, B: 6 });
  });

  it("aponta questão fácil ou difícil demais e amostra pequena", () => {
    const easy: ItemResponse[] = Array.from({ length: 10 }, (_, i) => ({ attemptId: `e${i}`, questionId: "facil", chosenOriginalKey: "A", correct: i !== 0, attemptScore: 70 + i, attemptSize: 10 }));
    expect(itemStatistics(easy)[0]!.flags).toContain("MUITO_FACIL");
    const small = easy.slice(0, 3);
    expect(itemStatistics(small)[0]!.flags).toEqual(["AMOSTRA_INSUFICIENTE"]);
  });

  it("média ignora valores ausentes", () => {
    expect(average([10, null, 20])).toBe(15);
    expect(average([])).toBeNull();
  });
});
