"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { academicImage } from "./academic-media";

export type FeaturedCourse = {
  id: string;
  title: string;
  href: string;
  segment: string;
  segmentSlug: string;
  level: string;
  levelSlug: string;
  workload: string;
  topics: number;
};

export function FeaturedCourses({
  courses,
  levels,
  showAll = false,
}: {
  courses: FeaturedCourse[];
  levels: { slug: string; label: string }[];
  showAll?: boolean;
}) {
  const [selected, setSelected] = useState("todos");
  const filtered = courses.filter((course) => selected === "todos" || course.levelSlug === selected);
  return (
    <>
      <div role="group" aria-label="Filtrar formações por formato" className="mb-6 flex flex-wrap gap-2">
        {[{ slug: "todos", label: "Todas as formações" }, ...levels].map((level) => (
          <button
            key={level.slug}
            type="button"
            aria-pressed={selected === level.slug}
            onClick={() => setSelected(level.slug)}
            className={`min-h-9 rounded-full border px-4 text-[11px] transition-colors ${selected === level.slug ? "border-primary-strong bg-primary-strong text-text-on-primary" : "border-border bg-transparent text-text-muted hover:border-accent hover:text-text"}`}
          >
            {level.label}
          </button>
        ))}
      </div>
      <p aria-live="polite" className="sr-only">
        {filtered.length} formações nesta seleção.
      </p>
      {filtered.length > 0 ? (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {(showAll ? filtered : filtered.slice(0, 4)).map((course) => (
            <li key={course.id}>
              <Link
                href={course.href}
                className="course-tile group flex h-full flex-col overflow-hidden rounded-md border border-border bg-surface text-text no-underline transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-md"
              >
                <div className="relative h-36 overflow-hidden">
                  <Image
                    src={academicImage(course.segmentSlug)}
                    alt=""
                    fill
                    sizes="(min-width: 1280px) 25vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <span className="absolute bottom-3 left-3 rounded-sm bg-campus/90 px-2 py-1 text-[9px] font-medium uppercase tracking-wider text-campus-on-dark">
                    {course.level}
                  </span>
                </div>
                <div className="flex flex-1 flex-col px-4 pb-4 pt-4">
                  <p className="mb-2 text-[9px] font-medium uppercase tracking-[0.16em] text-accent-text">
                    {course.segment}
                  </p>
                  <h3 className="font-display text-lg leading-snug text-text">{course.title}</h3>
                  <div className="mt-auto flex items-center justify-between gap-2 pt-5 text-[10px] text-text-muted">
                    <span className="inline-flex items-center gap-1.5">
                      <Icon name="clock" className="size-3.5" />
                      {course.workload}
                      <span className="mx-1">·</span>
                      {course.topics} assuntos
                    </span>
                    <Icon name="arrow" className="size-4 text-accent-text" />
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-md border border-dashed border-border-strong py-10 text-center">
          <Icon name="graduation" className="mx-auto mb-3 size-8 text-accent-text" />
          <p className="text-sm text-text-muted">Nenhuma formação deste formato nesta seleção.</p>
          {selected !== "todos" && (
            <Link href={`/${selected}`} className="mt-3 inline-block text-sm">
              Explorar o catálogo de {levels.find((level) => level.slug === selected)?.label.toLowerCase()}
            </Link>
          )}
        </div>
      )}
      {!showAll && filtered.length > 4 && (
        <p className="mt-4 text-right text-xs">
          <Link href={selected === "todos" ? "/buscar" : `/${selected}`}>
            Ver todas as formações <span aria-hidden>→</span>
          </Link>
        </p>
      )}
    </>
  );
}
