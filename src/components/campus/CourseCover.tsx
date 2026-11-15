import { courseCoverColors } from "@/theme/tokens";
import { coverSpec } from "./course-cover";

/** Capa ilustrada e exclusiva do curso (SVG gerado do slug), em proporção 8:3. */
export function CourseCover({ slug, title, index, className }: { slug: string; title: string; index?: number; className?: string }) {
  const c = coverSpec(slug, title, index);
  const id = `cv-${slug.replace(/[^a-z0-9]/gi, "")}`;
  const colors = courseCoverColors(c.hue, c.hue2);
  const a = colors.from;
  const b = colors.to;
  const ink = colors.ink;
  const s = c.scale;
  const shapes = [
    <circle key="p" cx={s / 2} cy={s / 2} r={s / 5} fill={ink} />,
    <path key="p" d={`M0 ${s} L${s / 2} 0 L${s} ${s}`} fill="none" stroke={ink} strokeWidth="2" />,
    <rect key="p" x={s / 4} y={s / 4} width={s / 2} height={s / 2} fill="none" stroke={ink} strokeWidth="2" />,
    <path key="p" d={`M0 ${s / 2} Q${s / 4} 0 ${s / 2} ${s / 2} T${s} ${s / 2}`} fill="none" stroke={ink} strokeWidth="2" />,
    <path key="p" d={`M${s / 2} 0 V${s} M0 ${s / 2} H${s}`} stroke={ink} strokeWidth="2" />,
    <circle key="p" cx={s / 2} cy={s / 2} r={s / 2.6} fill="none" stroke={ink} strokeWidth="2" />,
    <path key="p" d={`M0 0 L${s} ${s} M${s} 0 L0 ${s}`} stroke={ink} strokeWidth="1.5" />,
    <path key="p" d={`M${s / 2} ${s / 6} L${(5 * s) / 6} ${s / 2} L${s / 2} ${(5 * s) / 6} L${s / 6} ${s / 2} Z`} fill={ink} />,
  ];
  return (
    <svg viewBox="0 0 400 150" preserveAspectRatio="xMidYMid slice" role="img" aria-label={`Capa do curso ${title}`} className={className}>
      <defs>
        <linearGradient id={`${id}-g`} x1="0" y1="0" x2="1" y2="1" gradientTransform={`rotate(${c.angle} .5 .5)`}>
          <stop offset="0" stopColor={a} />
          <stop offset="1" stopColor={b} />
        </linearGradient>
        <pattern id={`${id}-p`} width={s} height={s} patternUnits="userSpaceOnUse" patternTransform={`rotate(${c.angle})`}>
          {shapes[c.pattern]}
        </pattern>
      </defs>
      <rect width="400" height="150" fill={`url(#${id}-g)`} />
      <rect width="400" height="150" fill={`url(#${id}-p)`} />
      <circle cx="330" cy="75" r="52" fill={colors.badge} />
      <text x="330" y="75" textAnchor="middle" dominantBaseline="central" fontSize="44" fontWeight="700" fill={colors.monogram} fontFamily="Georgia, serif">
        {c.monogram}
      </text>
    </svg>
  );
}
