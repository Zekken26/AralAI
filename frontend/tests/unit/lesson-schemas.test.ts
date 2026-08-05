import { describe, expect, it } from "vitest";

import { lessonListSchema, lessonSchema, topicSchema } from "@/features/lessons/schemas";

const validLesson = {
  id: 1,
  topic: 3,
  classroom: 2,
  author: { id: 5, first_name: "Maria", last_name: "Santos" },
  title: "Solving Linear Equations",
  summary: "An introduction to one-variable equations.",
  learning_objectives: ["Solve linear equations in one variable.", "Check solutions."],
  content: "A linear equation is one where the highest exponent of the variable is 1.\n\nExample: 2x + 3 = 7.",
  status: "PUBLISHED",
  version: 2,
  published_at: "2026-08-03T10:00:00Z",
  created_at: "2026-08-01T09:00:00Z",
  updated_at: "2026-08-03T10:00:00Z",
};

describe("lessonSchema", () => {
  it("accepts a valid published lesson", () => {
    expect(lessonSchema.safeParse(validLesson).success).toBe(true);
  });

  it("accepts a nullable published_at (draft lessons)", () => {
    expect(lessonSchema.safeParse({ ...validLesson, published_at: null }).success).toBe(true);
  });

  it("accepts empty content for an unpublished lesson", () => {
    const result = lessonSchema.safeParse({ ...validLesson, content: "", published_at: null });
    expect(result.success).toBe(true);
  });

  it("rejects a missing content field", () => {
    const withoutContent = { ...validLesson } as Partial<typeof validLesson>;
    delete withoutContent.content;
    expect(lessonSchema.safeParse(withoutContent).success).toBe(false);
  });

  it("rejects learning_objectives that are not an array of strings", () => {
    const result = lessonSchema.safeParse({
      ...validLesson,
      learning_objectives: [{ solve: true }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown status", () => {
    expect(lessonSchema.safeParse({ ...validLesson, status: "DELETED" }).success).toBe(false);
  });

  it("rejects a non-integer topic reference", () => {
    expect(lessonSchema.safeParse({ ...validLesson, topic: "three" }).success).toBe(false);
  });
});

describe("lessonListSchema", () => {
  it("accepts a paginated lesson response", () => {
    const result = lessonListSchema.safeParse({
      count: 1,
      next: null,
      previous: null,
      results: [validLesson],
    });
    expect(result.success).toBe(true);
  });

  it("rejects a result entry that is not a lesson", () => {
    const result = lessonListSchema.safeParse({
      count: 1,
      next: null,
      previous: null,
      results: [{ id: 1, title: "incomplete" }],
    });
    expect(result.success).toBe(false);
  });
});

describe("topicSchema (detail: subject is embedded)", () => {
  const validTopic = {
    id: 3,
    subject: { id: 1, name: "Mathematics", code: "MATH8", is_active: true },
    grade_level: 8,
    code: "M8AL-IIa-1",
    title: "Functions",
    description: "Relations, functions, and function notation.",
    sequence_order: 3,
  };

  it("accepts a valid topic detail", () => {
    expect(topicSchema.safeParse(validTopic).success).toBe(true);
  });

  it("rejects a topic whose subject is a bare id (list shape)", () => {
    expect(topicSchema.safeParse({ ...validTopic, subject: 1 }).success).toBe(false);
  });
});