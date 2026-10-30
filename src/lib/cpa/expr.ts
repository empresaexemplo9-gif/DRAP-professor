/**
 * Avaliador aritmético seguro (sem eval) para a verificação independente dos cálculos do banco de questões.
 * Aceita números (ponto decimal), + - * / ^, parênteses e as funções abaixo.
 *   Verificação: (1.12 / 1.045 - 1) * 100 ≈ 7.18 | exibido: 7,18%
 */
const FUNCS: Record<string, (...a: number[]) => number> = {
  pow: Math.pow,
  sqrt: Math.sqrt,
  ln: Math.log,
  log10: Math.log10,
  exp: Math.exp,
  abs: Math.abs,
  min: Math.min,
  max: Math.max,
  round: (x, n = 0) => Math.round(x * 10 ** n) / 10 ** n,
};

type Tok = { t: "num"; v: number } | { t: "id"; v: string } | { t: "op"; v: string };

function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  const re = /\s*(?:(\d+(?:\.\d+)?(?:e[+-]?\d+)?)|([a-z_][a-z0-9_]*)|(\*\*|[-+*/^(),]))/giy;
  let m: RegExpExecArray | null;
  let pos = 0;
  while (pos < src.length) {
    re.lastIndex = pos;
    m = re.exec(src);
    if (!m || m[0].length === 0) {
      if (/^\s*$/.test(src.slice(pos))) break;
      throw new Error(`símbolo inválido em "${src.slice(pos, pos + 10)}"`);
    }
    if (m[1]) out.push({ t: "num", v: Number(m[1]) });
    else if (m[2]) out.push({ t: "id", v: m[2].toLowerCase() });
    else out.push({ t: "op", v: m[3] === "**" ? "^" : m[3]! });
    pos = re.lastIndex;
  }
  return out;
}

export function evaluate(src: string): number {
  const toks = tokenize(src);
  let i = 0;
  const peek = () => toks[i];
  const eat = (v?: string) => {
    const t = toks[i++];
    if (!t || (v && (t.t !== "op" || t.v !== v))) throw new Error(`esperado "${v ?? "valor"}"`);
    return t;
  };
  const expr = (): number => {
    let v = term();
    while (peek()?.t === "op" && (peek()!.v === "+" || peek()!.v === "-")) v = eat().v === "+" ? v + term() : v - term();
    return v;
  };
  const term = (): number => {
    let v = power();
    while (peek()?.t === "op" && (peek()!.v === "*" || peek()!.v === "/")) v = eat().v === "*" ? v * power() : v / power();
    return v;
  };
  const power = (): number => {
    const base = unary();
    if (peek()?.t === "op" && peek()!.v === "^") {
      eat();
      return base ** power();
    }
    return base;
  };
  const unary = (): number => {
    if (peek()?.t === "op" && (peek()!.v === "-" || peek()!.v === "+")) return eat().v === "-" ? -unary() : unary();
    return primary();
  };
  const primary = (): number => {
    const t = eat();
    if (t.t === "num") return t.v;
    if (t.t === "op" && t.v === "(") {
      const v = expr();
      eat(")");
      return v;
    }
    if (t.t === "id") {
      const fn = FUNCS[t.v];
      if (!fn) throw new Error(`função desconhecida: ${t.v}`);
      eat("(");
      const args = [expr()];
      while (peek()?.t === "op" && peek()!.v === ",") {
        eat();
        args.push(expr());
      }
      eat(")");
      return fn(...args);
    }
    throw new Error("expressão inválida");
  };
  const v = expr();
  if (i !== toks.length) throw new Error("sobra texto após a expressão");
  if (!Number.isFinite(v)) throw new Error("resultado não é finito");
  return v;
}

/** Converte número em texto pt-BR ("1.234,56") para Number. */
export function parseBrNumber(s: string): number | null {
  const m = /-?\d{1,3}(?:\.\d{3})*(?:,\d+)?|-?\d+(?:,\d+)?/.exec(s);
  if (!m) return null;
  return Number(m[0].replace(/\./g, "").replace(",", "."));
}

/**
 * Confere uma verificação "expr ≈ valor | exibido: texto": a expressão deve dar o valor declarado
 * (tolerância de meia unidade da última casa decimal) e o texto exibido deve corresponder ao valor.
 */
export function checkCalculation(spec: { expr: string; expected: string; shown?: string }): string | null {
  let got: number;
  try {
    got = evaluate(spec.expr);
  } catch (e) {
    return `expressão inválida: ${(e as Error).message}`;
  }
  const expected = Number(spec.expected.replace(",", "."));
  if (!Number.isFinite(expected)) return `valor esperado inválido: ${spec.expected}`;
  const decimals = (spec.expected.split(/[.,]/)[1] ?? "").length;
  const tol = 0.5 * 10 ** -decimals + 1e-9;
  if (Math.abs(got - expected) > tol) return `cálculo dá ${got.toFixed(Math.max(decimals, 4))}, mas o esperado declarado é ${spec.expected}`;
  if (spec.shown) {
    const shown = parseBrNumber(spec.shown);
    if (shown === null || Math.abs(shown - expected) > tol) return `valor exibido "${spec.shown}" não corresponde a ${spec.expected}`;
  }
  return null;
}
