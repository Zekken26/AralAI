import { apiRequest } from "@/lib/api-client";
import { parseOrThrow } from "@/lib/parse-or-throw";
import {
  progressSummarySchema,
  recommendationListSchema,
  recommendationSchema,
  topicMasteryListSchema,
  topicMasterySchema,
} from "@/features/progress/schemas";
import type { ProgressSummary, RecommendationList, Recommendation, TopicMasteryList, TopicMastery } from "@/features/progress/types";

export function studentProgressRequest(): Promise<ProgressSummary> {
  return apiRequest<unknown>({ method: "GET", url: "/students/me/progress/" }).then((data) =>
    parseOrThrow(progressSummarySchema, data),
  );
}

export function studentRecommendationsRequest(params?: { page?: number }): Promise<RecommendationList> {
  const search = new URLSearchParams();
  if (params?.page != null) search.set("page", String(params.page));
  const qs = search.toString();
  return apiRequest<unknown>({ method: "GET", url: `/students/me/recommendations/${qs ? `?${qs}` : ""}` }).then((data) =>
    parseOrThrow(recommendationListSchema, data),
  );
}

export function completeRecommendationRequest(id: number): Promise<Recommendation> {
  return apiRequest<unknown>({ method: "POST", url: `/students/me/recommendations/${id}/complete/` }).then((data) =>
    parseOrThrow(recommendationSchema, data),
  );
}

export function dismissRecommendationRequest(id: number): Promise<Recommendation> {
  return apiRequest<unknown>({ method: "POST", url: `/students/me/recommendations/${id}/dismiss/` }).then((data) =>
    parseOrThrow(recommendationSchema, data),
  );
}

export function topicMasteriesRequest(params?: { page?: number }): Promise<TopicMasteryList> {
  const search = new URLSearchParams();
  if (params?.page != null) search.set("page", String(params.page));
  const qs = search.toString();
  return apiRequest<unknown>({ method: "GET", url: `/students/me/progress/topics/${qs ? `?${qs}` : ""}` }).then((data) =>
    parseOrThrow(topicMasteryListSchema, data),
  );
}

export function topicMasteryDetailRequest(topicId: number): Promise<TopicMastery> {
  return apiRequest<unknown>({ method: "GET", url: `/students/me/progress/topics/${topicId}/` }).then((data) =>
    parseOrThrow(topicMasterySchema, data),
  );
}

export function topicMasteryHistoryRequest(topicId: number): Promise<TopicMastery> {
  return apiRequest<unknown>({ method: "GET", url: `/students/me/progress/topics/${topicId}/history/` }).then((data) =>
    parseOrThrow(topicMasterySchema, data),
  );
}