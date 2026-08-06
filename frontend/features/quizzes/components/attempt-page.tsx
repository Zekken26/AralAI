"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { ROUTES } from "@/lib/routes";
import { useAttempt } from "@/features/quizzes/hooks/use-quizzes";
import { useQuizDetail } from "@/features/quizzes/hooks/use-quizzes";
import { useSaveAnswer } from "@/features/quizzes/hooks/use-quizzes";
import { useSubmitAttempt } from "@/features/quizzes/hooks/use-quizzes";
import { attemptErrorMessage } from "@/features/quizzes/utils/errors";
import type { Question, Answer } from "@/features/quizzes/types";

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function AttemptPage({ attemptId }: { attemptId: number }) {
  const router = useRouter();
  const attemptQuery = useAttempt(attemptId);
  const saveAnswer = useSaveAnswer(attemptId);
  const submitAttempt = useSubmitAttempt();
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingAnswersRef = useRef<Map<number, { selected_choice?: number | null; numeric_response?: string | null }>>(new Map());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const attempt = attemptQuery.data;
  const quizId = attempt?.quiz;
  const quizDetailQuery = useQuizDetail(quizId);
  const questions = quizDetailQuery.data?.questions ?? [];
  const answers = attempt?.answers ?? [];

  const getAnswerForQuestion = (questionId: number): Answer | undefined => {
    return answers.find((a) => a.question === questionId);
  };

  useEffect(() => {
    if (!attempt?.expires_at) return;
    const expiresAt = new Date(attempt.expires_at).getTime();

    const update = () => {
      const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setTimeRemaining(remaining);
      if (remaining <= 0 && intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };

    update();
    intervalRef.current = setInterval(update, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [attempt?.expires_at]);

  const handleAnswerChange = useCallback(
    (questionId: number, field: "selected_choice" | "numeric_response", value: number | string | null) => {
      pendingAnswersRef.current.set(questionId, {
        ...(pendingAnswersRef.current.get(questionId) ?? {}),
        [field]: value,
      });

      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
      autosaveTimerRef.current = setTimeout(() => {
        const payload = pendingAnswersRef.current.get(questionId);
        if (payload) {
          saveAnswer.mutate(
            { questionId, payload },
            {
              onError: (err) => {
                setError(attemptErrorMessage(err));
              },
            },
          );
        }
      }, 1000);
    },
    [saveAnswer],
  );

  const handleSubmit = async () => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }
    for (const [questionId, payload] of pendingAnswersRef.current) {
      try {
        await saveAnswer.mutateAsync({ questionId, payload });
      } catch {
        // ignore autosave errors on submit
      }
    }
    pendingAnswersRef.current.clear();

    try {
      const result = await submitAttempt.mutateAsync(attemptId);
      router.push(ROUTES.student.attemptResults(result.id));
    } catch (err) {
      setError(attemptErrorMessage(err));
    }
  };

  if (attemptQuery.isPending || quizDetailQuery.isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (attemptQuery.isError) {
    return (
      <ErrorAlert>
        <p>We could not load this attempt.</p>
        <Button variant="secondary" size="sm" onClick={() => attemptQuery.refetch()} className="mt-1">
          Retry
        </Button>
      </ErrorAlert>
    );
  }

  if (!attempt) {
    return <ErrorAlert message="Attempt not found." />;
  }

  if (attempt.status === "SUBMITTED") {
    router.push(ROUTES.student.attemptResults(attempt.id));
    return null;
  }

  if (attempt.status === "EXPIRED") {
    return <ErrorAlert message="This attempt has expired. Please contact your teacher." />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Attempt #{attempt.attempt_number}</h1>
        {timeRemaining != null ? (
          <span className="text-sm font-medium text-slate-600">Time remaining: {formatTime(timeRemaining)}</span>
        ) : null}
      </div>

      {error ? <ErrorAlert message={error} /> : null}

      <div className="flex flex-col gap-4">
        {questions.length === 0 ? (
          <EmptyState title="No questions" description="This quiz has no questions yet." />
        ) : (
          questions.map((question: Question) => (
            <QuestionCard
              key={question.id}
              question={question}
              existingAnswer={getAnswerForQuestion(question.id)}
              onChange={(field, value) => handleAnswerChange(question.id, field, value)}
            />
          ))
        )}
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSubmit} loading={submitAttempt.isPending}>
          Submit attempt
        </Button>
      </div>
    </div>
  );
}

function QuestionCard({
  question,
  existingAnswer,
  onChange,
}: {
  question: Question;
  existingAnswer?: Answer;
  onChange: (field: "selected_choice" | "numeric_response", value: number | string | null) => void;
}) {
  const [numericValue, setNumericValue] = useState("");

  const handleNumericChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNumericValue(value);
    onChange("numeric_response", value || null);
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-900">
          Q{question.sequence_order}. {question.prompt}
        </h2>
        <span className="shrink-0 rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
          {question.points} pts
        </span>
      </div>

      {question.question_type === "MULTIPLE_CHOICE" ? (
        <div className="flex flex-col gap-2" role="radiogroup" aria-label={`Question ${question.sequence_order}`}>
          {question.choices.map((choice) => (
            <label
              key={choice.id}
              className="flex items-center gap-3 rounded-lg border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50"
            >
              <input
                type="radio"
                name={`question-${question.id}`}
                checked={existingAnswer?.selected_choice === choice.id}
                onChange={() => onChange("selected_choice", choice.id)}
                className="accent-teal-600"
              />
              {choice.text}
            </label>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <input
            type="text"
            inputMode="decimal"
            value={numericValue}
            onChange={handleNumericChange}
            placeholder="Enter a number"
            className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600/40 focus:border-teal-600"
          />
        </div>
      )}
    </div>
  );
}