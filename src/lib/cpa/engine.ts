import { rng, shuffle } from "@/lib/quiz";

/** Motor do preparatório CPA: montagem de simulados, correção, relatório, revisão espaçada e cronograma. */

export const OFFICIAL_WEIGHTS: Record<string, number> = { "1": 20, "2": 40, "3": 30, "4": 10 };

export type BankQuestion = {
  code: string;
  macro: number;
  items: string[];
  type: string;
  difficulty: number;
  stem: string;
  options: { key: string; text: string; justification: string }[];
  correct: string;
  explanation: string;
};

export type ExamItem = {
  code: string;
  macro: number;
  items: string[];
  type: string;
  difficulty: number;
  stem: string;
  options: { key: string; text: string; justification: string; originalKey: string }[];
  correct: string;
  explanation: string;
};

const LETTERS = ["A", "B", "C", "D", "E"];

/** Quantas questões de cada macrotema, pelo método dos maiores restos (soma exata). */
export function allocate(total: number, weights: Record<string, number>): Record<string, number> {
  const entries = Object.entries(weights).filter(([, w]) => w > 0);
  const sum = entries.reduce((a, [, w]) => a + w, 0);
  const raw = entries.map(([k, w]) => ({ k, exact: (total * w) / sum }));
  const out = Object.fromEntries(raw.map((r) => [r.k, Math.floor(r.exact)]));
  let left = total - Object.values(out).reduce((a, b) => a + b, 0);
  for (const r of [...raw].sort((a, b) => b.exact - Math.floor(b.exact) - (a.exact - Math.floor(a.exact)))) {
    if (left-- <= 0) break;
    out[r.k]!++;
  }
  return out;
}

function toItem(q: BankQuestion, rand: () => number): ExamItem {
  const opts = shuffle(q.options, rand).map((o, i) => ({ ...o, key: LETTERS[i]!, originalKey: o.key }));
  return { ...q, options: opts, correct: opts.find((o) => o.originalKey === q.correct)!.key };
}

/**
 * Monta uma tentativa: lista fixa (simulados completos) ou sorteio proporcional por macrotema,
 * evitando questões já vistas quando há alternativas, e cobrindo microtemas diferentes.
 */
export function buildExam(opts: {
  bank: BankQuestion[];
  count: number;
  seed: number;
  fixedCodes?: string[];
  macros?: number[];
  distribution?: Record<string, number>;
  seen?: Set<string>;
}): ExamItem[] {
  const rand = rng(opts.seed);
  if (opts.fixedCodes?.length) {
    const byCode = new Map(opts.bank.map((q) => [q.code, q]));
    return shuffle(
      opts.fixedCodes.map((c) => byCode.get(c)).filter((q): q is BankQuestion => Boolean(q)),
      rand,
    ).map((q) => toItem(q, rand));
  }
  const pool = opts.bank.filter((q) => !opts.macros?.length || opts.macros.includes(q.macro));
  const weights =
    opts.distribution && Object.keys(opts.distribution).length
      ? opts.distribution
      : Object.fromEntries(Object.entries(OFFICIAL_WEIGHTS).filter(([k]) => pool.some((q) => String(q.macro) === k)));
  const quota = allocate(Math.min(opts.count, pool.length), weights);
  const picked: BankQuestion[] = [];
  for (const [macro, n] of Object.entries(quota)) {
    const candidates = shuffle(
      pool.filter((q) => String(q.macro) === macro),
      rand,
    ).sort((a, b) => Number(opts.seen?.has(a.code) ?? false) - Number(opts.seen?.has(b.code) ?? false));
    // Rodízio por microtema principal: evita concentrar o simulado num mesmo assunto.
    const used = new Set<string>();
    const take: BankQuestion[] = [];
    for (const q of candidates) if (take.length < n && !used.has(q.items[0]!)) (take.push(q), used.add(q.items[0]!));
    for (const q of candidates) if (take.length < n && !take.includes(q)) take.push(q);
    picked.push(...take);
  }
  // Completa com qualquer questão restante quando algum macrotema não tinha o suficiente.
  for (const q of shuffle(pool, rand)) if (picked.length < Math.min(opts.count, pool.length) && !picked.includes(q)) picked.push(q);
  return shuffle(picked, rand).map((q) => toItem(q, rand));
}

export type ExamResult = {
  total: number;
  hits: number;
  percent: number;
  seconds: number;
  avgSeconds: number;
  byMacro: { macro: number; total: number; hits: number; percent: number }[];
  byItem: { item: string; total: number; hits: number }[];
  wrong: string[];
  blank: string[];
};

export function gradeExam(items: ExamItem[], answers: Record<string, string>, timings: Record<string, number> = {}): ExamResult {
  const hits = items.filter((it) => answers[it.code] === it.correct);
  const seconds = Object.values(timings).reduce((a, b) => a + b, 0);
  const macros = [...new Set(items.map((i) => i.macro))].sort();
  const itemCodes = [...new Set(items.flatMap((i) => i.items))].sort();
  return {
    total: items.length,
    hits: hits.length,
    percent: items.length ? Math.round((hits.length / items.length) * 1000) / 10 : 0,
    seconds,
    avgSeconds: items.length ? Math.round(seconds / items.length) : 0,
    byMacro: macros.map((m) => {
      const its = items.filter((i) => i.macro === m);
      const h = its.filter((i) => answers[i.code] === i.correct).length;
      return { macro: m, total: its.length, hits: h, percent: Math.round((h / its.length) * 1000) / 10 };
    }),
    byItem: itemCodes.map((code) => {
      const its = items.filter((i) => i.items.includes(code));
      return { item: code, total: its.length, hits: its.filter((i) => answers[i.code] === i.correct).length };
    }),
    wrong: items.filter((i) => answers[i.code] && answers[i.code] !== i.correct).map((i) => i.code),
    blank: items.filter((i) => !answers[i.code]).map((i) => i.code),
  };
}

