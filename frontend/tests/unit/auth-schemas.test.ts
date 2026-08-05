import { describe, expect, it } from "vitest";

import { loginRequestSchema, registerRequestSchema } from "@/features/auth/schemas";

describe("loginRequestSchema", () => {
  it("accepts a valid email and password", () => {
    const result = loginRequestSchema.safeParse({ email: "student@aralai.test", password: "secret" });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid email", () => {
    const result = loginRequestSchema.safeParse({ email: "not-an-email", password: "secret" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["email"]);
    }
  });

  it("rejects a missing password", () => {
    const result = loginRequestSchema.safeParse({ email: "student@aralai.test", password: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["password"]);
    }
  });

  it("trims surrounding whitespace from email", () => {
    const result = loginRequestSchema.parse({ email: "  student@aralai.test  ", password: "x" });
    expect(result.email).toBe("student@aralai.test");
  });
});

describe("registerRequestSchema", () => {
  it("accepts a valid student registration", () => {
    const result = registerRequestSchema.safeParse({
      email: "new.student@aralai.test",
      password: "secure-pass-123",
      role: "STUDENT",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a valid teacher registration", () => {
    const result = registerRequestSchema.safeParse({
      email: "new.teacher@aralai.test",
      password: "secure-pass-123",
      role: "TEACHER",
    });
    expect(result.success).toBe(true);
  });

  it("defaults the role to STUDENT when omitted", () => {
    const result = registerRequestSchema.parse({
      email: "new.student@aralai.test",
      password: "secure-pass-123",
    });
    expect(result.role).toBe("STUDENT");
  });

  it("rejects ADMIN as a registration role", () => {
    const result = registerRequestSchema.safeParse({
      email: "new.admin@aralai.test",
      password: "secure-pass-123",
      role: "ADMIN",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a password shorter than 8 characters", () => {
    const result = registerRequestSchema.safeParse({
      email: "new.student@aralai.test",
      password: "short",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["password"]);
    }
  });

  it("rejects an invalid email", () => {
    const result = registerRequestSchema.safeParse({
      email: "nope",
      password: "secure-pass-123",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["email"]);
    }
  });
});
