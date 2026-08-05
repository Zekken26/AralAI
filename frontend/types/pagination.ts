import { z } from "zod";

/** DRF PageNumberPagination response wrapper. */
export function paginatedSchema<T extends z.ZodType>(itemSchema: T) {
  return z.object({
    count: z.number().int().nonnegative(),
    next: z.string().nullable(),
    previous: z.string().nullable(),
    results: z.array(itemSchema),
  });
}