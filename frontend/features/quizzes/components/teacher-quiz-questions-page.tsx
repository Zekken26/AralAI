"use client";

import { useState } from "react";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { Dialog } from "@/components/ui/dialog";
import { ROUTES } from "@/lib/routes";
import {
  useApproveTeacherQuestion,
  useTeacherQuiz,
  useTeacherQuizQuestions,
  useRejectTeacherQuestion,
} from "@/features/quizzes/hooks/use-teacher-quizzes";
import { quizMutationErrorMessage } from "@/features/quizzes/utils/quiz-errors";
import { QuestionForm } from "./question-form";
import type { TeacherQuestion } from "@/features/quizzes/schemas/teacher";

const REVIEW_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

function QuestionCard({
  question,
  onEdit,
}: {
  question: TeacherQuestion;
  onEdit: (question: TeacherQuestion) => void;
}) {
  const [approveError, setApproveError] = useState<string | null>(null);
  const approve = useApproveTeacherQuestion(question.quiz);
  const reject = useRejectTeacherQuestion(question.quiz);
  const busy = approve.isPending || reject.isPending;

  const runReview = async (action: "approve" | "reject") => {
    setApproveError(null);
    try {
      if (action === "approve") {
        await approve.mutateAsync(question.id);
      } else {
        await reject.mutateAsync(question.id);
      }
    } catch (error) {
      setApproveError(quizMutationErrorMessage(error));
    }
  };

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-900">{question.prompt}</p>
        <span
          className={`shrink-0 rounded px-2 py-0.5 text-xs font-semibold uppercase ${
            question.review_status === "APPROVED"
              ? "bg-emerald-100 text-emerald-800"
              : question.review_status === "REJECTED"
                ? "bg-red-100 text-red-700"
                : "bg-slate-200 text-slate-600"
          }`}
        >
          {REVIEW_LABELS[question.review_status]}
        </span>
      </div>

      <p className="text-xs text-slate-500">
        {question.question_type === "MULTIPLE_CHOICE" ? "Multiple choice" : "Numeric"} ·{" "}
        {question.points} pts · Difficulty {question.difficulty}/5 · Topic #{question.topic}
        {question.is_ai_generated ? " · AI generated" : ""}
      </p>

      {question.question_type === "MULTIPLE_CHOICE" ? (
        <ul className="flex list-none flex-col gap-1 p-0">
          {question.choices.map((choice) => (
            <li key={choice.id} className="flex items-center gap-2 text-sm text-slate-700">
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  choice.is_correct ? "bg-emerald-500" : "bg-slate-300"
                }`}
                aria-hidden="true"
              />
              {choice.text}
              {choice.is_correct ? (
                <span className="text-xs font-medium text-emerald-700">(correct)</span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-700">
          Numeric answer: {question.numeric_answer ?? "—"}
          {question.numeric_tolerance ? ` (tolerance ±${question.numeric_tolerance})` : ""}
        </p>
      )}

      {approveError ? <ErrorAlert role="status" message={approveError} /> : null}

      <div className="mt-1 flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" disabled={busy} onClick={() => onEdit(question)}>
          Edit
        </Button>
        {question.review_status !== "APPROVED" ? (
          <Button
            size="sm"
            loading={approve.isPending}
            disabled={busy}
            onClick={() => runReview("approve")}
          >
            Approve
          </Button>
        ) : null}
        {question.review_status !== "REJECTED" ? (
          <Button
            variant="secondary"
            size="sm"
            disabled={busy}
            onClick={() => runReview("reject")}
          >
            Reject
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function TeacherQuizQuestionsPage({ quizId }: { quizId: number }) {
  const quizQuery = useTeacherQuiz(quizId);
  const questionsQuery = useTeacherQuizQuestions(quizId);
  const [editing, setEditing] = useState<TeacherQuestion | "new" | null>(null);

  if (quizQuery.isPending || questionsQuery.isPending) {
    return (
      <div className="flex flex-col gap-6" aria-busy="true">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (quizQuery.isError || !quizQuery.data) {
    return (
      <ErrorAlert>
        <p>We could not load this quiz.</p>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            quizQuery.refetch();
            questionsQuery.refetch();
          }}
          className="mt-1"
        >
          Retry
        </Button>
      </ErrorAlert>
    );
  }

  const quiz = quizQuery.data;
  const questions = questionsQuery.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{quiz.title}</h1>
          <p className="mt-1 text-sm text-slate-600">
            {questions.length} question{questions.length === 1 ? "" : "s"} — approve every
            question to make the quiz publishable.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={ROUTES.teacher.quizDetail(quizId)}>
            <Button variant="ghost">&larr; Back to quiz</Button>
          </Link>
          <Button onClick={() => setEditing("new")}>Add question</Button>
        </div>
      </div>

      {questionsQuery.isError ? (
        <ErrorAlert>
          <p>We could not load the questions for this quiz.</p>
          <Button variant="secondary" size="sm" onClick={() => questionsQuery.refetch()} className="mt-1">
            Retry
          </Button>
        </ErrorAlert>
      ) : questions.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
          <p className="text-base font-medium text-slate-800">No questions yet</p>
          <p className="max-w-md text-sm text-slate-600">
            Add multiple-choice or numeric questions. Each question needs approval before the
            quiz can be published.
          </p>
          <Button className="mt-2" onClick={() => setEditing("new")}>
            Add the first question
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {questions.map((question) => (
            <QuestionCard key={question.id} question={question} onEdit={setEditing} />
          ))}
        </div>
      )}

      <Dialog
        open={editing != null}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "Add question" : "Edit question"}
      >
        {editing != null ? (
          <QuestionForm
            quiz={quiz}
            question={editing === "new" ? undefined : editing}
            onDone={() => setEditing(null)}
          />
        ) : null}
      </Dialog>
    </div>
  );
}