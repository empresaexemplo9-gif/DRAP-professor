import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { withTenant } from "@/lib/db";
import type { AttemptItem } from "@/lib/quiz";
import { Breadcrumb } from "@/components/ui/misc";
import { QuizForm } from "@/components/course/QuizForm";
import { loadProva, type ProvaParams } from "./load";

export const metadata: Metadata = { title: "Prova do módulo" };
export const dynamic = "force-dynamic";

export default async function QuizPage({ params }: { params: Promise<ProvaParams> }) {
  const data = await loadProva(await params);
  if (!data) notFound();
  const { tenant, mod, topic, enrollment, path } = data;
  if (!enrollment) redirect(path);
  const attempt = await withTenant(tenant.id, (tx) =>
    tx.quizAttempt.findFirst({ where: { enrollmentId: enrollment.id, topicId: topic.id, status: "EM_ANDAMENTO" }, orderBy: { startedAt: "desc" } }),
  );
  if (!attempt || attempt.deadlineAt.getTime() < Date.now()) redirect(path);
  // Gabarito e comentários ficam no servidor: o navegador recebe só enunciado e alternativas.
  const items = (attempt.items as unknown as AttemptItem[]).map((it) => ({
    questionId: it.questionId,
    isCase: it.isCase,
    stem: it.stem,
    options: it.options.map((o) => ({ key: o.key, text: o.text })),
  }));
  return (
    <>
      <Breadcrumb items={[{ href: "/", label: "Início" }, { href: path.split("/").slice(0, -1).join("/"), label: mod.title }, { href: path, label: topic.title }, { label: "Prova" }]} />
      <QuizForm
        attemptId={attempt.id}
        path={path}
        title={topic.title}
        number={attempt.number}
        cycle={attempt.cycle}
        deadline={attempt.deadlineAt.toISOString()}
        items={items}
        saved={(attempt.answers ?? {}) as Record<string, string>}
      />
    </>
  );
}
