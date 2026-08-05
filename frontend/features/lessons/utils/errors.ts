import { isApiError } from "@/lib/errors";

const NOT_AVAILABLE = "This classroom or lesson is unavailable.";

/**
 * 404s for classroom/lesson detail come back as DRF NotFound responses. The
 * generic backend detail for a missing classroom leaks the model name, so
 * collapse every 404 into one student-friendly message.
 */
export function unavailableMessage(error: unknown): string {
  if (isApiError(error) && (error.status === 404 || error.code === "not_found")) {
    return NOT_AVAILABLE;
  }
  if (isApiError(error)) {
    return error.message;
  }
  return "We could not connect to the server. Try again.";
}

export const NOT_AVAILABLE_MESSAGE = NOT_AVAILABLE;