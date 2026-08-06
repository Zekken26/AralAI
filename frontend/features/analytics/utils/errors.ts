import { isApiError } from "@/lib/errors";

export const ANALYTICS_ACCESS_ERROR =
  "This classroom is unavailable or you do not have access.";
export const ANALYTICS_PARSE_ERROR = "We could not read the analytics response.";
export const NO_PROGRESS_DATA_YET = "No submitted assessments have produced progress data yet.";
export const SUPPORT_EMPTY_MESSAGE = "No students currently meet the support criteria.";

/** Map a normalized ApiError to a teacher-facing analytics message. */
export function analyticsErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    if (error.status === 404) {
      return ANALYTICS_ACCESS_ERROR;
    }
    if (error.code === "INVALID_RESPONSE") {
      return ANALYTICS_PARSE_ERROR;
    }
    return error.message;
  }
  return "We could not load the analytics data.";
}
