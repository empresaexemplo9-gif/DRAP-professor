import { describe, expect, it } from "vitest";
import { checkCalculation, evaluate, parseBrNumber } from "@/lib/cpa/expr";

describe("avaliador de cálculos do CPA", () => {
  it("respeita precedência, potência à direita e funções", () => {
    expect(evaluate("2 + 3 * 4")).toBe(14);
    expect(evaluate("2 ^ 3 ^ 2")).toBe(512);
    expect(evaluate("-(1 + 2) * 2")).toBe(-6);
    expect(evaluate("round(1000 * (1 + 0.01) ^ 12, 2)")).toBe(1126.83);
    expect(evaluate("pow(1.1, 2)")).toBeCloseTo(1.21);
  });

  it("recusa qualquer coisa além de aritmética", () => {
    expect(() => evaluate("process.exit(1)")).toThrow();
    expect(() => evaluate("constructor")).toThrow();
    expect(() => evaluate("1 +")).toThrow();
  });

  it("confere taxa real pela fórmula de Fisher", () => {
    expect(checkCalculation({ expr: "((1 + 0.12) / (1 + 0.045) - 1) * 100", expected: "7.18", shown: "7,18%" })).toBeNull();
    expect(checkCalculation({ expr: "((1 + 0.12) / (1 + 0.045) - 1) * 100", expected: "7.50", shown: "7,50%" })).toMatch(/esperado/);
    expect(checkCalculation({ expr: "1000 * 1.01 ^ 12", expected: "1126.83", shown: "R$ 1.126,83" })).toBeNull();
    expect(checkCalculation({ expr: "1000 * 1.01 ^ 12", expected: "1126.83", shown: "R$ 1.162,83" })).toMatch(/exibido/);
  });

  it("lê números no formato brasileiro", () => {
    expect(parseBrNumber("R$ 1.234,56")).toBe(1234.56);
    expect(parseBrNumber("7,18%")).toBe(7.18);
  });
});
