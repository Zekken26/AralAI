import { z } from "zod";

export const USER_ROLES = ["STUDENT", "TEACHER", "ADMIN"] as const;
export type UserRole = (typeof USER_ROLES)[number];

/** Roles that can be chosen on the public registration form. */
export const PUBLIC_REGISTRATION_ROLES = ["STUDENT", "TEACHER"] as const satisfies readonly UserRole[];
export type PublicRegistrationRole = (typeof PUBLIC_REGISTRATION_ROLES)[number];

export const userSchema = z.object({
  id: z.number().int().positive(),
  email: z.string().email(),
  first_name: z.string(),
  last_name: z.string(),
  role: z.enum(USER_ROLES),
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type User = z.infer<typeof userSchema>;

export const loginRequestSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const registerRequestSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  first_name: z.string().trim().max(150).optional(),
  last_name: z.string().trim().max(150).optional(),
  role: z.enum(PUBLIC_REGISTRATION_ROLES).default("STUDENT"),
});

export type RegisterRequest = z.infer<typeof registerRequestSchema>;

export const tokenPairSchema = z.object({
  access: z.string().min(1),
  refresh: z.string().min(1),
});

export type TokenPair = z.infer<typeof tokenPairSchema>;

export const authErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  fields: z.record(z.string(), z.array(z.string())).optional(),
  status: z.number().optional(),
});

export type AuthApiError = z.infer<typeof authErrorSchema>;
