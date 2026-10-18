import { z } from "zod";
import type { LevelKind } from "@prisma/client";

/** Metadados e comportamento de cada nível (docs/ARQUITETURA.md, seção 6). */
export const LEVELS: Record<
  LevelKind,
  { label: string; slug: string; singular: string; description: string; order: number }
> = {
  MENTORIA: {
    label: "Mentorias",
    slug: "mentorias",
    singular: "Mentoria",
    description: "Encontros individuais ou em grupo, plano de desenvolvimento e registro de evolução.",
    order: 1,
  },
  TREINAMENTO: {
    label: "Treinamentos",
    slug: "treinamentos",
    singular: "Treinamento",
    description: "Trilhas para equipes e empresas, com metas e prazos.",
    order: 2,
  },
  CURSO: {
    label: "Cursos",
    slug: "cursos",
    singular: "Curso",
    description: "Grade completa com módulos sequenciais, avaliação final e certificado.",
    order: 3,
  },
  AULA: {
    label: "Aulas",
    slug: "aulas",
    singular: "Aula",
    description: "Aulas avulsas, gravadas ou ao vivo.",
    order: 4,
  },
  CAPACITACAO: {
    label: "Capacitações",
    slug: "capacitacoes",
    singular: "Capacitação",
    description: "Programas com carga horária, requisitos de frequência e aprovação.",
    order: 5,
  },
};

export const LEVEL_KINDS = Object.keys(LEVELS) as LevelKind[];

const minScore = z.coerce.number().int().min(0).max(100);
/** Checkbox de formulário: ausente = falso. */
const bool = z.preprocess((v) => v === true || v === "on" || v === "true", z.boolean());

/** Configuração específica por nível, guardada em Module.levelConfig. */
export const levelConfigSchemas = {
  MENTORIA: z.object({
    sessionFormat: z.enum(["INDIVIDUAL", "GRUPO"]).default("INDIVIDUAL"),
    plannedSessions: z.coerce.number().int().min(1).max(200).default(4),
    sessionMinutes: z.coerce.number().int().min(15).max(480).default(60),
    videoCallUrl: z.string().url().or(z.literal("")).default(""),
  }),
  TREINAMENTO: z.object({
    targetAudience: z.string().max(200).default(""),
    deadlineDays: z.coerce.number().int().min(1).max(3650).default(30),
    teamGoalPercent: minScore.default(90),
  }),
  CURSO: z.object({
    sequential: bool,
    finalExam: bool,
    minScore: minScore.default(70),
  }),
  AULA: z.object({
    format: z.enum(["GRAVADA", "AO_VIVO"]).default("GRAVADA"),
    liveAt: z.string().default(""),
    liveUrl: z.string().url().or(z.literal("")).default(""),
  }),
  CAPACITACAO: z.object({
    minAttendancePercent: minScore.default(75),
    minScore: minScore.default(70),
  }),
} satisfies Record<LevelKind, z.ZodTypeAny>;

export type LevelConfig<K extends LevelKind> = z.infer<(typeof levelConfigSchemas)[K]>;

export function parseLevelConfig<K extends LevelKind>(kind: K, raw: unknown): LevelConfig<K> {
  return levelConfigSchemas[kind].parse(raw ?? {}) as LevelConfig<K>;
}

export function formatWorkload(minutes: number): string {
  if (!minutes) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}
