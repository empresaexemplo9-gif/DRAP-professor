import { describe, expect, it } from "vitest";
import { canReleaseSeat, csvRow, parseEmailList, seatsUsed, teamGoal } from "@/lib/enterprise";
import { formatCnpj, isValidCnpj } from "@/lib/cpf";

describe("Enterprise", () => {
  it("lê a lista de e-mails colada pelo gestor", () => {
    const { valid, invalid } = parseEmailList("Ana@Empresa.com.br; joao@empresa.com.br\nana@empresa.com.br, <bia@empresa.com.br>  nao-e-email");
    expect(valid).toEqual(["ana@empresa.com.br", "joao@empresa.com.br", "bia@empresa.com.br"]);
    expect(invalid).toEqual(["nao-e-email"]);
  });

  it("conta como vaga usada convites e ativos, não revogados", () => {
    expect(seatsUsed([{ status: "CONVIDADO" }, { status: "ATIVO" }, { status: "REVOGADO" }])).toBe(2);
  });

  it("calcula a meta da equipe e o atraso", () => {
    const learners = [
      { status: "ATIVO" as const, completedTopics: 10, totalTopics: 10 },
      { status: "ATIVO" as const, completedTopics: 5, totalTopics: 10 },
      { status: "ATIVO" as const, completedTopics: 0, totalTopics: 10 },
      { status: "CONVIDADO" as const, completedTopics: 0, totalTopics: 10 },
    ];
    const now = new Date("2026-11-01T00:00:00Z");
    const g = teamGoal(learners, 30, new Date("2026-10-30T00:00:00Z"), now);
    expect(g).toMatchObject({ active: 3, completed: 1, started: 2, completionPercent: 33, averageProgress: 50, reached: true, overdue: false });
    expect(teamGoal(learners, 90, new Date("2026-10-30T00:00:00Z"), now)).toMatchObject({ reached: false, overdue: true });
  });

  it("só libera a vaga de quem ainda não avançou no curso", () => {
    expect(canReleaseSeat({ status: "CONVIDADO", completedTopics: 0 })).toBe(true);
    expect(canReleaseSeat({ status: "ATIVO", completedTopics: 0 })).toBe(true);
    expect(canReleaseSeat({ status: "ATIVO", completedTopics: 1 })).toBe(false);
  });

  it("gera CSV seguro para planilhas", () => {
    expect(csvRow(["Ana", '=HYPERLINK("x")', 50, null])).toBe('"Ana";"\'=HYPERLINK(""x"")";"50";""');
  });

  it("valida e formata CNPJ", () => {
    expect(isValidCnpj("11.222.333/0001-81")).toBe(true);
    expect(isValidCnpj("11.222.333/0001-82")).toBe(false);
    expect(isValidCnpj("00000000000000")).toBe(false);
    expect(formatCnpj("11222333000181")).toBe("11.222.333/0001-81");
  });
});
