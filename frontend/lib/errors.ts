/**
 * Normalized API error. Backend DRF errors are normalized into this shape so
 * UI code never touches raw backend internals.
 */
export type ApiError = {
  code: string;
  message: string;
  /** Per-field validation messages, keyed by field name (DRF style). */
  fields?: Record<string, string[]>;
  status?: number;
};

export function isApiError(error: unknown): error is ApiError {
  return typeof error === "object" && error !== null && "code" in error && "message" in error;
}
