import Link from "next/link";

import { Card } from "@/components/ui/card";
import { ROUTES } from "@/lib/routes";
import type { Quiz } from "@/features/quizzes/types";

function statusBadge(status: Quiz["status"]) {
  switch (status) {
    case "PUBLISHED":
      return <span className="shrink-0 rounded bg-teal-100 px-2 py-0.5 text-xs font-semibold uppercase text-teal-700">Published</span>;
    case "DRAFT":
      return <span className="shrink-0 rounded bg-slate-200 px-2 py-0.5 text-xs font-semibold uppercase text-slate-600">Draft</span>;
    case "ARCHIVED":
      return <span className="shrink-0 rounded bg-slate-200 px-2 py-0.5 text-xs font-semibold uppercase text-slate-600">Archived</span>;
  }
}

export function QuizCard({ quiz }: { quiz: Quiz }) {
  const meta = [quiz.time_limit_minutes != null ? `${quiz.time_limit_minutes} min` : null, quiz.question_count != null ? `${quiz.question_count} questions` : null].filter(Boolean).join(" · ");

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-900">{quiz.title}</h2>
        {statusBadge(quiz.status)}
      </div>
      {meta ? <p className="text-sm text-slate-600">{meta}</p> : null}
      {quiz.passing_score ? <p className="text-sm text-slate-500">Passing score: {quiz.passing_score}%</p> : null}
      <Link
        href={ROUTES.student.quizDetail(quiz.id)}
        className="mt-auto inline-flex w-fit items-center gap-1 rounded-lg text-sm font-medium text-teal-700 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
      >
        View quiz
      </Link>
    </Card>
  );
}