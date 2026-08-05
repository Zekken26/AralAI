import { isApiError } from "@/lib/errors";

const NETWORK_FALLBACK = "We could not connect to the server. Try again.";

/**
 * Backend join errors carry stable codes (config/exceptions.py). Map them to
 * student-friendly copy; fall back to the backend detail or a network message.
 */
const JOIN_ERROR_MESSAGES: Record<string, string> = {
  INVALID_JOIN_CODE: "The classroom code is invalid.",
  CLASSROOM_INACTIVE: "This classroom is not accepting students.",
  DUPLICATE_ENROLLMENT: "You have already joined this classroom.",
  permission_denied: "Only student accounts can join classrooms.",
};

export function joinErrorMessage(error: unknown): string {
  if (!isApiError(error)) {
    return NETWORK_FALLBACK;
  }
  if (error.code === "NETWORK_ERROR" || error.code === "TIMEOUT") {
    return NETWORK_FALLBACK;
  }
  return JOIN_ERROR_MESSAGES[error.code] ?? error.message;
}