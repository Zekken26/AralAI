"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { ROUTES } from "@/lib/routes";
import { lessonCreateSchema } from "@/features/lessons/schemas";
import {
  useCreateLesson,
  useTeacherLesson,
  useUpdateLesson,
} from "@/features/lessons/hooks/use-teacher-lessons";
import { lessonMutationErrorMessage } from "@/features/lessons/utils/lesson-errors";
import { useTeacherClassrooms } from "@/features/classrooms/hooks/use-teacher-classrooms";
import { useSubjects, useSubjectTopics } from "@/features/curriculum/hooks/use-curriculum";
import type { Lesson, LessonCreateValues } from "@/types/lessons";

/**
 * Topic options used by the form. When editing, the lesson payload only
 * carries a topic id (no subject), so until the teacher picks a subject we
 * offer the existing topic directly under its id.
 */
function useTopicOptions(lesson?: Lesson) {
  const [subjectId, setSubjectId] = useState<number | undefined>();
  const topicsQuery = useSubjectTopics(subjectId);

  const topics = topicsQuery.data?.results ?? [];
  const options =
    subjectId != null
      ? topics.map((topic) => ({ value: String(topic.id), label: topic.title }))
      : lesson
        ? [{ value: String(lesson.topic), label: `Topic #${lesson.topic}` }]
        : [];

  return { subjectId, setSubjectId, options };
}

export function TeacherLessonForm({
  lesson,
  onSaved,
}: {
  lesson?: Lesson;
  onSaved: (lessonId: number) => void;
}) {
  const router = useRouter();
  const classroomsQuery = useTeacherClassrooms();
  const subjectsQuery = useSubjects();
  const { subjectId, setSubjectId, options: topicOptions } = useTopicOptions(lesson);

  const create = useCreateLesson();
  const update = useUpdateLesson(lesson?.id);
  const isPending = create.isPending || update.isPending;

  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LessonCreateValues>({
    resolver: zodResolver(lessonCreateSchema),
    defaultValues: {
      classroom: lesson?.classroom ?? undefined,
      topic: lesson?.topic ?? undefined,
      title: lesson?.title ?? "",
      summary: lesson?.summary ?? "",
      learning_objectives:
        lesson && lesson.learning_objectives.length > 0 ? lesson.learning_objectives : [""],
      content: lesson?.content ?? "",
    },
  });

  const objectives = useWatch({ control, name: "learning_objectives" }) ?? [];
  const updateObjective = (index: number, value: string) =>
    setValue(`learning_objectives.${index}`, value);
  const removeObjective = (index: number) =>
    setValue("learning_objectives", objectives.filter((_, i) => i !== index));
  const addObjective = () => setValue("learning_objectives", [...objectives, ""]);

  const onSubmit = async (values: LessonCreateValues) => {
    setFormError(null);
    try {
      const result = lesson
        ? await update.mutateAsync(values)
        : await create.mutateAsync(values);
      onSaved(result.id);
    } catch (error) {
      setFormError(lessonMutationErrorMessage(error));
    }
  };

  const classrooms = classroomsQuery.data?.results ?? [];
  const subjects = subjectsQuery.data?.results ?? [];

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
        />

        <Select
          label="Subject"
          placeholder="Choose a subject"
          options={subjects.map((subject) => ({
            value: String(subject.id),
            label: subject.name,
          }))}
          value={subjectId == null ? "" : String(subjectId)}
          onChange={(event) => setSubjectId(event.target.value ? Number(event.target.value) : undefined)}
        />

        <Select
          label="Topic"
          placeholder="Choose a topic"
          options={topicOptions}
          error={errors.topic?.message}
          {...register("topic", { valueAsNumber: true })}
        />

        <Input
          label="Title"
          placeholder="e.g. Solving linear equations"
          error={errors.title?.message}
          {...register("title")}
        />
        <Textarea
          label="Summary"
          rows={3}
          placeholder="A one-line description of this lesson."
          error={errors.summary?.message}
          {...register("summary")}
        />

        <fieldset className="flex flex-col gap-3">
          <legend className="text-sm font-medium text-slate-800">Learning objectives</legend>
          {objectives.map((_, index) => (
            <div key={index} className="flex items-start gap-2">
              <Input
                label={`Objective ${index + 1}`}
                value={objectives[index] ?? ""}
                onChange={(event) => updateObjective(index, event.target.value)}
                error={errors.learning_objectives?.[index]?.message}
              />
              <Button
                type="button"
                variant="ghost"
                className="mt-7 shrink-0"
                aria-label={`Remove objective ${index + 1}`}
                onClick={() => removeObjective(index)}
                disabled={objectives.length <= 1}
              >
                Remove
              </Button>
            </div>
          ))}
          <div>
            <Button type="button" variant="secondary" size="sm" onClick={addObjective}>
              Add objective
            </Button>
          </div>
        </fieldset>

        <Textarea
          label="Content"
          rows={10}
          placeholder="Write the lesson body here. Structure it into paragraphs with blank lines."
          error={errors.content?.message}
          {...register("content")}
        />

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push(ROUTES.teacher.lessons)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="submit" loading={isPending} disabled={isPending}>
            {isPending ? "Saving…" : lesson ? "Save changes" : "Create lesson"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

export function TeacherLessonCreatePage() {
  const router = useRouter();
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">New lesson</h1>
        <p className="mt-1 text-sm text-slate-600">
          Write a lesson, then publish it so students in the classroom can read it.
        </p>
      </div>
      <TeacherLessonForm onSaved={(lessonId) => router.push(ROUTES.teacher.lessonDetail(lessonId))} />
    </div>
  );
}

export function TeacherLessonEditPage({ lessonId }: { lessonId: number }) {
  const router = useRouter();
  const lessonQuery = useTeacherLesson(lessonId);

  if (lessonQuery.isPending) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-96 w-full" aria-busy="true" />
      </div>
    );
  }

  if (lessonQuery.isError || !lessonQuery.data) {
    return (
      <ErrorAlert>
        <p>We could not load this lesson.</p>
        <Button variant="secondary" size="sm" onClick={() => lessonQuery.refetch()} className="mt-1">
          Retry
        </Button>
      </ErrorAlert>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Edit lesson</h1>
        <p className="mt-1 text-sm text-slate-600">Update the lesson details below.</p>
      </div>
      <TeacherLessonForm
        lesson={lessonQuery.data}
        onSaved={() => router.push(ROUTES.teacher.lessonDetail(lessonId))}
      />
    </div>
  );
}