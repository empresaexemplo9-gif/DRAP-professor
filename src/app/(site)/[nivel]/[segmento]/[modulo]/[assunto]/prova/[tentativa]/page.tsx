import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { clsx } from "clsx";
import { z } from "zod";
import { withTenant } from "@/lib/db";
import { can } from "@/lib/rbac";
import { grade, type AttemptItem } from "@/lib/quiz";
import { quizConfig, readSheet } from "@/lib/course-progress";
import { InlineText } from "@/content-blocks/BlockRenderer";
import { parseInline } from "@/content-blocks/inline";
import { Alert, Breadcrumb } from "@/components/ui/misc";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { loadProva, type ProvaParams } from "../load";

export const metadata: Metadata = { title: "Resultado da prova" };

export default async function AttemptResultPage({ params }: { params: Promise<ProvaParams & { tentativa: string }> }) {
  const p = await params;
  const attemptId = z.string().uuid().safeParse(p.tentativa);
  if (!attemptId.success) notFound();
  const data = await loadProva(p);
  if (!data) notFound();
  const { viewer, tenant, mod, topic, path } = data;
  const isStaff = can(viewer.roles, "content:manage");
  const attempt = await withTenant(tenant.id, (tx) =>
    tx.quizAttempt.findFirst({ where: { id: attemptId.data, tenantId: tenant.id, topicId: topic.id }, include: { enrollment: { include: { module: true } } } }),
  );
  if (!attempt || (!isStaff && attempt.enrollment.userId !== viewer.user.id) || attempt.status === "EM_ANDAMENTO") notFound();

  const sheet = readSheet(attempt.enrollment.module.courseSheet);
  const cfg = quizConfig(sheet);
  const items = attempt.items as unknown as AttemptItem[];
  const answers = (attempt.answers ?? {}) as Record<string, string>;
  const { hits, total } = grade(items, answers);
  const objectives = sheet.modules?.find((m) => m.slug === topic.slug)?.objectives ?? [];
  const byObjective = [...new Set(items.map((i) => i.objective))].map((code) => {
    const its = items.filter((i) => i.objective === code);
    const ok = its.filter((i) => answers[i.questionId] === i.correct).length;
    return { code, text: objectives.find((o) => o.code === code)?.text ?? "", ok, total: its.length };
  });

  return (
    <>
      <Breadcrumb items={[{ href: "/", label: "Início" }, { href: path.split("/").slice(0, -1).join("/"), label: mod.title }, { href: path, label: topic.title }, { label: "Resultado" }]} />
      <div className="mx-auto max-w-4xl space-y-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-widest text-accent-text">
              Ciclo {attempt.cycle} · tentativa {attempt.number} de {cfg.maxAttempts}
            </p>
            <h1 className="mt-1 font-display text-3xl text-text sm:text-4xl">Gabarito comentado</h1>
            <p className="mt-1 text-text-muted">{topic.title}</p>
          </div>
          <div className="text-right">
            <p className={clsx("font-display text-4xl", attempt.passed ? "text-success" : "text-danger")}>{attempt.score?.toFixed(1)}%</p>
            <p className="text-sm text-text-muted">
              {hits} de {total} acertos · mínimo {cfg.passPercent}%
            </p>
          </div>
        </header>

        {attempt.passed ? (
          <Alert tone="success">Aprovado! O próximo módulo do curso foi liberado.</Alert>
        ) : (
          <Alert tone="warning">
            {attempt.status === "EXPIRADA" ? "A prova foi encerrada pelo tempo. " : ""}
            Não foi desta vez. Releia os comentários abaixo e revise as aulas dos objetivos com menor acerto. A próxima tentativa fica disponível {cfg.retryHours} h após esta entrega.
          </Alert>
        )}

        <Card>
          <h2 className="font-display text-xl text-text">Desempenho por objetivo</h2>
          <ul className="mt-4 space-y-3">
            {byObjective.map((o) => {
              const pct = o.total ? Math.round((o.ok / o.total) * 100) : 0;
              return (
                <li key={o.code} className="text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="text-text">
                      <strong>{o.code}</strong> {o.text}
                    </span>
                    <span className={pct >= cfg.passPercent ? "text-success" : "text-danger"}>
                      {o.ok}/{o.total}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-raised">
                    <div className={clsx("h-full rounded-full", pct >= cfg.passPercent ? "bg-success" : "bg-danger")} style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>

        <ol className="space-y-6">
          {items.map((it, i) => {
            const answer = answers[it.questionId];
            const right = answer === it.correct;
            return (
              <li key={it.questionId} className={clsx("rounded-xl border bg-surface p-5 sm:p-6", right ? "border-success" : "border-danger")}>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-medium uppercase tracking-widest text-text-muted">
                    Questão {i + 1} · {it.objective}
                    {it.isCase ? " · estudo de caso" : ""}
                  </span>
                  {right ? <Badge tone="success">Correta</Badge> : <Badge tone="danger">{answer ? "Incorreta" : "Em branco"}</Badge>}
                </div>
                <p className="whitespace-pre-line text-text">
                  <InlineText text={parseInline(it.stem)} />
                </p>
                <ul className="mt-4 space-y-2">
                  {it.options.map((o) => (
                    <li
                      key={o.key}
                      className={clsx(
                        "rounded-md border px-3 py-2 text-sm",
                        o.key === it.correct ? "border-success text-text" : o.key === answer ? "border-danger text-text" : "border-border text-text-muted",
                      )}
                    >
                      <strong className="mr-1">{o.key})</strong>
                      <InlineText text={parseInline(o.text)} />
                      {o.key === it.correct && <span className="ml-2 text-success">✓ gabarito</span>}
                      {o.key === answer && o.key !== it.correct && <span className="ml-2 text-danger">sua resposta</span>}
                    </li>
                  ))}
                </ul>
                <div className="mt-4 rounded-md border-l-4 border-accent bg-surface-raised p-3 text-sm text-text">
                  <p className="mb-1 font-medium">Comentário</p>
                  <p className="whitespace-pre-line">
                    <InlineText text={parseInline(it.commentary)} />
                  </p>
                </div>
              </li>
            );
          })}
        </ol>

        <div className="flex flex-wrap gap-2">
          <ButtonLink href={path}>Voltar ao módulo</ButtonLink>
        </div>
      </div>
    </>
  );
}
