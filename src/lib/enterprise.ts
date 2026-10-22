import type { LicenseAssignmentStatus } from "@prisma/client";

/** Regras puras da versão Enterprise (sem banco), testadas em tests/unit/enterprise.test.ts. */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Lista colada pelo gestor (vírgula, ponto e vírgula, espaço ou quebra de linha) → e-mails únicos e inválidos. */
export function parseEmailList(raw: string) {
  const valid: string[] = [];
  const invalid: string[] = [];
  for (const piece of raw.split(/[\s,;]+/)) {
    const email = piece.trim().toLowerCase().replace(/^<|>$/g, "");
    if (!email) continue;
    if (!EMAIL.test(email)) invalid.push(piece.trim());
    else if (!valid.includes(email)) valid.push(email);
  }
  return { valid, invalid };
}

/** Vagas consumidas: convites pendentes e colaboradores ativos. */
export function seatsUsed(assignments: { status: LicenseAssignmentStatus }[]) {
  return assignments.filter((a) => a.status !== "REVOGADO").length;
}

export const ASSIGNMENT_STATUS_LABEL = {
  CONVIDADO: { label: "Convidado", tone: "warning" },
  ATIVO: { label: "Ativo", tone: "success" },
  REVOGADO: { label: "Revogado", tone: "neutral" },
} as const satisfies Record<LicenseAssignmentStatus, { label: string; tone: "neutral" | "success" | "warning" }>;

export type LearnerProgress = { status: LicenseAssignmentStatus; completedTopics: number; totalTopics: number };

export function progressPercent(p: { completedTopics: number; totalTopics: number }) {
  return p.totalTopics ? Math.round((p.completedTopics / p.totalTopics) * 100) : 0;
}

/** Meta da equipe: % dos colaboradores ativos que concluíram o curso, comparado à meta do contrato. */
export function teamGoal(learners: LearnerProgress[], goalPercent: number, dueAt: Date | null, now = new Date()) {
  const active = learners.filter((l) => l.status === "ATIVO");
  const completed = active.filter((l) => l.totalTopics > 0 && l.completedTopics >= l.totalTopics).length;
  const started = active.filter((l) => l.completedTopics > 0).length;
  const completionPercent = active.length ? Math.round((completed / active.length) * 100) : 0;
  const averageProgress = active.length ? Math.round(active.reduce((n, l) => n + progressPercent(l), 0) / active.length) : 0;
  const reached = active.length > 0 && completionPercent >= goalPercent;
  const overdue = Boolean(dueAt && dueAt < now && !reached);
  return { active: active.length, completed, started, completionPercent, averageProgress, reached, overdue };
}

/** Uma vaga só pode ser liberada para outra pessoa enquanto o colaborador não concluiu nenhum assunto. */
export function canReleaseSeat(a: { status: LicenseAssignmentStatus; completedTopics: number }) {
  return a.status === "CONVIDADO" || (a.status === "ATIVO" && a.completedTopics === 0);
}

/** Linha de CSV com aspas e proteção contra injeção de fórmula em planilhas. */
export function csvRow(values: (string | number | null | undefined)[]) {
  return values
    .map((v) => {
      let s = v == null ? "" : String(v);
      if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
      return `"${s.replace(/"/g, '""')}"`;
    })
    .join(";");
}
