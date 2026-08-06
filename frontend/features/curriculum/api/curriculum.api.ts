import { apiRequest } from "@/lib/api-client";
import { parseOrThrow } from "@/lib/parse-or-throw";

import { subjectListSchema, subjectSchema, topicListSchema, topicSchema } from "@/features/curriculum/schemas";
import type { Subject, SubjectList, Topic, TopicList } from "@/features/curriculum/types";

/** Active subjects, paginated by the backend (page size fixed at 20). */
export function listSubjectsRequest(): Promise<SubjectList> {
  return apiRequest<unknown>({ method: "GET", url: "/subjects/" }).then((data) =>
    parseOrThrow(subjectListSchema, data),
  );
}

/** Topics belonging to a subject, paginated by the backend. */
export function listSubjectTopicsRequest(subjectId: number): Promise<TopicList> {
  return apiRequest<unknown>({ method: "GET", url: `/subjects/${subjectId}/topics/` }).then((data) =>
    parseOrThrow(topicListSchema, data),
  );
}

export function getSubjectRequest(id: number): Promise<Subject> {
  return apiRequest<unknown>({ method: "GET", url: `/subjects/${id}/` }).then((data) =>
    parseOrThrow(subjectSchema, data),
  );
}

export function getTopicRequest(id: number): Promise<Topic> {
  return apiRequest<unknown>({ method: "GET", url: `/topics/${id}/` }).then((data) =>
    parseOrThrow(topicSchema, data),
  );
}
