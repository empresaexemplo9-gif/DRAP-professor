import { DocumentView } from "@/content-blocks/BlockRenderer";
import type { ContentDocument } from "@/content-blocks/schema";
import { withTenant } from "@/lib/db";
import { financialQuestions, readFinancialNotebook } from "@/lib/courses/financial-practice";
import { ReflectivePractice } from "./ReflectivePractice";

export async function FinancialLesson({
  doc,
  topic,
  tenantId,
  studentId,
}: {
  doc: ContentDocument;
  topic: { id: string; slug: string };
  tenantId: string;
  studentId: string | null;
}) {
  const questions = financialQuestions(topic.slug);
  if (!questions.length) return <DocumentView doc={doc} />;
  const original = doc.sections.filter((s) => ["Prova do módulo", "Gabarito comentado"].includes(s.title));
  const study = { ...doc, sections: doc.sections.filter((s) => !original.includes(s)) };
  const answers = studentId
    ? await withTenant(tenantId, (tx) => readFinancialNotebook(tx, tenantId, studentId, topic.id))
    : null;
  return (
    <>
      <DocumentView doc={study} />
      <ReflectivePractice
        key={topic.id}
        topicId={topic.id}
        questions={questions}
        answers={answers ?? {}}
        canSave={answers !== null}
      />
      <details className="rounded-md border border-border bg-surface p-5">
        <summary className="cursor-pointer font-display text-lg text-text">
          Questões e gabarito no material original
        </summary>
        <div className="mt-6">
          <DocumentView doc={{ ...doc, sections: original }} />
        </div>
      </details>
    </>
  );
}
