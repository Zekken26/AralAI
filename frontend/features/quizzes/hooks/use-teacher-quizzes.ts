import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  addTeacherChoiceRequest,
  approveTeacherQuestionRequest,
  archiveTeacherQuizRequest,
  createTeacherQuestionRequest,
  createTeacherQuizRequest,
  deleteTeacherChoiceRequest,
  getTeacherQuizRequest,
  getTeacherQuizResultsRequest,
  listClassroomQuizResultsRequest,
  listTeacherQuestionsRequest,
  listTeacherQuizzesRequest,
  listTeacherQuizAttemptsRequest,
  publishTeacherQuizRequest,
  rejectTeacherQuestionRequest,
  updateTeacherChoiceRequest,
  updateTeacherQuestionRequest,
  updateTeacherQuizRequest,
  type TeacherQuizListParams,
} from "@/features/quizzes/api/teacher-quizzes.api";
import type { QuizCreateValues } from "@/features/quizzes/schemas/teacher";

export const TEACHER_QUIZZES_KEY = ["teacher", "quizzes"] as const;

export function teacherQuizzesKey(filters?: TeacherQuizListParams) {
  return ["teacher", "quizzes", filters ?? {}] as const;
}

export function teacherQuizKey(quizId: number) {
  return ["teacher", "quizzes", quizId] as const;
}

export function teacherQuizQuestionsKey(quizId: number) {
  return ["teacher", "quizzes", quizId, "questions"] as const;
}

export function teacherQuizResultsKey(quizId: number) {
  return ["teacher", "quizzes", quizId, "results"] as const;
}

export function teacherClassroomQuizResultsKey(classroomId: number) {
  return ["teacher", "classrooms", classroomId, "quiz-results"] as const;
}

/** Quizzes the teacher authored, filtered by classroom/topic/status. */
export function useTeacherQuizzes(filters?: TeacherQuizListParams) {
  return useQuery({
    queryKey: teacherQuizzesKey(filters),
    queryFn: () => listTeacherQuizzesRequest(filters),
  });
}

/** Full teacher quiz detail (configuration + questions with choices). */
export function useTeacherQuiz(quizId?: number) {
  return useQuery({
    queryKey: teacherQuizKey(quizId ?? 0),
    queryFn: () => getTeacherQuizRequest(quizId as number),
    enabled: quizId != null,
  });
}

export function useCreateTeacherQuiz() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: QuizCreateValues) => createTeacherQuizRequest(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TEACHER_QUIZZES_KEY });
    },
  });
}

export function useUpdateTeacherQuiz(quizId?: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: Partial<QuizCreateValues>) =>
      updateTeacherQuizRequest(quizId as number, values),
    onSuccess: (quiz) => {
      queryClient.invalidateQueries({ queryKey: TEACHER_QUIZZES_KEY });
      queryClient.invalidateQueries({ queryKey: teacherQuizKey(quiz.id) });
    },
  });
}

export function usePublishTeacherQuiz() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (quizId: number) => publishTeacherQuizRequest(quizId),
    onSuccess: (quiz) => {
      queryClient.invalidateQueries({ queryKey: TEACHER_QUIZZES_KEY });
      queryClient.invalidateQueries({ queryKey: teacherQuizKey(quiz.id) });
    },
  });
}

export function useArchiveTeacherQuiz() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (quizId: number) => archiveTeacherQuizRequest(quizId),
    onSuccess: (quiz) => {
      queryClient.invalidateQueries({ queryKey: TEACHER_QUIZZES_KEY });
      queryClient.invalidateQueries({ queryKey: teacherQuizKey(quiz.id) });
    },
  });
}

/** Questions of an owned quiz (plain array, ordered by sequence_order). */
export function useTeacherQuizQuestions(quizId?: number) {
  return useQuery({
    queryKey: teacherQuizQuestionsKey(quizId ?? 0),
    queryFn: () => listTeacherQuestionsRequest(quizId as number),
    enabled: quizId != null,
  });
}

export function useCreateTeacherQuestion(quizId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: Record<string, unknown>) =>
      createTeacherQuestionRequest(quizId, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teacherQuizQuestionsKey(quizId) });
      queryClient.invalidateQueries({ queryKey: teacherQuizKey(quizId) });
      queryClient.invalidateQueries({ queryKey: TEACHER_QUIZZES_KEY });
    },
  });
}

export function useUpdateTeacherQuestion(quizId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ questionId, values }: { questionId: number; values: Record<string, unknown> }) =>
      updateTeacherQuestionRequest(questionId, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teacherQuizQuestionsKey(quizId) });
      queryClient.invalidateQueries({ queryKey: teacherQuizKey(quizId) });
    },
  });
}

export function useApproveTeacherQuestion(quizId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (questionId: number) => approveTeacherQuestionRequest(questionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teacherQuizQuestionsKey(quizId) });
      queryClient.invalidateQueries({ queryKey: teacherQuizKey(quizId) });
    },
  });
}

export function useRejectTeacherQuestion(quizId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (questionId: number) => rejectTeacherQuestionRequest(questionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teacherQuizQuestionsKey(quizId) });
      queryClient.invalidateQueries({ queryKey: teacherQuizKey(quizId) });
    },
  });
}

export function useAddTeacherChoice(quizId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      questionId,
      values,
    }: {
      questionId: number;
      values: { text: string; is_correct?: boolean; sequence_order?: number };
    }) => addTeacherChoiceRequest(questionId, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teacherQuizQuestionsKey(quizId) });
      queryClient.invalidateQueries({ queryKey: teacherQuizKey(quizId) });
    },
  });
}

export function useUpdateTeacherChoice(quizId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      choiceId,
      values,
    }: {
      choiceId: number;
      values: { text?: string; is_correct?: boolean; sequence_order?: number };
    }) => updateTeacherChoiceRequest(choiceId, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teacherQuizQuestionsKey(quizId) });
      queryClient.invalidateQueries({ queryKey: teacherQuizKey(quizId) });
    },
  });
}

export function useDeleteTeacherChoice(quizId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (choiceId: number) => deleteTeacherChoiceRequest(choiceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teacherQuizQuestionsKey(quizId) });
      queryClient.invalidateQueries({ queryKey: teacherQuizKey(quizId) });
    },
  });
}

/** Paginated student attempts on an owned quiz. */
export function useTeacherQuizAttempts(quizId?: number) {
  return useQuery({
    queryKey: teacherQuizResultsKey(quizId ?? 0),
    queryFn: () => listTeacherQuizAttemptsRequest(quizId as number),
    enabled: quizId != null,
  });
}

/** Aggregate performance summary for an owned quiz. */
export function useTeacherQuizResultsSummary(quizId?: number) {
  return useQuery({
    queryKey: ["teacher", "quizzes", quizId ?? 0, "results-summary"],
    queryFn: () => getTeacherQuizResultsRequest(quizId as number),
    enabled: quizId != null,
  });
}

/** Per-quiz performance aggregates for an owned classroom. */
export function useClassroomQuizResults(classroomId?: number) {
  return useQuery({
    queryKey: teacherClassroomQuizResultsKey(classroomId ?? 0),
    queryFn: () => listClassroomQuizResultsRequest(classroomId as number),
    enabled: classroomId != null,
  });
}