/**
 * Regras de prova do padrão de curso (arquivo 01 — "Padrão de curso e avaliação"), em funções puras.
 *   nota mínima 70% · 3 tentativas por ciclo · 24 h entre tentativas · 2 min por questão
 *   presença mínima de 80% das aulas · questões sorteadas do banco · alternativas embaralhadas
 *   após 3 reprovações o aluno revisa o módulo (presença zerada) e ganha novo ciclo de 3 tentativas
 */

export type QuizConfig = {
  questionsPerQuiz: number;
  passPercent: number;
  maxAttempts: number;
  retryHours: number;
  minutesPerQuestion: number;
  minLessonsPercent: number;
};

export const DEFAULT_QUIZ: QuizConfig = {
  questionsPerQuiz: 10,
  passPercent: 70,
  maxAttempts: 3,
  retryHours: 24,
  minutesPerQuestion: 2,
  minLessonsPercent: 80,
};

export type QuestionForQuiz = {
  id: string;
  code: string;
  version: number;
  objective: string;
  bloom: string;
  kind: string;
  isCase?: boolean;
  stem: string;
  options: { key: string; text: string }[];
  correct: string;
  commentary: string;
};

/** Item congelado na tentativa: alternativas já na ordem exibida, com letras reatribuídas. */
export type AttemptItem = {
  questionId: string;
  code: string;
  version: number;
  objective: string;
  bloom: string;
  kind: string;
  isCase?: boolean;
  stem: string;
  options: { key: string; text: string; originalKey: string }[];
  correct: string;
  commentary: string;
};

/** Gerador pseudoaleatório determinístico (mulberry32) — sorteio reproduzível pela semente. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(list: readonly T[], rand: () => number): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

const LETTERS = ["A", "B", "C", "D", "E", "F"];

/**
 * Sorteia as questões cobrindo os objetivos do módulo de forma equilibrada (rodízio por objetivo)
 * e embaralha a ordem das questões e das alternativas.
 */
export function buildAttempt(bank: QuestionForQuiz[], count: number, seed: number): AttemptItem[] {
  const rand = rng(seed);
  const byObjective = new Map<string, QuestionForQuiz[]>();
  for (const q of shuffle(bank, rand)) byObjective.set(q.objective, [...(byObjective.get(q.objective) ?? []), q]);
  const queues = shuffle([...byObjective.values()], rand);
  const picked: QuestionForQuiz[] = [];
  while (picked.length < Math.min(count, bank.length)) {
    for (const queue of queues) {
      const q = queue.shift();
      if (q && picked.length < count) picked.push(q);
    }
  }
  return shuffle(picked, rand).map((q) => {
    const opts = shuffle(q.options, rand).map((o, i) => ({ key: LETTERS[i]!, text: o.text, originalKey: o.key }));
    return {
      questionId: q.id,
      code: q.code,
      version: q.version,
      objective: q.objective,
      bloom: q.bloom,
      kind: q.kind,
      isCase: Boolean(q.isCase),
      stem: q.stem,
      options: opts,
      correct: opts.find((o) => o.originalKey === q.correct)!.key,
      commentary: q.commentary,
    };
  });
}

/** Nota em % (0–100), com uma casa decimal. Respostas ausentes contam como erro. */
export function grade(items: AttemptItem[], answers: Record<string, string>) {
  const results = items.map((it) => ({ questionId: it.questionId, answer: answers[it.questionId] ?? null, correct: answers[it.questionId] === it.correct }));
  const hits = results.filter((r) => r.correct).length;
  const score = items.length ? Math.round((hits / items.length) * 1000) / 10 : 0;
  return { score, hits, total: items.length, results };
}

export type QuizState = {
  hasQuestions: boolean;
  passed: boolean;
  lessonsDone: number;
  lessonsTotal: number;
  attemptsInCycle: { submittedAt: Date | null; passed: boolean | null }[];
  inProgress: boolean;
};

export type QuizGate =
  | { ok: true; attemptNumber: number; remaining: number }
  | { ok: false; reason: "SEM_QUESTOES" | "APROVADO" | "PRESENCA" | "INTERVALO" | "CICLO_ESGOTADO" | "EM_ANDAMENTO"; nextAt?: Date; presencePercent?: number };

export function presencePercent(done: number, total: number): number {
  return total ? Math.round((done / total) * 100) : 0;
}

/** Decide se o aluno pode iniciar uma tentativa agora. */
export function quizGate(state: QuizState, cfg: QuizConfig, now: Date): QuizGate {
  if (!state.hasQuestions) return { ok: false, reason: "SEM_QUESTOES" };
  if (state.passed) return { ok: false, reason: "APROVADO" };
  if (state.inProgress) return { ok: false, reason: "EM_ANDAMENTO" };
  const done = state.attemptsInCycle.filter((a) => a.submittedAt);
  if (done.length >= cfg.maxAttempts) return { ok: false, reason: "CICLO_ESGOTADO" };
  const pct = presencePercent(state.lessonsDone, state.lessonsTotal);
  if (pct < cfg.minLessonsPercent) return { ok: false, reason: "PRESENCA", presencePercent: pct };
  const last = done.map((a) => a.submittedAt!.getTime()).sort((a, b) => b - a)[0];
  if (last !== undefined) {
    const nextAt = new Date(last + cfg.retryHours * 3600_000);
    if (nextAt > now) return { ok: false, reason: "INTERVALO", nextAt };
  }
  return { ok: true, attemptNumber: done.length + 1, remaining: cfg.maxAttempts - done.length };
}

/** Nota final do curso: média simples da melhor tentativa de cada módulo (padrão do arquivo 01). */
export function finalGrade(bestScores: (number | null | undefined)[]): number | null {
  if (!bestScores.length || bestScores.some((s) => s === null || s === undefined)) return null;
  return Math.round(((bestScores as number[]).reduce((a, b) => a + b, 0) / bestScores.length) * 10) / 10;
}

export const GATE_MESSAGES: Record<Exclude<QuizGate, { ok: true }>["reason"], string> = {
  SEM_QUESTOES: "Este módulo ainda não tem prova.",
  APROVADO: "Você já foi aprovado neste módulo.",
  PRESENCA: "Conclua pelo menos 80% das aulas do módulo para liberar a prova.",
  INTERVALO: "Aguarde o intervalo de 24 h entre tentativas e estude o gabarito comentado.",
  CICLO_ESGOTADO: "Você usou as 3 tentativas. Revise as aulas do módulo para liberar mais 3 tentativas.",
  EM_ANDAMENTO: "Há uma prova em andamento.",
};
