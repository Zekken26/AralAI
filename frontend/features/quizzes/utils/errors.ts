import { isApiError } from "@/lib/errors";

const NETWORK_FALLBACK = "We could not connect to the server. Try again.";

const QUIZ_UNAVAILABLE: Record<string, string> = {
  QUIZ_NOT_PUBLISHED: "This quiz is not available yet.",
  QUIZ_NOT_AVAILABLE: "This quiz is not available at this time.",
  QUIZ_ATTEMPT_LIMIT_REACHED: "You have used all your attempts for this quiz.",
  QUIZ_ATTEMPT_ALREADY_ACTIVE: "You already have an active attempt for this quiz.",
  LESSON_NOT_PUBLISHED: "The lesson for this quiz is not published yet.",
  PERMISSION_DENIED: "You do not have permission to access this quiz.",
};

const ATTEMPT_ERROR: Record<string, string> = {
  QUIZ_ATTEMPT_EXPIRED: "This attempt has expired.",
  QUIZ_ATTEMPT_ALREADY_SUBMITTED: "This attempt has already been submitted.",
  INVALID_ANSWER_FORMAT: "The answer format is invalid.",
  CHOICE_NOT_IN_QUESTION: "The selected choice does not belong to this question.",
  QUESTION_NOT_APPROVED: "This question has not been approved yet.",
  QUESTION_NOT_IN_QUIZ: "This question does not belong to this quiz.",
};

export function quizUnavailableMessage(error: unknown): string {
  if (!isApiError(error)) return NETWORK_FALLBACK;
  if (error.code === "NETWORK_ERROR" || error.code === "TIMEOUT") return NETWORK_FALLBACK;
  return QUIZ_UNAVAILABLE[error.code] ?? error.message;
}

export function attemptErrorMessage(error: unknown): string {
  if (!isApiError(error)) return NETWORK_FALLBACK;
  if (error.code === "NETWORK_ERROR" || error.code === "TIMEOUT") return NETWORK_FALLBACK;
  return ATTEMPT_ERROR[error.code] ?? error.message;
}