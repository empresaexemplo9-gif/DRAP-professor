import { describe, expect, it } from "vitest";
import { can, navFor } from "@/lib/rbac";

const labels = (roles: Parameters<typeof navFor>[0]) => navFor(roles).map((i) => i.label);

describe("matriz de permissões e abas por perfil", () => {
  it("aluno vê só as abas de estudo", () => {
    expect(labels(["ALUNO"])).toEqual(["Início", "Meu Aprendizado", "Catálogo", "Agenda", "Fórum", "Certificados"]);
  });

  it("pedagógico gerencia conteúdo e biblioteca, mas não financeiro, usuários ou tema", () => {
    const l = labels(["PEDAGOGICO"]);
    expect(l).toContain("Conteúdo");
    expect(l).toContain("Biblioteca de Materiais");
    expect(l).not.toContain("Financeiro");
    expect(l).not.toContain("Usuários");
    expect(l).not.toContain("Configurações e Tema");
  });

  it("instrutor modera fórum mas não publica", () => {
    expect(can(["INSTRUTOR"], "forum:moderate")).toBe(true);
    expect(can(["INSTRUTOR"], "content:publish")).toBe(false);
  });

  it("administrador vê todas as abas", () => {
    expect(labels(["ADMIN"])).toHaveLength(11);
  });

  it("papéis combinados somam permissões", () => {
    expect(can(["INSTRUTOR", "PEDAGOGICO"], "content:publish")).toBe(true);
  });
});
