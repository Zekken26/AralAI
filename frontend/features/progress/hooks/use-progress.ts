import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";

import {
  studentProgressRequest,
  studentRecommendationsRequest,
  completeRecommendationRequest,
  dismissRecommendationRequest,
  topicMasteriesRequest,
  topicMasteryDetailRequest,
  topicMasteryHistoryRequest,
} from "@/features/progress/api/progress.api";

export const STUDENT_PROGRESS_KEY = ["progress", "student"] as const;

export function useProgress() {
  return useQuery({
    queryKey: [...STUDENT_PROGRESS_KEY, "summary"],
    queryFn: studentProgressRequest,
  });
}

export function useRecommendations(params?: { page?: number }) {
  return useQuery({
    queryKey: [...STUDENT_PROGRESS_KEY, "recommendations", params ?? {}],
    queryFn: () => studentRecommendationsRequest(params),
  });
}

export function useCompleteRecommendation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => completeRecommendationRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...STUDENT_PROGRESS_KEY, "recommendations"] });
    },
  });
}

export function useDismissRecommendation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => dismissRecommendationRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...STUDENT_PROGRESS_KEY, "recommendations"] });
    },
  });
}

export function useTopicMasteries(params?: { page?: number }) {
  return useQuery({
    queryKey: [...STUDENT_PROGRESS_KEY, "topics", params ?? {}],
    queryFn: () => topicMasteriesRequest(params),
  });
}

export function useTopicMasteryDetail(topicId?: number) {
  return useQuery({
    queryKey: [...STUDENT_PROGRESS_KEY, "topic", topicId ?? 0],
    queryFn: () => topicMasteryDetailRequest(topicId as number),
    enabled: topicId != null,
  });
}

export function useTopicMasteryHistory(topicId?: number) {
  return useQuery({
    queryKey: [...STUDENT_PROGRESS_KEY, "topic", topicId ?? 0, "history"],
    queryFn: () => topicMasteryHistoryRequest(topicId as number),
    enabled: topicId != null,
  });
}