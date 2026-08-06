import { describe, expect, it } from "vitest";

import {
  attemptAnalyticsListSchema,
  attemptAnalyticsSchema,
  classroomQuizResultListSchema,
  classroomQuizResultSchema,
  questionWriteSchema,
  quizCreateSchema,
  quizResultsSummarySchema,
  teacherChoiceSchema,
  teacherQuestionListSchema,
  teacherQuestionSchema,
  teacherQuizDetailSchema,
  teacherQuizListSchema,
  teacherQuizSchema,
  teacherQuizWriteSchema,
} from "@/features/quizzes/schemas/teacher";
import {
  subjectListSchema,
  subjectSchema,
  topicListSchema,
  topicSchema,
} from "@/features/curriculum/schemas";

const validQuiz = {
  id: 1,
  lesson: 10,
  classroom: 3,
  author: { id: 5, first_name: "Maria", last_name: "Santos" },
  title: "Linear Equations Check",
  instructions: "Answer all questions.",
  status: "DRAFT",
  attempt_limit: null,
  time_limit_minutes: 30,
  available_from: null,
  available_until: null,
  passing_score: "70.00",
  randomize_questions: false,
  show_results_immediately: true,
  published_at: null,
  created_at: "2026-08-01T09:00:00Z",
  updated_at: "2026-08-01T09:00:00Z",
  question_count: 2,
};

const validQuestion = {
  id: 1,
  quiz: 5,
  topic: 3,
  question_type: "MULTIPLE_CHOICE",
  prompt: "What is 2 + 2?",
  explanation: "2 + 2 = 4.",
  difficulty: 2,
  points: "1.00",
  numeric_answer: null,
  numeric_tolerance: null,
  is_ai_generated: false,
  review_status: "DRAFT",
  sequence_order: 1,
  choices: [
    { id: 1, text: "3", is_correct: false, sequence_order: 1 },
    { id: 2, text: "4", is_correct: true, sequence_order: 2 },
  ],
  created_at: "2026-08-01T09:00:00Z",
  updated_at: "2026-08-01T09:00:00Z",
};

