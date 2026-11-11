/**
 * Brasão da proposta: a marca dentro de um escudo com filete duplo, três losangos no chefe
 * e o nome da instituição na faixa. Cores vêm dos tokens institucionais (globals.css).
 */
export function Crest({ name, className = "" }: { name: string; className?: string }) {
  return (
    <div className={`proposal-crest ${className}`} role="img" aria-label={`Brasão ${name}`}>
      <svg viewBox="0 0 120 140" aria-hidden className="proposal-crest-shield">
        <path className="outer" d="M8 6H112V70C112 106 86 127 60 137C34 127 8 106 8 70Z" />
        <path className="inner" d="M15 13H105V70C105 101 83 119 60 129C37 119 15 101 15 70Z" />
        <path className="gem" d="M38 19l4 5-4 5-4-5zM60 19l4 5-4 5-4-5zM82 19l4 5-4 5-4-5z" />
      </svg>
      <span aria-hidden className="proposal-crest-mark" />
      <span aria-hidden className="proposal-crest-ribbon">{name}</span>
    </div>
  );
}
