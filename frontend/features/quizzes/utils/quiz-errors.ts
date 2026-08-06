import { isApiError } from "@/lib/errors";

const NETWORK_FALLBACK = "We could not connect to the server. Try again.";

/**
 * Backend errors for teacher quiz/question actions. Publishing and approving
 * validate full question configuration server-side; map the stable codes to
 * friendly copy and fall back to the backend detail (which may carry
 * per-field messages for INVALID_QUESTION_CONFIGURATION).
 */
const QUIZ_ERROR_MESSAGES: Record<string, string> = {
  CLASSROOM_OWNERSHIP_REQUIRED: "You can only create quizzes in classrooms you own.",
  LESSON_NOT_PUBLISHED: "The linked lesson must be published before the quiz can be used.",
  QUIZ_NOT_PUBLISHABLE: "This quiz is not ready to be published.",
  QUESTION_NOT_APPROVED: "Every question must be approved before publishing.",
  INVALID_QUESTION_CONFIGURATION:
    "The question is not fully configured. Multiple-choice questions need at least two choices with exactly one correct answer; numeric questions need a numeric answer.",
  CHOICE_DELETE_BLOCKED:
    "This choice cannot be deleted because it would invalidate the quiz.",
};

export function quizMutationErrorMessage(error: unknown): string {
  if (!isApiError(error)) {
    return NETWORK_FALLBACK;
  }
  if (error.code === "NETWORK_ERROR" || error.code === "TIMEOUT") {
    return NETWORK_FALLBACK;
  }
  return QUIZ_ERROR_MESSAGES[error.code] ?? error.message;
}