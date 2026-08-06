import { isApiError } from "@/lib/errors";

const NETWORK_FALLBACK = "We could not connect to the server. Try again.";

/**
 * Backend errors for teacher lesson actions. Publishing is blocked when the
 * lesson is incomplete (LESSON_NOT_PUBLISHABLE carries per-field details).
 */
const LESSON_ERROR_MESSAGES: Record<string, string> = {
  CLASSROOM_OWNERSHIP_REQUIRED: "You can only create lessons in classrooms you own.",
  LESSON_NOT_PUBLISHABLE: "This lesson is not ready to be published.",
};

export function lessonMutationErrorMessage(error: unknown): string {
  if (!isApiError(error)) {
    return NETWORK_FALLBACK;
  }
  if (error.code === "NETWORK_ERROR" || error.code === "TIMEOUT") {
    return NETWORK_FALLBACK;
  }
  return LESSON_ERROR_MESSAGES[error.code] ?? error.message;
}