import { describe, expect, it } from "vitest";

import {
  quizListSchema,
  quizSchema,
  questionSchema,
  choiceSchema,
  savedAnswerSchema,
  questionResultSchema,
  attemptResultSchema,
  attemptSerializerSchema,
  studentQuizDetailSchema,
} from "@/features/quizzes/schemas";

const validQuiz = {
  id: 1,
  lesson: 10,
  classroom: 1,
  title: "Linear Equations Quiz",
  instructions: "Answer all questions.",
  status: "PUBLISHED",
  attempt_limit: 3,
  time_limit_minutes: 30,
  available_from: "2026-08-01T00:00:00Z",
  available_until: "2026-08-31T23:59:59Z",
  passing_score: "70.00",
  randomize_questions: true,
  show_results_immediately: true,
  published_at: "2026-08-01T10:00:00Z",
  question_count: 5,
};

describe("quizSchema", () => {
  it("accepts a valid quiz response", () => {
    expect(quizSchema.safeParse(validQuiz).success).toBe(true);
  });

  it("rejects a missing required field", () => {
    const withoutTitle = { ...validQuiz };
    delete (withoutTitle as Record<string, unknown>).title;
    expect(quizSchema.safeParse(withoutTitle).success).toBe(false);
  });

  it("rejects a wrong-typed field", () => {
    expect(quizSchema.safeParse({ ...validQuiz, id: "not-a-number" }).success).toBe(false);
  });

  it("accepts nullable timeLimitMinutes as null", () => {
    const result = quizSchema.safeParse({ ...validQuiz, time_limit_minutes: null });
    expect(result.success).toBe(true);
  });
});

describe("quizListSchema (DRF pagination)", () => {
  const paginated = {
    count: 1,
    next: null,
    previous: null,
    results: [validQuiz],
  };

  it("accepts a valid paginated response", () => {
    expect(quizListSchema.safeParse(paginated).success).toBe(true);
  });

  it("accepts an empty results list", () => {
    const result = quizListSchema.safeParse({ ...paginated, count: 0, results: [] });
    expect(result.success).toBe(true);
  });
});

describe("choiceSchema", () => {
  it("accepts a valid choice", () => {
    expect(
      choiceSchema.safeParse({
        id: 1,
        text: "x = 2",
        sequence_order: 1,
      }),
    ).toBeTruthy();
  });
});

describe("questionSchema", () => {
  it("accepts a valid multiple choice question", () => {
    expect(
      questionSchema.safeParse({
        id: 1,
        topic: 3,
        questionType: "MULTIPLE_CHOICE",
        prompt: "What is 2+2?",
        difficulty: 2,
        points: "1.00",
        sequence_order: 1,
        choices: [{ id: 1, text: "3", sequence_order: 1 }, { id: 2, text: "4", sequence_order: 2 }],
      }),
    ).toBeTruthy();
  });

  it("accepts a numeric question without choices", () => {
  const result = questionSchema.safeParse({
      id: 2,
      topic: 3,
      question_type: "NUMERIC",
      prompt: "Solve for x",
      difficulty: 3,
      points: "2.00",
      sequence_order: 2,
      choices: [],
    });
    expect(result.success).toBe(true);
  });
});

describe("attemptSerializerSchema", () => {
  it("accepts a valid in-progress attempt", () => {
    expect(
      attemptSerializerSchema.safeParse({
        id: 1,
        quiz: 1,
        attemptNumber: 1,
        status: "IN_PROGRESS",
        startedAt: "2026-08-06T10:00:00Z",
        expiresAt: "2026-08-06T10:30:00Z",
        submittedAt: null,
        answers: [],
      }),
    ).toBeTruthy();
  });

  it("accepts a submitted attempt", () => {
    expect(
      attemptSerializerSchema.safeParse({
        id: 1,
        quiz: 1,
        attemptNumber: 1,
        status: "SUBMITTED",
        startedAt: "2026-08-06T10:00:00Z",
        expiresAt: null,
        submittedAt: "2026-08-06T10:25:00Z",
        answers: [],
      }),
    ).toBeTruthy();
  });
});

describe("savedAnswerSchema", () => {
  it("accepts a valid saved answer", () => {
    expect(
      savedAnswerSchema.safeParse({
        id: 1,
        question: 5,
        selected_choice: 2,
        numeric_response: null,
        answeredAt: "2026-08-06T10:15:00Z",
      }),
    ).toBeTruthy();
  });

  it("accepts a numeric response", () => {
    expect(
      savedAnswerSchema.safeParse({
        id: 2,
        question: 6,
        selected_choice: null,
        numeric_response: "42",
        answeredAt: "2026-08-06T10:16:00Z",
      }),
    ).toBeTruthy();
  });
});

describe("questionResultSchema", () => {
  it("accepts a correct multiple choice result", () => {
    expect(
      questionResultSchema.safeParse({
        question: 1,
        prompt: "What is 2+2?",
        questionType: "MULTIPLE_CHOICE",
        selectedChoice: 2,
        numericResponse: null,
        isCorrect: true,
        pointsAwarded: "1.00",
        correctChoice: 2,
        numericAnswer: null,
        explanation: "2+2=4",
      }),
    ).toBeTruthy();
  });
});

describe("attemptResultSchema", () => {
  it("accepts a valid attempt result", () => {
    expect(
      attemptResultSchema.safeParse({
        id: 1,
        quiz: 1,
        quizTitle: "Linear Equations Quiz",
        attemptNumber: 1,
        status: "SUBMITTED",
        score: "80.00",
        earnedPoints: "8.00",
        maximumPoints: "10.00",
        passed: true,
        startedAt: "2026-08-06T10:00:00Z",
        expiresAt: null,
        submittedAt: "2026-08-06T10:25:00Z",
        questions: [
          {
            question: 1,
            prompt: "What is 2+2?",
            questionType: "MULTIPLE_CHOICE",
            selectedChoice: 2,
            numericResponse: null,
            isCorrect: true,
            pointsAwarded: "1.00",
            correctChoice: 2,
            numericAnswer: null,
            explanation: "2+2=4",
          },
        ],
      }),
    ).toBeTruthy();
  });
});

describe("studentQuizDetailSchema", () => {
  it("accepts a quiz detail with questions", () => {
    expect(
      studentQuizDetailSchema.safeParse({
        ...validQuiz,
        questions: [
          {
            id: 1,
            topic: 3,
            questionType: "MULTIPLE_CHOICE",
            prompt: "What is 2+2?",
            difficulty: 2,
            points: "1.00",
            sequenceOrder: 1,
            choices: [{ id: 1, text: "3", sequence_order: 1 }, { id: 2, text: "4", sequence_order: 2 }],
          },
        ],
      }),
    ).toBeTruthy();
  });
});