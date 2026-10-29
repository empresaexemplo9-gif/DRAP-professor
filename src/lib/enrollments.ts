import type { EnrollmentOrigin, EnrollmentStatus } from "@prisma/client";

export const ENROLLMENT_STATUS_LABEL = {
  ATIVA: { label: "Ativa", tone: "success" },
  CONCLUIDA: { label: "Concluída", tone: "primary" },
  CANCELADA: { label: "Cancelada", tone: "danger" },
  EXPIRADA: { label: "Expirada", tone: "neutral" },
} as const satisfies Record<EnrollmentStatus, { label: string; tone: "neutral" | "primary" | "success" | "danger" }>;

export const ENROLLMENT_ORIGIN_LABEL: Record<EnrollmentOrigin, string> = {
  COMPRA: "Compra (Pix)",
  ASSINATURA: "Assinatura",
  ATRIBUICAO: "Atribuição da equipe",
  CORTESIA: "Cortesia",
  LICENCA: "Licença empresarial",
};

/** Data "AAAA-MM-DD" do formulário → fim do dia em Brasília; vazio = sem prazo. */
export function parseEndDate(value: unknown): Date | null | undefined {
  if (value == null || String(value).trim() === "") return null;
  const s = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return undefined;
  const d = new Date(`${s}T23:59:59-03:00`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/** Valor para <input type="date"> no fuso de Brasília. */
export function toDateInput(date: Date | null | undefined) {
  if (!date) return "";
  return date.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

/** Filtro de matrícula que libera acesso agora: ativa e dentro do prazo (se houver). */
export function activeEnrollmentWhere(now = new Date()) {
  return { status: "ATIVA" as const, OR: [{ endsAt: null }, { endsAt: { gt: now } }] };
}

/** Matrícula ativa cujo prazo já passou deve ser tratada como expirada. */
export function isPastEnd(enrollment: { status: EnrollmentStatus; endsAt: Date | null }, now = new Date()) {
  return enrollment.status === "ATIVA" && enrollment.endsAt != null && enrollment.endsAt <= now;
}
