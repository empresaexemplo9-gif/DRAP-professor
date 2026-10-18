import Link from "next/link";
import { clsx } from "clsx";
import { levelPath } from "@/lib/catalog-paths";

export function ModuleSideNav({
  levelSlug,
  segmentSlug,
  moduleSlug,
  moduleTitle,
  topics,
  currentTopicId,
  completed,
}: {
  levelSlug: string;
  segmentSlug: string;
  moduleSlug: string;
  moduleTitle: string;
  topics: { id: string; title: string; slug: string }[];
  currentTopicId?: string;
  completed: Set<string>;
}) {
  return (
    <nav aria-label={`Assuntos de ${moduleTitle}`} className="rounded-lg border border-border bg-surface p-3">
      <Link
        href={levelPath(levelSlug, segmentSlug, moduleSlug)}
        aria-current={!currentTopicId ? "page" : undefined}
        className="mb-2 block rounded-md px-3 py-2 font-display text-lg text-text no-underline hover:bg-surface-raised"
      >
        {moduleTitle}
      </Link>
      <ol className="space-y-0.5">
        {topics.map((t, i) => {
          const active = t.id === currentTopicId;
          const done = completed.has(t.id);
          return (
            <li key={t.id}>
              <Link
                href={levelPath(levelSlug, segmentSlug, moduleSlug, t.slug)}
                aria-current={active ? "page" : undefined}
                className={clsx(
                  "flex min-h-11 items-center gap-3 rounded-md px-3 text-sm no-underline",
                  active ? "bg-surface-raised text-text" : "text-text-muted hover:bg-surface-raised hover:text-text",
                )}
              >
                <span
                  aria-hidden
                  className={clsx(
                    "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs",
                    done ? "border-success text-success" : active ? "border-accent text-accent-text" : "border-border-strong",
                  )}
                >
                  {done ? "✓" : i + 1}
                </span>
                <span>{t.title}</span>
                {done && <span className="sr-only">(concluído)</span>}
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
