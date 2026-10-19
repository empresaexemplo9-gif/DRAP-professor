/**
 * Métricas de ensino e aprendizagem (Teoria Clássica dos Testes e literatura de avaliação educacional):
 *  - Índice de dificuldade (p): proporção de acertos do item.
 *  - Índice de discriminação (r_pb): correlação ponto-bisserial entre acertar o item e a nota no
 *    restante da prova (item excluído da soma, para não inflar a correlação).
 *  - Análise de distratores: frequência de escolha de cada alternativa.
 *  - Ganho normalizado de Hake (g): (pós − pré) / (100 − pré), aqui entre a 1ª tentativa e a melhor.
 *  - Taxa de aprovação, tentativas até aprovar, tempo médio.
 * Limiares de alerta do padrão de curso: erro acima de 80% (p < 0,20) ou acerto acima de 80% (p > 0,80)
 * e discriminação abaixo de 0,20 (negativa = provável gabarito errado ou enunciado ambíguo).
 */

export const MIN_SAMPLE = 10;

export type ItemResponse = { attemptId: string; questionId: string; chosenOriginalKey: string | null; correct: boolean; attemptScore: number; attemptSize: number };

export type ItemStats = {
  questionId: string;
  n: number;
  p: number | null;
  discrimination: number | null;
  distractors: Record<string, number>;
  flags: ("MUITO_DIFICIL" | "MUITO_FACIL" | "BAIXA_DISCRIMINACAO" | "DISCRIMINACAO_NEGATIVA" | "AMOSTRA_INSUFICIENTE")[];
};

function mean(xs: number[]) {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

/** Correlação ponto-bisserial entre variável dicotômica (0/1) e contínua. */
export function pointBiserial(dichotomous: number[], scores: number[]): number | null {
  const n = dichotomous.length;
  if (n < 2 || n !== scores.length) return null;
  const ones = scores.filter((_, i) => dichotomous[i] === 1);
  const zeros = scores.filter((_, i) => dichotomous[i] === 0);
  if (!ones.length || !zeros.length) return null;
  const m = mean(scores);
  const sd = Math.sqrt(scores.reduce((s, x) => s + (x - m) ** 2, 0) / n);
  if (sd === 0) return null;
  const p = ones.length / n;
  return ((mean(ones) - mean(zeros)) / sd) * Math.sqrt(p * (1 - p));
}

export function itemStatistics(responses: ItemResponse[]): ItemStats[] {
  const byItem = new Map<string, ItemResponse[]>();
  for (const r of responses) byItem.set(r.questionId, [...(byItem.get(r.questionId) ?? []), r]);
  return [...byItem.entries()].map(([questionId, rs]) => {
    const n = rs.length;
    const correct = rs.map((r) => (r.correct ? 1 : 0));
    // Nota no restante da prova (em %), excluindo o próprio item.
    const rest = rs.map((r) => {
      const hits = Math.round((r.attemptScore / 100) * r.attemptSize) - (r.correct ? 1 : 0);
      return r.attemptSize > 1 ? (hits / (r.attemptSize - 1)) * 100 : 0;
    });
    const p = n ? correct.reduce<number>((a, b) => a + b, 0) / n : null;
    const discrimination = pointBiserial(correct, rest);
    const distractors: Record<string, number> = {};
    for (const r of rs) {
      const k = r.chosenOriginalKey ?? "—";
      distractors[k] = (distractors[k] ?? 0) + 1;
    }
    const flags: ItemStats["flags"] = [];
    if (n < MIN_SAMPLE) flags.push("AMOSTRA_INSUFICIENTE");
    else {
      if (p !== null && p < 0.2) flags.push("MUITO_DIFICIL");
      if (p !== null && p > 0.8) flags.push("MUITO_FACIL");
      if (discrimination !== null && discrimination < 0) flags.push("DISCRIMINACAO_NEGATIVA");
      else if (discrimination !== null && discrimination < 0.2) flags.push("BAIXA_DISCRIMINACAO");
    }
    return { questionId, n, p: p === null ? null : Math.round(p * 1000) / 1000, discrimination: discrimination === null ? null : Math.round(discrimination * 1000) / 1000, distractors, flags };
  });
}

/** Ganho normalizado de Hake (0–1). Nulo quando a 1ª nota já é 100. */
export function hakeGain(first: number, best: number): number | null {
  if (first >= 100) return null;
  return Math.round(((best - first) / (100 - first)) * 1000) / 1000;
}

export function average(values: (number | null | undefined)[]): number | null {
  const v = values.filter((x): x is number => typeof x === "number" && Number.isFinite(x));
  return v.length ? Math.round(mean(v) * 10) / 10 : null;
}

export const FLAG_LABELS: Record<ItemStats["flags"][number], string> = {
  MUITO_DIFICIL: "Erro acima de 80%",
  MUITO_FACIL: "Acerto acima de 80%",
  BAIXA_DISCRIMINACAO: "Discrimina pouco",
  DISCRIMINACAO_NEGATIVA: "Discriminação negativa — revisar gabarito/enunciado",
  AMOSTRA_INSUFICIENTE: `Menos de ${MIN_SAMPLE} respostas`,
};
