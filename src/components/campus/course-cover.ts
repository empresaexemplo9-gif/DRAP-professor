/**
 * Capa exclusiva de cada curso, gerada a partir do slug (determinística): paleta, padrão geométrico,
 * ângulo e monograma. Garante que nenhum card repita a mesma imagem.
 */
export type CoverSpec = { hue: number; hue2: number; pattern: number; angle: number; scale: number; monogram: string };

export const PATTERNS = 8;

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/**
 * Com `index` (posição do curso no catálogo), padrão e cor são distribuídos sem repetição:
 * o padrão alterna a cada curso e a cor avança pelo ângulo áureo, então cursos vizinhos ou
 * com o mesmo padrão ficam sempre com cores distantes.
 */
export function coverSpec(slug: string, title: string, index?: number): CoverSpec {
  const h = hash(slug);
  const words = title
    .replace(/[—–-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !/^(para|com|das|dos|por|sem|que|uma|nos|nas)$/i.test(w));
  const monogram = (words.length >= 2 ? words[0]![0]! + words[1]![0]! : (words[0] ?? title).slice(0, 2)).toUpperCase();
  const hue = index === undefined ? h % 360 : Math.round((index * 137.508 + Math.floor(index / PATTERNS) * 45) % 360);
  return {
    hue,
    hue2: (hue + 35 + ((h >>> 9) % 70)) % 360,
    pattern: index === undefined ? (h >>> 3) % PATTERNS : index % PATTERNS,
    angle: ((h >>> 13) % 12) * 15,
    scale: 18 + ((h >>> 17) % 5) * 6,
    monogram,
  };
}

/** Assinatura visual usada no teste de unicidade. */
export const coverSignature = (c: CoverSpec) => `${Math.round(c.hue / 12)}-${c.pattern}-${c.angle}-${c.scale}-${c.monogram}`;
