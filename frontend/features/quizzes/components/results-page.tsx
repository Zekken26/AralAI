"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { ROUTES } from "@/lib/routes";
import { useAttemptResults } from "@/features/quizzes/hooks/use-quizzes";

export function ResultsPage({ attemptId }: { attemptId: number }) {
  const router = useRouter();
  const resultsQuery = useAttemptResults(attemptId);

  if (resultsQuery.isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (resultsQuery.isError) {
    return (
      <ErrorAlert>
        <p>We could not load the results.</p>
        <Button variant="secondary" size="sm" onClick={() => resultsQuery.refetch()} className="mt-1">
          Retry
        </Button>
      </ErrorAlert>
    );
  }

  const result = resultsQuery.data;
  if (!result) {
    return <ErrorAlert message="Results not found." />;
  }

  const scorePercent = result.maximum_points > "0" ? Math.round((parseFloat(result.earned_points) / parseFloat(result.maximum_points)) * 100) : 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-slate-900">{result.quiz_title}</h1>
        <p className="text-sm text-slate-600">Attempt #{result.attempt_number}</p>
      </div>

      <div className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white p-6">
        <span className="text-4xl font-bold text-slate-900">{scorePercent}%</span>
        <span className="text-sm text-slate-600">
          {result.earned_points} / {result.maximum_points} points
        </span>
        <span className={`mt-2 rounded-full px-4 py-1 text-sm font-semibold ${result.passed ? "bg-teal-100 text-teal-700" : "bg-red-100 text-red-700"}`}>
          {result.passed ? "Passed" : "Not passed"}
        </span>
      </div>

      <div className="flex flex-col gap-4">
        {result.questions.map((q) => (
          <div key={q.question} className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-base font-semibold text-slate-900">
                Q{q.question}. {q.prompt}
              </h2>
              <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-semibold ${q.is_correct ? "bg-teal-100 text-teal-700" : "bg-red-100 text-red-700"}`}>
                {q.is_correct ? "Correct" : "Incorrect"}
              </span>
            </div>
            <p className="text-sm text-slate-600">
              {q.question_type === "MULTIPLE_CHOICE" && q.selected_choice != null ? `Selected choice: ${q.selected_choice}` : q.numeric_response != null ? `Answer: ${q.numeric_response}` : "No answer"}
            </p>
            {q.explanation ? (
              <p className="text-sm text-slate-500">{q.explanation}</p>
            ) : null}
            <p className="text-sm font-medium text-slate-700">Points: {q.points_awarded}</p>
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={() => router.back()}>
          Back
        </Button>
        <Button onClick={() => router.push(ROUTES.student.quizzes)}>View quizzes</Button>
      </div>
    </div>
  );
}