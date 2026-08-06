"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { ROUTES } from "@/lib/routes";
import { useQuizDetail } from "@/features/quizzes/hooks/use-quizzes";
import { useStartAttempt } from "@/features/quizzes/hooks/use-quizzes";
import { quizUnavailableMessage } from "@/features/quizzes/utils/errors";

export function QuizDetailPage({ quizId }: { quizId: number }) {
  const router = useRouter();
  const detailQuery = useQuizDetail(quizId);
  const startAttempt = useStartAttempt();
  const [error, setError] = useState<string | null>(null);

  if (detailQuery.isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    );
  }

  if (detailQuery.isError) {
    return (
      <ErrorAlert>
        <p>We could not load this quiz. Please try again.</p>
        <Button variant="secondary" size="sm" onClick={() => detailQuery.refetch()} className="mt-1">
          Retry
        </Button>
      </ErrorAlert>
    );
  }

  const quiz = detailQuery.data;
  if (!quiz) {
    return <EmptyState title="Quiz not found" description="The quiz you are looking for does not exist." />;
  }

  const handleStart = async () => {
    setError(null);
    try {
      const attempt = await startAttempt.mutateAsync(quizId);
      router.push(ROUTES.student.attemptDetail(attempt.id));
    } catch (err) {
      setError(quizUnavailableMessage(err));
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{quiz.title}</h1>
        {quiz.instructions ? <p className="mt-2 text-sm text-slate-600 whitespace-pre-wrap">{quiz.instructions}</p> : null}
      </div>

      <div className="flex flex-wrap gap-4 text-sm text-slate-600">
        <span>{quiz.question_count} questions</span>
        {quiz.time_limit_minutes ? <span>{quiz.time_limit_minutes} minutes</span> : null}
        {quiz.attempt_limit ? <span>{quiz.attempt_limit} attempt{quiz.attempt_limit !== 1 ? "s" : ""} allowed</span> : null}
        <span>Passing score: {quiz.passing_score}%</span>
      </div>

      {error ? <ErrorAlert message={error} /> : null}

      <Button onClick={handleStart} loading={startAttempt.isPending}>
        Start attempt
      </Button>
    </div>
  );
}