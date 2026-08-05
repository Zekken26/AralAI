import type { ZodType } from "zod";

import type { ApiError } from "@/lib/errors";

/**
 * Validates an API response with a zod schema. On failure throws a normalized
 * ApiError so the rest of the app never sees raw backend/network internals.
 */
export function parseOrThrow<T>(schema: ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw {
      code: "INVALID_RESPONSE",
      message: "The server returned an unexpected response.",
      status: 0,
    } satisfies ApiError;
  }
  return result.data;
}