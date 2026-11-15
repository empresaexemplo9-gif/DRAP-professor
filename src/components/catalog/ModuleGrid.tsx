import Link from "next/link";
import Image from "next/image";
import { courseBanner } from "@/components/campus/academic-media";
import { CourseCover } from "@/components/campus/CourseCover";
import { getTenant } from "@/lib/tenant";
import { getCoverIndex } from "@/lib/course-covers";
import { levelPath } from "@/lib/catalog-paths";
import { formatWorkload } from "@/lib/levels";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export async function ModuleGrid({
  levelSlug,
  segmentSlug,
  modules,
}: {
  levelSlug: string;
  segmentSlug: string;
  modules: {
    id: string;
    slug: string;
    title: string;
    summary: string | null;
    workloadMinutes: number;
    audience?: "INDIVIDUAL" | "EMPRESA";
    _count: { topics: number };
  }[];
}) {
  const tenant = await getTenant();
  const covers = await getCoverIndex(tenant.id);
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {modules.map((m) => (
        <li key={m.id}>
          <Link href={levelPath(levelSlug, segmentSlug, m.slug)} className="block h-full no-underline">
            <Card variant="interactive" className="flex h-full flex-col overflow-hidden">
              {courseBanner(m.slug) ? (
                <Image src={courseBanner(m.slug)!.src} alt="" width={courseBanner(m.slug)!.width} height={courseBanner(m.slug)!.height} unoptimized className="-mx-5 -mt-5 mb-5 h-auto w-[calc(100%+2.5rem)] max-w-none" />
              ) : (
                <div className="relative -mx-5 -mt-5 mb-5 aspect-[8/3]">
                  <CourseCover slug={m.slug} title={m.title} index={covers[m.slug]} className="absolute inset-0 h-full w-full" />
                </div>
              )}
              <h3 className="font-display text-xl text-text">{m.title}</h3>
              {m.summary && <p className="mt-2 line-clamp-3 text-sm text-text-muted">{m.summary}</p>}
              <div className="mt-auto flex flex-wrap gap-2 pt-4">
                {m.audience === "EMPRESA" && <Badge tone="primary">Para empresas</Badge>}
                <Badge tone="gold">{formatWorkload(m.workloadMinutes)}</Badge>
                <Badge>
                  {m._count.topics} {m._count.topics === 1 ? "assunto" : "assuntos"}
                </Badge>
              </div>
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  );
}
