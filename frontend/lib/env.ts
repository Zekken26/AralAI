import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_API_BASE_URL: z
    .string()
    .url("NEXT_PUBLIC_API_BASE_URL must be a valid URL (e.g. http://localhost:8000/api/v1)"),
});

const parsed = envSchema.safeParse({
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
});

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
  throw new Error(
    `Invalid frontend environment configuration.\n${issues}\n` +
      "Copy frontend/.env.example to frontend/.env.local and set NEXT_PUBLIC_API_BASE_URL.",
  );
}

export const env = parsed.data;
