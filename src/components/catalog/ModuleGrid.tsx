import Link from "next/link";
import Image from "next/image";
import { academicImage, courseBanner } from "@/components/campus/academic-media";
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
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {modules.map((m) => (
        <li key={m.id}>
          <Link href={levelPath(levelSlug, segmentSlug, m.slug)} className="block h-full no-underline">
            <Card variant="interactive" className="flex h-full flex-col overflow-hidden">
              {courseBanner(m.slug) ? (
                <Image src={courseBanner(m.slug)!} alt="" width={1600} height={600} unoptimized className="-mx-5 -mt-5 mb-5 h-auto w-[calc(100%+2.5rem)] max-w-none" />
              ) : (
                <div className="relative -mx-5 -mt-5 mb-5 aspect-[8/3]">
                  <Image
                    src={academicImage(segmentSlug)}
                    alt=""
                    fill
                    sizes="(min-width: 1280px) 25vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover"
                  />
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
