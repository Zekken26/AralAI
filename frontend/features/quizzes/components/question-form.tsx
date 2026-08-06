"use client";

import { useEffect, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { ErrorAlert } from "@/components/feedback/error-alert";
import {
  questionWriteSchema,
  type QuestionWriteValues,
  type TeacherQuestion,
  type TeacherQuizDetail,
} from "@/features/quizzes/schemas/teacher";
import {
  useAddTeacherChoice,
  useCreateTeacherQuestion,
  useDeleteTeacherChoice,
  useUpdateTeacherChoice,
  useUpdateTeacherQuestion,
} from "@/features/quizzes/hooks/use-teacher-quizzes";
import { quizMutationErrorMessage } from "@/features/quizzes/utils/quiz-errors";
import { useTeacherLesson } from "@/features/lessons/hooks/use-teacher-lessons";
import { useCurriculumTopic, useSubjects, useSubjectTopics } from "@/features/curriculum/hooks/use-curriculum";

type ChoiceDraft = { key: number; text: string; is_correct: boolean };

let nextKey = 0;
const newKey = () => ++nextKey;

function defaultChoices(question?: TeacherQuestion): ChoiceDraft[] {
  return question && question.question_type === "MULTIPLE_CHOICE"
    ? question.choices.map((choice) => ({
        key: choice.id,
        text: choice.text,
        is_correct: choice.is_correct,
      }))
    : [
        { key: newKey(), text: "", is_correct: false },
        { key: newKey(), text: "", is_correct: false },
      ];
}

/**
 * Question editor used inside the questions dialog. Handles both question
 * types: multiple choice (with a choices editor) and numeric (answer +
 * tolerance). Backend contract: creating a question returns an id, and choices
 * are a separate POST per choice, so the form creates the question first and
 * then adds any non-empty choices. Editing applies choice changes followed by
 * a question PATCH.
 */
export function QuestionForm({
  quiz,
  question,
  onDone,
}: {
  quiz: TeacherQuizDetail;
  question?: TeacherQuestion;
  onDone: () => void;
}) {
  const [formError, setFormError] = useState<string | null>(null);
  const [choiceError, setChoiceError] = useState<string | null>(null);
  const [choices, setChoices] = useState<ChoiceDraft[]>(() => defaultChoices(question));
  const [subjectId, setSubjectId] = useState<number | undefined>();

  const create = useCreateTeacherQuestion(quiz.id);
  const update = useUpdateTeacherQuestion(quiz.id);
  const updateChoiceHook = useUpdateTeacherChoice(quiz.id);
  const addChoice = useAddTeacherChoice(quiz.id);
  const deleteChoice = useDeleteTeacherChoice(quiz.id);

  const isEdit = question != null;
  const busy =
    create.isPending ||
    update.isPending ||
    updateChoiceHook.isPending ||
    addChoice.isPending ||
    deleteChoice.isPending;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<QuestionWriteValues>({
    resolver: zodResolver(questionWriteSchema),
    defaultValues: {
      topic: question?.topic ?? undefined,
      question_type: question?.question_type ?? "MULTIPLE_CHOICE",
      prompt: question?.prompt ?? "",
      explanation: question?.explanation ?? "",
      difficulty: question?.difficulty ?? 1,
      points: question ? Number(question.points) : 1,
      numeric_answer: question?.numeric_answer ?? null,
      numeric_tolerance: question?.numeric_tolerance ?? null,
    },
  });

  const questionType = watch("question_type");

  const subjectsQuery = useSubjects();
  const lessonQuery = useTeacherLesson(quiz.lesson);
  const lessonTopicQuery = useCurriculumTopic(lessonQuery.data?.topic);
  const lessonSubjectId = lessonTopicQuery.data?.subject;

  const topicsQuery = useSubjectTopics(subjectId);
  const subjects = subjectsQuery.data?.results ?? [];
  const topics = topicsQuery.data?.results ?? [];

  useEffect(() => {
    if (subjectId == null && lessonSubjectId != null) {
      setSubjectId(lessonSubjectId);
    }
  }, [lessonSubjectId, subjectId]);

  const topicOptions =
    subjectId != null
      ? topics.map((topic) => ({ value: String(topic.id), label: topic.title }))
      : lessonTopicQuery.data
        ? [{ value: String(lessonTopicQuery.data.id), label: lessonTopicQuery.data.title }]
        : [];

  const onSaveQuestion = async (values: QuestionWriteValues) => {
    setFormError(null);
    setChoiceError(null);
    try {
      if (isEdit) {
        await update.mutateAsync({ questionId: question.id, values });
      } else {
        const created = await create.mutateAsync(values);
        // Attach choices for the newly created question.
        for (const choice of choices) {
          if (choice.text.trim()) {
            await addChoice.mutateAsync({
              questionId: created.id,
              values: {
                text: choice.text,
                is_correct: choice.is_correct,
                sequence_order: 0,
              },
            });
          }
        }
      }
      onDone();
    } catch (error) {
      setFormError(quizMutationErrorMessage(error));
    }
  };

  const onChoiceBlur = (index: number) => {
    const choice = choices[index];
    const original = question?.choices[index];
    if (!original || !choice.text.trim()) {
      return;
    }
    if (choice.text === original.text && choice.is_correct === original.is_correct) {
      return;
    }
    setChoiceError(null);
    updateChoicePatch(original.id, choice);
  };

  const onChooseCorrect = (index: number) => {
    setChoices((prev) => prev.map((choice, i) => ({ ...choice, is_correct: i === index })));
    const original = question?.choices[index];
    if (question && original) {
      setChoiceError(null);
      updateChoicePatch(original.id, { text: original.text, is_correct: true });
    }
  };

  const updateChoicePatch = (choiceId: number, changed: { text: string; is_correct: boolean }) => {
    updateChoiceHook
      .mutateAsync({ choiceId, values: changed })
      .catch((error: unknown) => setChoiceError(quizMutationErrorMessage(error)));
  };

  const onRemoveChoice = (index: number) => {
    setChoiceError(null);
    const original = question?.choices[index];
    if (original) {
      deleteChoice.mutate(original.id, {
        onError: (error) => setChoiceError(quizMutationErrorMessage(error)),
      });
    }
    setChoices((prev) => prev.filter((_, i) => i !== index));
  };

  const setChoiceText = (index: number, text: string) => {
    setChoices((prev) => prev.map((choice, i) => (i === index ? { ...choice, text } : choice)));
  };

  return (
    <form onSubmit={handleSubmit(onSaveQuestion)} className="flex flex-col gap-4" noValidate>
      {formError ? <ErrorAlert message={formError} /> : null}

      <Select
        label="Question type"
        options={[
          { value: "MULTIPLE_CHOICE", label: "Multiple choice" },
          { value: "NUMERIC", label: "Numeric answer" },
        ]}
        value={questionType}
        onChange={(event) => setValue("question_type", event.target.value as "MULTIPLE_CHOICE" | "NUMERIC")}
      />

      <Select
        label="Subject"
        options={subjects.map((subject) => ({
          value: String(subject.id),
          label: subject.name,
        }))}
        value={subjectId == null ? "" : String(subjectId)}
        onChange={(event) => setSubjectId(event.target.value ? Number(event.target.value) : undefined)}
      />

      <Select
        label="Topic"
        options={topicOptions}
        error={errors.topic?.message}
        {...register("topic", { valueAsNumber: true })}
      />

      <Textarea
        label="Prompt"
        rows={3}
        placeholder="Write the question students will answer."
        error={errors.prompt?.message}
        {...register("prompt")}
      />
      <Textarea
        label="Explanation"
        rows={2}
        placeholder="Optional — shown to students in the results view."
        error={errors.explanation?.message}
        {...register("explanation")}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label="Difficulty"
          options={[1, 2, 3, 4, 5].map((value) => ({
            value: String(value),
            label: `${value} / 5`,
          }))}
          error={errors.difficulty?.message}
          {...register("difficulty", { valueAsNumber: true })}
        />
        <Input
          label="Points"
          type="number"
          min={0.01}
          step="0.01"
          error={errors.points?.message}
          {...register("points", { valueAsNumber: true })}
        />
      </div>

      {questionType === "NUMERIC" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Numeric answer"
            type="number"
            step="any"
            error={errors.numeric_answer?.message}
            {...register("numeric_answer")}
          />
          <Input
            label="Tolerance"
            type="number"
            min={0}
            step="any"
            hint="Optional — accepted deviation from the answer."
            error={errors.numeric_tolerance?.message}
            {...register("numeric_tolerance")}
          />
        </div>
      ) : (
        <fieldset className="flex flex-col gap-3">
          <legend className="text-sm font-medium text-slate-800">
            Choices — mark the correct one
          </legend>
          {choiceError ? <ErrorAlert role="status" message={choiceError} /> : null}
          <p className="text-sm text-slate-500">
            At least two choices with exactly one correct answer are required for approval.
          </p>
          {choices.map((choice, index) => (
            <div key={choice.key} className="flex items-start gap-2">
              <label className="mt-7 flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="radio"
                  name="correct-choice"
                  checked={choice.is_correct}
                  onChange={() => onChooseCorrect(index)}
                  className="h-4 w-4 text-teal-600 focus:ring-teal-600"
                />
                Correct
              </label>
              <Input
                label={`Choice ${index + 1}`}
                placeholder="Enter a choice"
                value={choice.text}
                onChange={(event) => setChoiceText(index, event.target.value)}
                onBlur={() => onChoiceBlur(index)}
              />
              <Button
                type="button"
                variant="ghost"
                className="mt-7 shrink-0"
                aria-label={`Remove choice ${index + 1}`}
                onClick={() => onRemoveChoice(index)}
                disabled={choices.length <= 1}
              >
                Remove
              </Button>
            </div>
          ))}
          <div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() =>
                setChoices((prev) => [...prev, { key: newKey(), text: "", is_correct: false }])
              }
            >
              Add choice
            </Button>
          </div>
        </fieldset>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" loading={busy} disabled={busy}>
          {busy ? "Saving…" : isEdit ? "Save changes" : "Add question"}
        </Button>
      </div>
    </form>
  );
}