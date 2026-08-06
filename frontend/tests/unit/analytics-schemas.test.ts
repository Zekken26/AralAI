import { describe, expect, it } from "vitest";

import {
  classroomProgressSchema,
  classroomTopicProgressSchema,
  studentsNeedingSupportSchema,
  teacherStudentProgressSchema,
} from "@/features/analytics/schemas/teacher";

const topic = { id: 1, title: "Linear Equations", code: "M8AL-Ia-1" };

const classroomProgressFixture = {
  classroom_id: 1,
  class_average_mastery: 31.0,
  attempted_topics: 1,
  weakest_topics: [{ topic, average_mastery: 31.0 }],
  strongest_topics: [{ topic, average_mastery: 31.0 }],
  topic_distribution: [
    {
      topic,
      needs_support: 1,
      developing: 1,
      proficient: 0,
      mastered: 0,
      attempted_students: 2,
      submitted_attempts: 2,
      average_mastery: 31.0,
    },
  ],
};

describe("classroomProgressSchema", () => {
  it("parses the backend wire shape with numeric decimals", () => {
    const parsed = classroomProgressSchema.parse(classroomProgressFixture);
    expect(parsed.class_average_mastery).toBe(31.0);
    expect(parsed.topic_distribution[0].average_mastery).toBe(31.0);
    expect(parsed.topic_distribution[0].needs_support).toBe(1);
  });

  it("accepts null class average mastery (no data yet)", () => {
    const parsed = classroomProgressSchema.parse({
      ...classroomProgressFixture,
      class_average_mastery: null,
    });
    expect(parsed.class_average_mastery).toBeNull();
  });

  it("rejects string decimals (quiz-style transport is a mismatch here)", () => {
    expect(() =>
      classroomProgressSchema.parse({
        ...classroomProgressFixture,
        class_average_mastery: "31.0",
      }),
    ).toThrow();
    expect(() =>
      classroomProgressSchema.parse({
        ...classroomProgressFixture,
        topic_distribution: [
          { ...classroomProgressFixture.topic_distribution[0], average_mastery: "31.0" },
        ],
      }),
    ).toThrow();
  });

  it("rejects mastery values outside the 0-100 range", () => {
    expect(() =>
      classroomProgressSchema.parse({
        ...classroomProgressFixture,
        class_average_mastery: 150,
      }),
    ).toThrow();
  });

  it("rejects a missing topic_distribution field", () => {
    const { topic_distribution, ...rest } = classroomProgressFixture;
    expect(() => classroomProgressSchema.parse({ ...rest, topic_distribution })).not.toThrow();
    const broken = {
      ...rest,
      topic_distribution: [{ ...topic_distribution[0], average_mastery: undefined }],
    };
    expect(() => classroomProgressSchema.parse(broken)).toThrow();
  });
});

describe("studentsNeedingSupportSchema", () => {
  const fixture = {
    count: 1,
    students: [
      {
        student: { id: 7, first_name: "Ana", last_name: "Reyes" },
        topics: [{ topic, mastery_score: 12.5, status: "NEEDS_SUPPORT" }],
      },
    ],
  };

  it("parses the backend wire shape", () => {
    const parsed = studentsNeedingSupportSchema.parse(fixture);
    expect(parsed.count).toBe(1);
    expect(parsed.students[0].topics[0].mastery_score).toBe(12.5);
  });

  it("accepts an empty student list", () => {
    expect(studentsNeedingSupportSchema.parse({ count: 0, students: [] }).students).toEqual([]);
  });

  it("rejects support rows with a status other than NEEDS_SUPPORT", () => {
    expect(() =>
      studentsNeedingSupportSchema.parse({
        count: 1,
        students: [
          {
            student: { id: 7, first_name: "Ana", last_name: "Reyes" },
            topics: [{ topic, mastery_score: 12.5, status: "MASTERED" }],
          },
        ],
      }),
    ).toThrow();
  });
});

describe("classroomTopicProgressSchema", () => {
  const fixture = {
    topic: { id: 9, title: "Laws of Exponents", code: "M8AL-Ic-2" },
    average_mastery: 40.0,
    attempted_students: 2,
    distribution: { needs_support: 1, developing: 1, proficient: 0, mastered: 0 },
    students: [
      {
        student: { id: 7, first_name: "Ana", last_name: "Reyes" },
        mastery_score: 12.5,
        status: "NEEDS_SUPPORT",
      },
      {
        student: { id: 8, first_name: "Luis", last_name: "Tan" },
        mastery_score: 67.5,
        status: "DEVELOPING",
      },
    ],
  };

  it("parses the backend wire shape with lowercase distribution keys", () => {
    const parsed = classroomTopicProgressSchema.parse(fixture);
    expect(parsed.distribution.needs_support).toBe(1);
    expect(parsed.students[1].status).toBe("DEVELOPING");
  });

  it("accepts the empty-topic state (null title/code, null average)", () => {
    const parsed = classroomTopicProgressSchema.parse({
      topic: { id: 9, title: null, code: null },
      average_mastery: null,
      attempted_students: 0,
      distribution: { needs_support: 0, developing: 0, proficient: 0, mastered: 0 },
      students: [],
    });
    expect(parsed.topic.title).toBeNull();
    expect(parsed.average_mastery).toBeNull();
  });

  it("rejects lowercase status values (contract is uppercase)", () => {
    expect(() =>
      classroomTopicProgressSchema.parse({
        ...fixture,
        students: [{ ...fixture.students[0], status: "needs_support" }],
      }),
    ).toThrow();
  });

  it("rejects unknown distribution bucket names", () => {
    expect(() =>
      classroomTopicProgressSchema.parse({
        ...fixture,
        distribution: { ...fixture.distribution, mastered: "0" },
      }),
    ).toThrow();
  });
});

describe("teacherStudentProgressSchema", () => {
  const fixture = {
    student: { id: 7, first_name: "Ana", last_name: "Reyes" },
    topics_attempted: 2,
    topics_mastered: 1,
    topics_needing_support: 1,
    overall_mastery_average: 56.25,
    topics: [
      { topic, mastery_score: 12.5, status: "NEEDS_SUPPORT" },
      { topic: { ...topic, id: 2 }, mastery_score: 100.0, status: "MASTERED" },
    ],
  };

  it("parses the backend wire shape", () => {
    const parsed = teacherStudentProgressSchema.parse(fixture);
    expect(parsed.topics_attempted).toBe(2);
    expect(parsed.topics[1].mastery_score).toBe(100.0);
  });

  it("accepts a null overall average when the student has no topics", () => {
    const parsed = teacherStudentProgressSchema.parse({
      ...fixture,
      topics_attempted: 0,
      topics_mastered: 0,
      topics_needing_support: 0,
      overall_mastery_average: null,
      topics: [],
    });
    expect(parsed.overall_mastery_average).toBeNull();
  });

  it("rejects string mastery scores", () => {
    expect(() =>
      teacherStudentProgressSchema.parse({
        ...fixture,
        topics: [{ ...fixture.topics[0], mastery_score: "12.5" }],
      }),
    ).toThrow();
  });
});
