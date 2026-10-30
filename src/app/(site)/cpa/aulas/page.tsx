import type { Metadata } from "next";
import Link from "next/link";
import { getViewer } from "@/lib/session";
import { getCourseIndex } from "@/lib/cpa/student";

export const metadata: Metadata = { title: "Aulas" };
export const dynamic = "force-dynamic";

const MACROS: Record<number, string> = {
  1: "Estrutura e dinâmica do sistema financeiro nacional (20%)",
  2: "Produtos do mercado financeiro (40%)",
  3: "Relacionamento com o cliente (30%)",
  4: "Inovação e desenvolvimento de mercado (10%)",
};

export default async function LessonsIndex() {
  const viewer = (await getViewer())!;
  const { chapters, progress } = await getCourseIndex(viewer.tenant.id, viewer.user.id);
  return (
    <div className="space-y-8">
      <h1 className="font-display text-3xl text-text">Aulas</h1>
      {[1, 2, 3, 4].map((m) => (
        <section key={m} aria-labelledby={`macro-${m}`} className="space-y-4">
          <h2 id={`macro-${m}`} className="font-display text-xl text-text">Módulo {m} · {MACROS[m]}</h2>
          {chapters
            .filter((c) => c.macro === m)
            .map((c) => (
              <details key={c.id} open className="rounded-lg border border-border bg-surface">
                <summary className="cursor-pointer px-4 py-3 text-text">
                  <span className="font-medium">Capítulo {c.number}. {c.title}</span>
                  <span className="ml-2 text-xs text-text-muted">
                    programa oficial {c.officialRef} · {c.lessons.filter((l) => progress.get(l.id)?.completed).length}/{c.lessons.length} concluídas
                  </span>
                </summary>
                {c.lessons.length ? (
                  <ol className="divide-y divide-border border-t border-border">
                    {c.lessons.map((l) => (
                      <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm">
                        <Link href={`/cpa/aulas/${l.code}`} className="no-underline">
                          <span className="mr-2 font-mono text-xs text-text-muted">{l.code}</span>
                          <span className="text-text">{l.title}</span>
                        </Link>
                        <span className="text-xs text-text-muted">
                          {progress.get(l.id)?.completed ? "✓ concluída · " : ""}
                          {l.minutes} min
                        </span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="border-t border-border px-4 py-3 text-sm text-text-muted">Aulas deste capítulo em publicação.</p>
                )}
              </details>
            ))}
        </section>
      ))}
    </div>
  );
}
