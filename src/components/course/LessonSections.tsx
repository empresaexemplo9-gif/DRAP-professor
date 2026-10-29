import { clsx } from "clsx";
import type { ContentDocument } from "@/content-blocks/schema";
import { BlockView } from "@/content-blocks/BlockRenderer";
import { Button } from "@/components/ui/Button";
import { markSectionAction } from "@/app/(site)/quiz-actions";

const KIND_LABEL = { section: "Aula", material: "Material de apoio", atividade: "Atividade prática" } as const;

/**
 * Seções do módulo (aulas, material de apoio, atividade prática) com marcação de aula concluída.
 * A presença mínima para liberar a prova conta apenas as aulas.
 */
export function LessonSections({
  doc,
  topicId,
  path,
  completed,
  canTrack,
}: {
  doc: ContentDocument;
  topicId: string;
  path: string;
  completed: Set<string>;
  canTrack: boolean;
}) {
  let lessonNo = 0;
  return (
    <div className="space-y-10">
      {doc.sections.map((section) => {
        const kind = (section.kind in KIND_LABEL ? section.kind : "section") as keyof typeof KIND_LABEL;
        if (kind === "section") lessonNo++;
        const done = completed.has(section.id);
        return (
          <section
            key={section.id}
            id={`s-${section.id}`}
            aria-labelledby={`st-${section.id}`}
            className={clsx(
              "scroll-mt-24 rounded-xl border p-5 sm:p-8",
              kind === "section" ? "border-border bg-surface" : kind === "material" ? "border-accent bg-surface" : "border-primary bg-surface",
            )}
          >
            <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className={clsx("text-xs font-medium uppercase tracking-widest", kind === "material" ? "text-accent-text" : "text-primary-text")}>
                  {kind === "section" ? `Aula ${lessonNo}` : KIND_LABEL[kind]}
                  {section.minutes ? ` · ${section.minutes} min` : ""}
                </p>
                <h2 id={`st-${section.id}`} className="mt-1 font-display text-2xl text-text sm:text-3xl">
                  {section.title.replace(/^(Aula \d+|Material de apoio|Atividade prática)\s*[—–-]\s*/i, "")}
                </h2>
              </div>
              {done && kind === "section" && <span className="rounded-full border border-success px-3 py-1 text-xs font-medium text-success">✓ Aula concluída</span>}
            </header>
            <div className="drap-content">
              {section.blocks.map((b) => (
                <BlockView key={b.id} block={b} />
              ))}
            </div>
            {canTrack && kind === "section" && (
              <form action={markSectionAction} className="no-print mt-8 border-t border-border pt-5">
                <input type="hidden" name="topicId" value={topicId} />
                <input type="hidden" name="sectionId" value={section.id} />
                <input type="hidden" name="done" value={done ? "0" : "1"} />
                <input type="hidden" name="path" value={path} />
                <Button type="submit" size="sm" variant={done ? "secondary" : "primary"}>
                  {done ? "Desmarcar aula" : "Marcar aula como concluída"}
                </Button>
              </form>
            )}
          </section>
        );
      })}
    </div>
  );
}