/** Recomendações de estudo: microtemas com pior desempenho, priorizando os de maior peso. */
export function recommendations(result: ExamResult, max = 5) {
  return result.byItem
    .filter((r) => r.hits < r.total)
    .map((r) => ({ ...r, gap: (r.total - r.hits) / r.total, weight: OFFICIAL_WEIGHTS[r.item.split(".")[0]!] ?? 0 }))
    .sort((a, b) => b.gap - a.gap || b.weight - a.weight || b.total - a.total)
    .slice(0, max);
}

// ─── Revisão espaçada ───

export const DEFAULT_REVIEW_DAYS = [1, 3, 7, 14];

/**
 * Próximo agendamento de um item de revisão. Acerto avança um estágio (1 → 3 → 7 → 14 dias e,
 * depois do último, mantém o maior intervalo); erro volta ao primeiro estágio. Assim, as revisões
 * se concentram nos assuntos em que o aluno erra, e não numa quantidade fixa para todos.
 */
export function nextReview(state: { stage: number; lapses: number }, correct: boolean, now: Date, days = DEFAULT_REVIEW_DAYS) {
  const stage = correct ? Math.min(state.stage + 1, days.length) : 0;
  const interval = correct ? days[Math.min(stage, days.length) - 1] ?? days[days.length - 1]! : days[0]!;
  return { stage, lapses: state.lapses + (correct ? 0 : 1), dueAt: new Date(now.getTime() + interval * 86_400_000), lastResult: correct };
}

// ─── Cronograma ───

export type Plan = { examDate: Date | null; hoursPerWeek: number; studyDays: number[] };
export type ScheduledLesson = { code: string; minutes: number; macro: number };
export type ScheduleDay = { date: string; lessons: string[]; minutes: number; review: boolean; exam?: string };

/**
 * Distribui as aulas pendentes pelos dias de estudo até a prova: respeita o tempo semanal,
 * reserva 25% de cada dia para revisão e intercala simulados ao fim de cada macrotema.
 */
export function buildSchedule(lessons: ScheduledLesson[], plan: Plan, from: Date): { days: ScheduleDay[]; fitsBeforeExam: boolean; weeksNeeded: number } {
  const studyDays = plan.studyDays.length ? plan.studyDays : [1, 2, 3, 4, 5];
  const dailyMinutes = Math.max(30, Math.round(((plan.hoursPerWeek * 60) / studyDays.length) * 0.75));
  const days: ScheduleDay[] = [];
  const queue = [...lessons];
  const date = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  let guard = 0;
  let lastMacro = queue[0]?.macro;
  while (queue.length && guard++ < 1000) {
    if (studyDays.includes(date.getUTCDay())) {
      const day: ScheduleDay = { date: date.toISOString().slice(0, 10), lessons: [], minutes: 0, review: true };
      while (queue.length && (day.minutes === 0 || day.minutes + queue[0]!.minutes <= dailyMinutes)) {
        const l = queue.shift()!;
        if (l.macro !== lastMacro) {
          day.exam = `Simulado do macrotema ${lastMacro}`;
          lastMacro = l.macro;
        }
        day.lessons.push(l.code);
        day.minutes += l.minutes;
      }
      days.push(day);
    }
    date.setUTCDate(date.getUTCDate() + 1);
  }
  const lastDay = days[days.length - 1]?.date;
  const fitsBeforeExam = !plan.examDate || !lastDay || new Date(lastDay) <= plan.examDate;
  const totalMinutes = lessons.reduce((a, l) => a + l.minutes, 0);
  const weeksNeeded = Math.ceil(totalMinutes / Math.max(1, plan.hoursPerWeek * 60 * 0.75));
  return { days, fitsBeforeExam, weeksNeeded };
}

/** Sequência de estudo (dias consecutivos com atividade). */
export function updateStreak(last: Date | null, streak: number, today: Date) {
  const d = (x: Date) => Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate());
  if (!last) return 1;
  const diff = (d(today) - d(last)) / 86_400_000;
  if (diff === 0) return streak;
  if (diff === 1) return streak + 1;
  return 1;
}

// ─── Árvores de decisão ───

export type TreeGraph = { start: string; nodes: Record<string, { text: string; choices: { label: string; next: string; score: number; feedback: string; competence?: string }[]; outcome?: string }> };

export function walkTree(graph: TreeGraph, path: number[]) {
  let node = graph.start;
  let score = 0;
  const competences: string[] = [];
  const steps: { node: string; choice: number; feedback: string; score: number }[] = [];
  for (const choice of path) {
    const c = graph.nodes[node]?.choices[choice];
    if (!c) throw new Error("caminho inválido");
    score += c.score;
    if (c.competence && c.score > 0) competences.push(c.competence);
    steps.push({ node, choice, feedback: c.feedback, score: c.score });
    node = c.next;
  }
  const current = graph.nodes[node]!;
  return { node, current, score, competences, steps, finished: !current.choices.length };
}
