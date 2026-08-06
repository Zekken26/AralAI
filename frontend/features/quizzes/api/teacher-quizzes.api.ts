import { apiRequest } from "@/lib/api-client";
import { parseOrThrow } from "@/lib/parse-or-throw";

import {
  attemptAnalyticsListSchema,
  classroomQuizResultListSchema,
  quizResultsSummarySchema,
  teacherChoiceSchema,
  teacherQuestionListSchema,
  teacherQuestionSchema,
  teacherQuizDetailSchema,
  teacherQuizListSchema,
  teacherQuizWriteSchema,
} from "@/features/quizzes/schemas/teacher";
import type {
  AttemptAnalyticsList,
  ClassroomQuizResultList,
  QuizCreateValues,
  QuizResultsSummary,
  TeacherChoice,
  TeacherQuestion,
  TeacherQuestionList,
  TeacherQuizDetail,
  TeacherQuizList,
  TeacherQuizWrite,
} from "@/features/quizzes/schemas/teacher";

export type TeacherQuizListParams = {
  classroom?: number;
  topic?: number;
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  page?: number;
};

export function listTeacherQuizzesRequest(
  params: TeacherQuizListParams = {},
): Promise<TeacherQuizList> {
  return apiRequest<unknown>({ method: "GET", url: "/quizzes/", params }).then((data) =>
    parseOrThrow(teacherQuizListSchema, data),
  );
}

export function getTeacherQuizRequest(quizId: number): Promise<TeacherQuizDetail> {
  return apiRequest<unknown>({ method: "GET", url: `/quizzes/${quizId}/` }).then((data) =>
    parseOrThrow(teacherQuizDetailSchema, data),
  );
}

export function createTeacherQuizRequest(values: QuizCreateValues): Promise<TeacherQuizWrite> {
  return apiRequest<unknown>({ method: "POST", url: "/quizzes/", data: values }).then((data) =>
    parseOrThrow(teacherQuizWriteSchema, data),
  );
}

export function updateTeacherQuizRequest(
  quizId: number,
  values: Partial<QuizCreateValues>,
): Promise<TeacherQuizDetail> {
  return apiRequest<unknown>({
    method: "PATCH",
    url: `/quizzes/${quizId}/`,
    data: values,
  }).then((data) => parseOrThrow(teacherQuizDetailSchema, data));
}

export function publishTeacherQuizRequest(quizId: number): Promise<TeacherQuizWrite> {
  return apiRequest<unknown>({
    method: "POST",
    url: `/quizzes/${quizId}/publish/`,
  }).then((data) => parseOrThrow(teacherQuizWriteSchema, data));
}

export function archiveTeacherQuizRequest(quizId: number): Promise<TeacherQuizWrite> {
  return apiRequest<unknown>({
    method: "POST",
    url: `/quizzes/${quizId}/archive/`,
  }).then((data) => parseOrThrow(teacherQuizWriteSchema, data));
}

/** Questions of an owned quiz (plain array, ordered by sequence_order). */
export function listTeacherQuestionsRequest(quizId: number): Promise<TeacherQuestionList> {
  return apiRequest<unknown>({
    method: "GET",
    url: `/quizzes/${quizId}/questions/`,
  }).then((data) => parseOrThrow(teacherQuestionListSchema, data));
}

export function createTeacherQuestionRequest(
  quizId: number,
  values: Record<string, unknown>,
): Promise<TeacherQuestion> {
  return apiRequest<unknown>({
    method: "POST",
    url: `/quizzes/${quizId}/questions/`,
    data: values,
  }).then((data) => parseOrThrow(teacherQuestionSchema, data));
}

export function updateTeacherQuestionRequest(
  questionId: number,
  values: Record<string, unknown>,
): Promise<TeacherQuestion> {
  return apiRequest<unknown>({
    method: "PATCH",
    url: `/questions/${questionId}/`,
    data: values,
  }).then((data) => parseOrThrow(teacherQuestionSchema, data));
}

export function approveTeacherQuestionRequest(questionId: number): Promise<TeacherQuestion> {
  return apiRequest<unknown>({
    method: "POST",
    url: `/questions/${questionId}/approve/`,
  }).then((data) => parseOrThrow(teacherQuestionSchema, data));
}

export function rejectTeacherQuestionRequest(questionId: number): Promise<TeacherQuestion> {
  return apiRequest<unknown>({
    method: "POST",
    url: `/questions/${questionId}/reject/`,
  }).then((data) => parseOrThrow(teacherQuestionSchema, data));
}

export function addTeacherChoiceRequest(
  questionId: number,
  values: { text: string; is_correct?: boolean; sequence_order?: number },
): Promise<TeacherChoice> {
  return apiRequest<unknown>({
    method: "POST",
    url: `/questions/${questionId}/choices/`,
    data: values,
  }).then((data) => parseOrThrow(teacherChoiceSchema, data));
}

export function updateTeacherChoiceRequest(
  choiceId: number,
  values: { text?: string; is_correct?: boolean; sequence_order?: number },
): Promise<TeacherChoice> {
  return apiRequest<unknown>({
    method: "PATCH",
    url: `/choices/${choiceId}/`,
    data: values,
  }).then((data) => parseOrThrow(teacherChoiceSchema, data));
}

export function deleteTeacherChoiceRequest(choiceId: number): Promise<void> {
  return apiRequest<unknown>({
    method: "DELETE",
    url: `/choices/${choiceId}/`,
  }).then(() => undefined);
}

/** Paginated student attempts on an owned quiz (teacher results view). */
export function listTeacherQuizAttemptsRequest(quizId: number): Promise<AttemptAnalyticsList> {
  return apiRequest<unknown>({
    method: "GET",
    url: `/quizzes/${quizId}/attempts/`,
  }).then((data) => parseOrThrow(attemptAnalyticsListSchema, data));
}

/** Aggregate performance summary for an owned quiz. */
export function getTeacherQuizResultsRequest(quizId: number): Promise<QuizResultsSummary> {
  return apiRequest<unknown>({
    method: "GET",
    url: `/quizzes/${quizId}/results-summary/`,
  }).then((data) => parseOrThrow(quizResultsSummarySchema, data));
}

/** Per-quiz performance aggregates for an owned classroom. */
export function listClassroomQuizResultsRequest(classroomId: number): Promise<ClassroomQuizResultList> {
  return apiRequest<unknown>({
    method: "GET",
    url: `/classrooms/${classroomId}/quiz-results/`,
  }).then((data) => parseOrThrow(classroomQuizResultListSchema, data));
}