describe("teacherQuizSchema", () => {
  it("accepts a valid draft quiz", () => {
    expect(teacherQuizSchema.safeParse(validQuiz).success).toBe(true);
  });

  it("accepts a published quiz with a timestamp", () => {
    const result = teacherQuizSchema.safeParse({
      ...validQuiz,
      status: "PUBLISHED",
      published_at: "2026-08-05T10:00:00Z",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an unknown status", () => {
    expect(teacherQuizSchema.safeParse({ ...validQuiz, status: "DELETED" }).success).toBe(false);
  });

  it("rejects a missing title", () => {
    const withoutTitle = { ...validQuiz } as Partial<typeof validQuiz>;
    delete withoutTitle.title;
    expect(teacherQuizSchema.safeParse(withoutTitle).success).toBe(false);
  });
});

describe("teacherQuizWriteSchema", () => {
  it("accepts a create response without question_count", () => {
    const withoutCount = { ...validQuiz } as Partial<typeof validQuiz>;
    delete withoutCount.question_count;
    expect(teacherQuizWriteSchema.safeParse(withoutCount).success).toBe(true);
  });

  it("rejects a write response missing required fields", () => {
    const withoutTitle = { ...validQuiz } as Partial<typeof validQuiz>;
    delete withoutTitle.title;
    expect(teacherQuizWriteSchema.safeParse(withoutTitle).success).toBe(false);
  });
});

describe("teacherQuizListSchema", () => {
  it("accepts a paginated response", () => {
    const result = teacherQuizListSchema.safeParse({
      count: 1,
      next: null,
      previous: null,
      results: [validQuiz],
    });
    expect(result.success).toBe(true);
  });
});

describe("teacherChoiceSchema", () => {
  it("accepts a valid choice", () => {
    expect(
      teacherChoiceSchema.safeParse({
        id: 1,
        text: "x = 2",
        is_correct: true,
        sequence_order: 1,
      }).success,
    ).toBe(true);
  });
});

describe("teacherQuestionSchema", () => {
  it("accepts a multiple choice question with choices", () => {
    expect(teacherQuestionSchema.safeParse(validQuestion).success).toBe(true);
  });

  it("accepts a numeric question with numeric fields", () => {
    const result = teacherQuestionSchema.safeParse({
      ...validQuestion,
      id: 2,
      question_type: "NUMERIC",
      prompt: "Solve for x",
      numeric_answer: "4",
      numeric_tolerance: "0.5",
      choices: [],
    });
    expect(result.success).toBe(true);
  });

  it("rejects a question without a prompt", () => {
    const withoutPrompt = { ...validQuestion } as Partial<typeof validQuestion>;
    delete withoutPrompt.prompt;
    expect(teacherQuestionSchema.safeParse(withoutPrompt).success).toBe(false);
  });
});

describe("teacherQuestionListSchema", () => {
  it("accepts a plain array (this endpoint is not paginated)", () => {
    const result = teacherQuestionListSchema.safeParse([validQuestion]);
    expect(result.success).toBe(true);
  });

  it("rejects a paginated envelope", () => {
    expect(teacherQuestionListSchema.safeParse({ results: [validQuestion] }).success).toBe(false);
  });
});

describe("teacherQuizDetailSchema", () => {
  it("accepts a quiz with embedded questions", () => {
    const result = teacherQuizDetailSchema.safeParse({
      ...validQuiz,
      questions: [validQuestion],
    });
    expect(result.success).toBe(true);
  });
});

describe("quizCreateSchema", () => {
  const validValues = {
    lesson: 10,
    classroom: 3,
    title: "New quiz",
    instructions: "",
    attempt_limit: null,
    time_limit_minutes: null,
    available_from: null,
    available_until: null,
    passing_score: 70,
    randomize_questions: false,
    show_results_immediately: true,
  };

  it("accepts valid form values", () => {
    expect(quizCreateSchema.safeParse(validValues).success).toBe(true);
  });

  it("rejects a missing lesson", () => {
    const withoutLesson = { ...validValues } as Partial<typeof validValues>;
    delete withoutLesson.lesson;
    expect(quizCreateSchema.safeParse(withoutLesson).success).toBe(false);
  });

  it("rejects an empty title", () => {
    expect(quizCreateSchema.safeParse({ ...validValues, title: "   " }).success).toBe(false);
  });

  it("rejects a passing score outside 0-100", () => {
    expect(quizCreateSchema.safeParse({ ...validValues, passing_score: 101 }).success).toBe(false);
  });
});

describe("questionWriteSchema", () => {
  const validValues = {
    topic: 3,
    question_type: "MULTIPLE_CHOICE",
    prompt: "What is 2 + 2?",
    explanation: "",
    difficulty: 2,
    points: 1,
    numeric_answer: null,
    numeric_tolerance: null,
    sequence_order: 1,
  };

  it("accepts valid form values", () => {
    expect(questionWriteSchema.safeParse(validValues).success).toBe(true);
  });

  it("accepts numeric answers", () => {
    const result = questionWriteSchema.safeParse({
      ...validValues,
      question_type: "NUMERIC",
      numeric_answer: "4",
      numeric_tolerance: "0.5",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty prompt", () => {
    expect(questionWriteSchema.safeParse({ ...validValues, prompt: " " }).success).toBe(false);
  });

  it("rejects an invalid question type", () => {
    expect(questionWriteSchema.safeParse({ ...validValues, question_type: "TRUE_FALSE" }).success).toBe(
      false,
    );
  });

  it("rejects a non-integer difficulty", () => {
    expect(questionWriteSchema.safeParse({ ...validValues, difficulty: 2.5 }).success).toBe(false);
  });
});

describe("attemptAnalyticsSchema", () => {
  const validAttempt = {
    id: 1,
    student: { id: 9, first_name: "Ana", last_name: "Cruz" },
    attempt_number: 1,
    status: "SUBMITTED",
    score: "80.00",
    earned_points: "8.00",
    maximum_points: "10.00",
    passed: true,
    started_at: "2026-08-06T10:00:00Z",
    expires_at: null,
    submitted_at: "2026-08-06T10:25:00Z",
    answers: [
      {
        question: 1,
        prompt: "What is 2 + 2?",
        question_type: "MULTIPLE_CHOICE",
        selected_choice: 2,
        numeric_response: null,
        is_correct: true,
        points_awarded: "1.00",
        correct_choice: 2,
        numeric_answer: null,
      },
    ],
  };

  it("accepts a submitted attempt with answers", () => {
    expect(attemptAnalyticsSchema.safeParse(validAttempt).success).toBe(true);
  });

  it("accepts an in-progress attempt with null scores", () => {
    const result = attemptAnalyticsSchema.safeParse({
      ...validAttempt,
      status: "IN_PROGRESS",
      score: null,
      earned_points: null,
      maximum_points: null,
      passed: null,
      submitted_at: null,
      answers: [],
    });
    expect(result.success).toBe(true);
  });

  it("accepts a paginated attempt list", () => {
    const result = attemptAnalyticsListSchema.safeParse({
      count: 1,
      next: null,
      previous: null,
      results: [validAttempt],
    });
    expect(result.success).toBe(true);
  });
});

describe("quizResultsSummarySchema", () => {
  it("accepts a valid summary", () => {
    const result = quizResultsSummarySchema.safeParse({
      quiz: 5,
      quiz_title: "Linear Equations Check",
      total_attempts: 3,
      submitted_attempts: 2,
      average_score: "75.00",
      pass_rate: "50.00",
      students: [
        {
          student: { id: 9, first_name: "Ana", last_name: "Cruz" },
          attempts: 1,
          best_score: "80.00",
          passed_attempts: 1,
          last_submitted_at: "2026-08-06T10:25:00Z",
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("accepts null aggregates before any submissions", () => {
    const result = quizResultsSummarySchema.safeParse({
      quiz: 5,
      quiz_title: "Linear Equations Check",
      total_attempts: 0,
      submitted_attempts: 0,
      average_score: null,
      pass_rate: null,
      students: [],
    });
    expect(result.success).toBe(true);
  });
});

describe("classroomQuizResultSchema", () => {
  it("accepts a valid classroom result row", () => {
    const result = classroomQuizResultSchema.safeParse({
      quiz: 5,
      title: "Linear Equations Check",
      status: "PUBLISHED",
      total_attempts: 3,
      submitted_attempts: 2,
      passed_attempts: 1,
      average_score: "66.67",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a paginated classroom result list", () => {
    const result = classroomQuizResultListSchema.safeParse({
      count: 1,
      next: null,
      previous: null,
      results: [
        {
          quiz: 5,
          title: "Linear Equations Check",
          status: "PUBLISHED",
          total_attempts: 3,
          submitted_attempts: 2,
          passed_attempts: 1,
          average_score: "66.67",
        },
      ],
    });
    expect(result.success).toBe(true);
  });
});

describe("curriculum schemas", () => {
  const validSubject = { id: 1, name: "Mathematics", code: "MATH8", is_active: true };
  const validTopic = {
    id: 3,
    subject: 1,
    grade_level: 8,
    code: "M8AL-IIa-1",
    title: "Functions",
    description: "Relations, functions, and function notation.",
    sequence_order: 3,
  };

  it("accepts a valid subject", () => {
    expect(subjectSchema.safeParse(validSubject).success).toBe(true);
  });

  it("rejects a subject with a string id", () => {
    expect(subjectSchema.safeParse({ ...validSubject, id: "one" }).success).toBe(false);
  });

  it("accepts a paginated subject list", () => {
    const result = subjectListSchema.safeParse({
      count: 1,
      next: null,
      previous: null,
      results: [validSubject],
    });
    expect(result.success).toBe(true);
  });

  it("accepts a topic whose subject is a bare id (list shape)", () => {
    expect(topicSchema.safeParse(validTopic).success).toBe(true);
  });

  it("rejects a topic with an embedded subject object", () => {
    expect(
      topicSchema.safeParse({ ...validTopic, subject: { id: 1, name: "Mathematics" } }).success,
    ).toBe(false);
  });

  it("accepts a paginated topic list", () => {
    const result = topicListSchema.safeParse({
      count: 1,
      next: null,
      previous: null,
      results: [validTopic],
    });
    expect(result.success).toBe(true);
  });
});
