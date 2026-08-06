import { apiRequest } from "@/lib/api-client";
import { parseOrThrow } from "@/lib/parse-or-throw";
import {
  attemptResultSchema,
  attemptSerializerSchema,
  quizListSchema,
  savedAnswerSchema,
  studentQuizDetailSchema,
} from "@/features/quizzes/schemas";
import type { QuizList, Attempt, SavedAnswer, AttemptResult, StudentQuizDetail } from "@/features/quizzes/types";

export function listQuizzesRequest(params?: { classroom?: number; topic?: number; status?: string; page?: number }): Promise<QuizList> {
  const search = new URLSearchParams();
  if (params?.classroom != null) search.set("classroom", String(params.classroom));
  if (params?.topic != null) search.set("topic", String(params.topic));
  if (params?.status) search.set("status", params.status);
  if (params?.page != null) search.set("page", String(params.page));
  const qs = search.toString();
  return apiRequest<unknown>({ method: "GET", url: `/students/me/quizzes/${qs ? `?${qs}` : ""}` }).then((data) =>
    parseOrThrow(quizListSchema, data),
  );
}

export function getQuizRequest(quizId: number): Promise<StudentQuizDetail> {
  return apiRequest<unknown>({ method: "GET", url: `/quizzes/${quizId}/` }).then((data) =>
    parseOrThrow(studentQuizDetailSchema, data),
  );
}

export function startAttemptRequest(quizId: number): Promise<Attempt> {
  return apiRequest<unknown>({ method: "POST", url: `/quizzes/${quizId}/attempts/` }).then((data) =>
    parseOrThrow(attemptSerializerSchema, data),
  );
}

export function getAttemptRequest(attemptId: number): Promise<Attempt> {
  return apiRequest<unknown>({ method: "GET", url: `/attempts/${attemptId}/` }).then((data) =>
    parseOrThrow(attemptSerializerSchema, data),
  );
}

export function saveAnswerRequest(attemptId: number, questionId: number, payload: { selected_choice?: number | null; numeric_response?: string | null }): Promise<SavedAnswer> {
  return apiRequest<unknown>({
    method: "PUT",
    url: `/attempts/${attemptId}/answers/${questionId}/`,
    data: payload,
  }).then((data) => parseOrThrow(savedAnswerSchema, data));
}

export function submitAttemptRequest(attemptId: number): Promise<AttemptResult> {
  return apiRequest<unknown>({ method: "POST", url: `/attempts/${attemptId}/submit/` }).then((data) =>
    parseOrThrow(attemptResultSchema, data),
  );
}

export function getAttemptResultsRequest(attemptId: number): Promise<AttemptResult> {
  return apiRequest<unknown>({ method: "GET", url: `/attempts/${attemptId}/results/` }).then((data) =>
    parseOrThrow(attemptResultSchema, data),
  );
}