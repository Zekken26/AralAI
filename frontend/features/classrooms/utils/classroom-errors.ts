import { isApiError } from "@/lib/errors";

const NETWORK_FALLBACK = "We could not connect to the server. Try again.";

/**
 * Backend errors for teacher classroom actions (config/exceptions.py). Map
 * stable codes to friendly copy; fall back to the backend detail.
 */
const CLASSROOM_ERROR_MESSAGES: Record<string, string> = {
  CLASSROOM_OWNERSHIP_REQUIRED: "You can only manage classrooms you own.",
};

export function classroomMutationErrorMessage(error: unknown): string {
  if (!isApiError(error)) {
    return NETWORK_FALLBACK;
  }
  if (error.code === "NETWORK_ERROR" || error.code === "TIMEOUT") {
    return NETWORK_FALLBACK;
  }
  return CLASSROOM_ERROR_MESSAGES[error.code] ?? error.message;
}