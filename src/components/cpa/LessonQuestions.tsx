"use client";
import { answerStudyQuestionAction } from "@/app/(site)/cpa/actions";
import { StudyQuestion } from "./StudyQuestion";

export function LessonQuestions({ questions }: { questions: { code: string; stem: string; options: { key: string; text: string }[] }[] }) {
  return (
    <div className="space-y-4">
      {questions.map((q, i) => (
        <StudyQuestion key={q.code} number={i + 1} {...q} check={(answer) => answerStudyQuestionAction({ questionCode: q.code, answer })} />
      ))}
    </div>
  );
}
