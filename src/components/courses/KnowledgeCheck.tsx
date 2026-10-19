"use client";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

export type PracticeQuestion = {
  id: string;
  moduleNumber: number;
  prompt: string;
  options: { id: string; text: string }[];
  correctOption: string;
};

export function KnowledgeCheck({ questions }: { questions: PracticeQuestion[] }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  if (!questions.length) return null;
  const correct = questions.filter((question) => answers[question.id] === question.correctOption).length;
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }
  return (
    <section aria-labelledby="fixacao-title" className="my-10 rounded-lg border border-border bg-surface p-5 sm:p-7">
      <p className="eyebrow mb-2">Aprender também é praticar</p>
      <h2 id="fixacao-title" className="font-display text-2xl text-text">
        Exercícios de fixação
      </h2>
      <p className="mt-2 text-sm text-text-muted">
        Responda às questões da apostila e confira o gabarito. Este exercício é de autoavaliação e não substitui a
        avaliação pedagógica do curso.
      </p>
      <form onSubmit={submit} className="mt-6 space-y-7">
        {questions.map((question, index) => (
          <fieldset key={question.id} disabled={submitted} className="min-w-0">
            <legend className="mb-3 text-sm font-medium leading-relaxed text-text">
              <span className="mr-2 text-accent-text">{index + 1}.</span>
              {question.prompt}
            </legend>
            <div className="space-y-2">
              {question.options.map((option) => (
                <label
                  key={option.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-md border px-3 py-3 text-sm leading-relaxed ${answers[question.id] === option.id ? "border-accent bg-surface-raised text-text" : "border-border text-text-muted"}`}
                >
                  <input
                    type="radio"
                    name={question.id}
                    value={option.id}
                    required
                    checked={answers[question.id] === option.id}
                    onChange={() => setAnswers((current) => ({ ...current, [question.id]: option.id }))}
                    className="mt-1 shrink-0 accent-primary"
                  />
                  <span>
                    <span className="mr-1.5 font-medium uppercase">{option.id})</span>
                    {option.text}
                  </span>
                </label>
              ))}
            </div>
            {submitted && (
              <p
                className={`mt-3 flex items-start gap-2 text-sm ${answers[question.id] === question.correctOption ? "text-success" : "text-text"}`}
              >
                <Icon
                  name={answers[question.id] === question.correctOption ? "check" : "openbook"}
                  className="mt-0.5 size-4 shrink-0"
                />
                {answers[question.id] === question.correctOption
                  ? "Resposta correta."
                  : `Gabarito: ${question.correctOption.toUpperCase()}) ${question.options.find((option) => option.id === question.correctOption)?.text}`}
              </p>
            )}
          </fieldset>
        ))}
        {submitted ? (
          <div>
            <p role="status" className="mb-4 rounded-md bg-surface-raised p-4 text-sm text-text">
              Você acertou {correct} de {questions.length} questões ({Math.round((correct / questions.length) * 100)}%).
              Revise os conceitos e pratique novamente quando quiser.
            </p>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setAnswers({});
                setSubmitted(false);
              }}
            >
              Refazer exercícios
            </Button>
          </div>
        ) : (
          <Button type="submit">Conferir respostas</Button>
        )}
      </form>
    </section>
  );
}
