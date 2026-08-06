import { describe, expect, it } from "vitest";

import {
  classroomCreateSchema,
  classroomListSchema,
  classroomSchema,
  enrollmentListSchema,
  enrollmentSchema,
  joinClassroomCodeSchema,
  joinClassroomResponseSchema,
} from "@/features/classrooms/schemas";

const validClassroom = {
  id: 1,
  name: "Grade 8 - Section A",
  section: "A",
  school_year: "2026-2027",
  join_code: null,
  is_active: true,
  created_at: "2026-08-01T09:00:00Z",
  updated_at: "2026-08-01T09:00:00Z",
};

describe("classroomSchema", () => {
  it("accepts a valid classroom response", () => {
    expect(classroomSchema.safeParse(validClassroom).success).toBe(true);
  });

  it("accepts a null join_code for students", () => {
    const result = classroomSchema.safeParse({ ...validClassroom, join_code: null });
    expect(result.success).toBe(true);
  });

  it("rejects a missing required field", () => {
    const withoutName = { ...validClassroom } as Partial<typeof validClassroom>;
    delete withoutName.name;
    const result = classroomSchema.safeParse(withoutName);
    expect(result.success).toBe(false);
  });

  it("rejects a wrong-typed field", () => {
    const result = classroomSchema.safeParse({ ...validClassroom, is_active: "yes" });
    expect(result.success).toBe(false);
  });

  it("rejects a non-object payload", () => {
    expect(classroomSchema.safeParse("classroom").success).toBe(false);
  });
});

describe("classroomListSchema (DRF pagination)", () => {
  const paginated = {
    count: 1,
    next: "http://localhost:8000/api/v1/classrooms/?page=2",
    previous: null,
    results: [validClassroom],
  };

  it("accepts a valid paginated response", () => {
    expect(classroomListSchema.safeParse(paginated).success).toBe(true);
  });

  it("accepts an empty results list", () => {
    const result = classroomListSchema.safeParse({ ...paginated, count: 0, results: [] });
    expect(result.success).toBe(true);
  });

  it("rejects missing count", () => {
    const rest = { ...paginated } as Partial<typeof paginated>;
    delete rest.count;
    expect(classroomListSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects results that are not an array", () => {
    expect(classroomListSchema.safeParse({ ...paginated, results: {} }).success).toBe(false);
  });
});

describe("joinClassroomCodeSchema", () => {
  it("trims and uppercases the code", () => {
    expect(joinClassroomCodeSchema.parse("  ab12cd34  ")).toBe("AB12CD34");
  });

  it("rejects an empty code", () => {
    expect(joinClassroomCodeSchema.safeParse("   ").success).toBe(false);
  });

  it("rejects an over-long code", () => {
    expect(joinClassroomCodeSchema.safeParse("A".repeat(17)).success).toBe(false);
  });
});

describe("classroomCreateSchema", () => {
  it("accepts valid create values", () => {
    const result = classroomCreateSchema.safeParse({
      name: "Grade 8 - Section A",
      section: "A",
      school_year: "2026-2027",
    });
    expect(result.success).toBe(true);
  });

  it("accepts missing optional section and school year", () => {
    const result = classroomCreateSchema.safeParse({ name: "Grade 8" });
    expect(result.success).toBe(true);
  });

  it("rejects an empty name", () => {
    expect(classroomCreateSchema.safeParse({ name: "   " }).success).toBe(false);
  });
});

describe("enrollmentSchema", () => {
  it("accepts an enrollment with an embedded student summary", () => {
    const result = enrollmentSchema.safeParse({
      id: 4,
      student: { id: 9, first_name: "Ana", last_name: "Cruz" },
      status: "ACTIVE",
      joined_at: "2026-08-05T10:00:00Z",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an enrollment without the nested student", () => {
    expect(
      enrollmentSchema.safeParse({ id: 4, status: "ACTIVE", joined_at: "2026-08-05T10:00:00Z" })
        .success,
    ).toBe(false);
  });

  it("accepts a paginated enrollment list", () => {
    const result = enrollmentListSchema.safeParse({
      count: 1,
      next: null,
      previous: null,
      results: [
        {
          id: 4,
          student: { id: 9, first_name: "Ana", last_name: "Cruz" },
          status: "ACTIVE",
          joined_at: "2026-08-05T10:00:00Z",
        },
      ],
    });
    expect(result.success).toBe(true);
  });
});

describe("joinClassroomResponseSchema", () => {
  it("accepts the enrollment response", () => {
    const result = joinClassroomResponseSchema.safeParse({
      id: 4,
      classroom: 7,
      status: "ACTIVE",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a missing classroom id", () => {
    expect(joinClassroomResponseSchema.safeParse({ id: 4, status: "ACTIVE" }).success).toBe(false);
  });
});