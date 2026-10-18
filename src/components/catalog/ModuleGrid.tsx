import Link from "next/link";
import { levelPath } from "@/lib/catalog-paths";
import { formatWorkload } from "@/lib/levels";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export function ModuleGrid({
  levelSlug,
  segmentSlug,
  modules,
}: {
  levelSlug: string;
  segmentSlug: string;
  modules: { id: string; slug: string; title: string; summary: string | null; workloadMinutes: number; _count: { topics: number } }[];
}) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {modules.map((m) => (
        <li key={m.id}>
          <Link href={levelPath(levelSlug, segmentSlug, m.slug)} className="block h-full no-underline">
            <Card variant="interactive" className="flex h-full flex-col">
              <h3 className="font-display text-xl text-text">{m.title}</h3>
              {m.summary && <p className="mt-2 line-clamp-3 text-sm text-text-muted">{m.summary}</p>}
              <div className="mt-auto flex flex-wrap gap-2 pt-4">
                <Badge tone="gold">{formatWorkload(m.workloadMinutes)}</Badge>
                <Badge>{m._count.topics} {m._count.topics === 1 ? "assunto" : "assuntos"}</Badge>
              </div>
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  );
}
