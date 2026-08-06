import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  listQuizzesRequest,
  getQuizRequest,
  startAttemptRequest,
  getAttemptRequest,
  saveAnswerRequest,
  submitAttemptRequest,
  getAttemptResultsRequest,
} from "@/features/quizzes/api/quizzes.api";
import type { Attempt } from "@/features/quizzes/types";

export const STUDENT_QUIZZES_KEY = ["quizzes", "student"] as const;

export function quizListKey(params?: { classroom?: number; topic?: number; status?: string; page?: number }) {
  return ["quizzes", "student", params ?? {}] as const;
}

export function quizDetailKey(quizId: number) {
  return ["quizzes", quizId] as const;
}

export function attemptKey(attemptId: number) {
  return ["attempts", attemptId] as const;
}

export function useStudentQuizzes(params?: { classroom?: number; topic?: number; status?: string; page?: number }) {
  return useQuery({
    queryKey: quizListKey(params),
    queryFn: () => listQuizzesRequest(params),
  });
}

export function useQuizDetail(quizId?: number) {
  return useQuery({
    queryKey: quizDetailKey(quizId ?? 0),
    queryFn: () => getQuizRequest(quizId as number),
    enabled: quizId != null,
  });
}

export function useStartAttempt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (quizId: number) => startAttemptRequest(quizId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["attempts", data.id] });
    },
  });
}

export function useAttempt(attemptId?: number) {
  return useQuery({
    queryKey: attemptKey(attemptId ?? 0),
    queryFn: () => getAttemptRequest(attemptId as number),
    enabled: attemptId != null,
  });
}

export function useSaveAnswer(attemptId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ questionId, payload }: { questionId: number; payload: { selected_choice?: number | null; numeric_response?: string | null } }) =>
      saveAnswerRequest(attemptId, questionId, payload),
    onSuccess: (data) => {
      queryClient.setQueryData(attemptKey(attemptId), (old: unknown) => {
        if (!old) return old;
        const attempt = old as Attempt;
        const existingIndex = attempt.answers.findIndex((a) => a.question === data.question);
        const newAnswers = [...attempt.answers];
        if (existingIndex >= 0) {
          newAnswers[existingIndex] = data;
        } else {
          newAnswers.push(data);
        }
        return { ...attempt, answers: newAnswers };
      });
    },
  });
}

export function useSubmitAttempt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (attemptId: number) => submitAttemptRequest(attemptId),
    onSuccess: (data) => {
      queryClient.setQueryData(attemptKey(data.id), data);
      queryClient.invalidateQueries({ queryKey: ["quizzes", "student"] });
    },
  });
}

export function useAttemptResults(attemptId?: number) {
  return useQuery({
    queryKey: ["attempts", attemptId ?? 0, "results"],
    queryFn: () => getAttemptResultsRequest(attemptId as number),
    enabled: attemptId != null,
  });
}