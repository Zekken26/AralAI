"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { ROUTES } from "@/lib/routes";
import { quizCreateSchema } from "@/features/quizzes/schemas/teacher";
import {
  useCreateTeacherQuiz,
  useTeacherQuiz,
  useUpdateTeacherQuiz,
} from "@/features/quizzes/hooks/use-teacher-quizzes";
import { quizMutationErrorMessage } from "@/features/quizzes/utils/quiz-errors";
import { useTeacherClassrooms } from "@/features/classrooms/hooks/use-teacher-classrooms";
import { useTeacherLessons } from "@/features/lessons/hooks/use-teacher-lessons";
import type { QuizCreateValues } from "@/features/quizzes/schemas/teacher";

function CheckboxField({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 ${
        disabled ? "opacity-60" : "hover:bg-slate-50"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        disabled={disabled}
        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-600"
      />
      <span className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-slate-800">{label}</span>
        {hint ? <span className="text-sm text-slate-600">{hint}</span> : null}
      </span>
    </label>
  );
}

export function TeacherQuizForm({
  quizId,
  onSaved,
}: {
  quizId?: number;
  onSaved: (quizId: number) => void;
}) {
  const router = useRouter();
  const classroomsQuery = useTeacherClassrooms();
  const editQuery = useTeacherQuiz(quizId);
  const quiz = editQuery.data;

  const [classroomId, setClassroomId] = useState<number | undefined>(quiz?.classroom);
  const lessonsQuery = useTeacherLessons(
    { classroom: classroomId },
    { enabled: classroomId != null },
  );

  const create = useCreateTeacherQuiz();
  const update = useUpdateTeacherQuiz(quizId);
  const isPending = create.isPending || update.isPending;

  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<QuizCreateValues>({
    resolver: zodResolver(quizCreateSchema),
    defaultValues: {
      lesson: quiz?.lesson,
      classroom: quiz?.classroom,
      title: quiz?.title ?? "",
      instructions: quiz?.instructions ?? "",
      attempt_limit: quiz?.attempt_limit ?? undefined,
      time_limit_minutes: quiz?.time_limit_minutes ?? undefined,
      available_from: quiz?.available_from ?? null,
      available_until: quiz?.available_until ?? null,
      passing_score: quiz ? Number(quiz.passing_score) : 0,
      randomize_questions: quiz?.randomize_questions ?? false,
      show_results_immediately: quiz?.show_results_immediately ?? true,
    },
  });

  if (quizId && editQuery.isPending) {
    return null;
  }

  const classrooms = classroomsQuery.data?.results ?? [];
  const lessons = lessonsQuery.data?.results ?? [];

  const onSubmit = async (values: QuizCreateValues) => {
    setFormError(null);
    const payload = normalizePayload(values);
    try {
      const result = quizId
        ? await update.mutateAsync(payload)
        : await create.mutateAsync(payload);
      onSaved(result.id);
    } catch (error) {
      setFormError(quizMutationErrorMessage(error));
    }
  };

  return (
    <Card>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        {formError ? <ErrorAlert message={formError} /> : null}

        <Select
          label="Classroom"
          placeholder="Choose a classroom"
          options={classrooms.map((classroom) => ({
            value: String(classroom.id),
            label: classroom.name,
          }))}
          error={errors.classroom?.message}
          {...register("classroom", { valueAsNumber: true })}
          onChange={(event) => {
            const value = event.target.value ? Number(event.target.value) : undefined;
            setValue("classroom", value as number);
            setClassroomId(value);
          }}
        />

        <Select
          label="Lesson"
          placeholder="Choose a lesson"
          hint="You can only attach a quiz to a lesson from the selected classroom."
          options={lessons.map((lesson) => ({
            value: String(lesson.id),
            label: `${lesson.title} (${lesson.status.toLowerCase()})`,
          }))}
          error={errors.lesson?.message}
          {...register("lesson", { valueAsNumber: true })}
        />

        <Input
          label="Title"
          placeholder="e.g. Linear equations check"
          error={errors.title?.message}
          {...register("title")}
        />
        <Textarea
          label="Instructions"
          rows={3}
          placeholder="Tell students how to complete this quiz."
          error={errors.instructions?.message}
          {...register("instructions")}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Attempt limit"
            type="number"
            min={1}
            placeholder="Unlimited"
            hint="Leave empty for unlimited attempts."
            error={errors.attempt_limit?.message}
            {...register("attempt_limit", { setValueAs: (value) => (value === "" ? null : Number(value)) })}
          />
          <Input
            label="Time limit (minutes)"
            type="number"
            min={1}
            placeholder="No limit"
            hint="Leave empty for no time limit."
            error={errors.time_limit_minutes?.message}
            {...register("time_limit_minutes", {
              setValueAs: (value) => (value === "" ? null : Number(value)),
            })}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Available from"
            type="datetime-local"
            hint="Optional — when the quiz opens."
            error={errors.available_from?.message}
            {...register("available_from", {
              setValueAs: (value) => (value === "" ? null : value),
            })}
          />
          <Input
            label="Available until"
            type="datetime-local"
            hint="Optional — when the quiz closes."
            error={errors.available_until?.message}
            {...register("available_until", {
              setValueAs: (value) => (value === "" ? null : value),
            })}
          />
        </div>

        <Input
          label="Passing score (%)"
          type="number"
          min={0}
          max={100}
          step="0.01"
          error={errors.passing_score?.message}
          {...register("passing_score", { valueAsNumber: true })}
        />

        <div className="flex flex-col gap-2">
          <CheckboxField
            label="Randomize questions"
            hint="Shuffle question order for each attempt."
            checked={watch("randomize_questions")}
            onChange={(checked) => setValue("randomize_questions", checked)}
          />
          <CheckboxField
            label="Show results immediately"
            hint="Show the student their score right after submitting."
            checked={watch("show_results_immediately")}
            onChange={(checked) => setValue("show_results_immediately", checked)}
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push(ROUTES.teacher.quizzes)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="submit" loading={isPending} disabled={isPending}>
            {isPending ? "Saving…" : quiz ? "Save changes" : "Create quiz"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

export function TeacherQuizCreatePage() {
  const router = useRouter();
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">New quiz</h1>
        <p className="mt-1 text-sm text-slate-600">
          Build a quiz for a published lesson, add questions, and publish it when it is ready.
        </p>
      </div>
      <TeacherQuizForm onSaved={(quizId) => router.push(ROUTES.teacher.quizQuestions(quizId))} />
    </div>
  );
}

/**
 * `datetime-local` inputs produce `YYYY-MM-DDTHH:mm` values without a timezone.
 * The backend expects timezone-aware ISO datetimes, so convert non-empty
 * values to the ISO 8601 UTC form the API accepts.
 */
function normalizePayload(values: QuizCreateValues): QuizCreateValues {
  return {
    ...values,
    available_from: values.available_from ? new Date(values.available_from).toISOString() : null,
    available_until: values.available_until ? new Date(values.available_until).toISOString() : null,
  };
}

export function TeacherQuizEditPage({ quizId }: { quizId: number }) {
  const router = useRouter();
  const quizQuery = useTeacherQuiz(quizId);

  if (quizQuery.isPending) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-96 w-full" aria-busy="true" />
      </div>
    );
  }

  if (quizQuery.isError || !quizQuery.data) {
    return (
      <ErrorAlert>
        <p>We could not load this quiz.</p>
        <Button variant="secondary" size="sm" onClick={() => quizQuery.refetch()} className="mt-1">
          Retry
        </Button>
      </ErrorAlert>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Edit quiz</h1>
        <p className="mt-1 text-sm text-slate-600">Update the quiz settings below.</p>
      </div>
      <TeacherQuizForm quizId={quizId} onSaved={() => router.push(ROUTES.teacher.quizDetail(quizId))} />
    </div>
  );
}