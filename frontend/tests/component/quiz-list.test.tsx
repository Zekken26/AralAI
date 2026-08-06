import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { QuizListPage } from "@/features/quizzes/components/quiz-list";
import type { QuizList } from "@/features/quizzes/types";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: push, prefetch: vi.fn() }),
}));

const quizzesQueryMock = vi.hoisted<{
  data: QuizList | undefined;
  isPending: boolean;
  isError: boolean;
  refetch: ReturnType<typeof vi.fn>;
}>(() => ({
  data: undefined,
  isPending: false,
  isError: false,
  refetch: vi.fn(),
}));

vi.mock("@/features/quizzes/hooks/use-quizzes", () => ({
  useStudentQuizzes: () => quizzesQueryMock,
}));

beforeEach(() => {
  quizzesQueryMock.data = undefined;
  quizzesQueryMock.isPending = false;
  quizzesQueryMock.isError = false;
  quizzesQueryMock.refetch.mockClear();
  push.mockClear();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("QuizListPage", () => {
  it("shows skeletons while quizzes are loading", () => {
    quizzesQueryMock.isPending = true;
    render(<QuizListPage />);
    expect(screen.getByLabelText(/loading quizzes/i)).toHaveAttribute("aria-busy", "true");
  });

  it("renders quiz cards with links", () => {
    quizzesQueryMock.data = {
      count: 2,
      next: null,
      previous: null,
      results: [
        {
          id: 1,
          lesson: 10,
          classroom: 1,
          title: "Linear Equations Quiz",
          instructions: "Answer all questions.",
          status: "PUBLISHED",
          attempt_limit: 3,
          time_limit_minutes: 30,
          available_from: null,
          available_until: null,
          passing_score: "70.00",
          randomize_questions: true,
          show_results_immediately: true,
          published_at: "2026-08-01T10:00:00Z",
          question_count: 5,
        },
        {
          id: 2,
          lesson: 11,
          classroom: 1,
          title: "Fractions Quiz",
          instructions: "",
          status: "PUBLISHED",
          attempt_limit: null,
          time_limit_minutes: null,
          available_from: null,
          available_until: null,
          passing_score: "60.00",
          randomize_questions: false,
          show_results_immediately: false,
          published_at: "2026-08-01T10:00:00Z",
          question_count: 10,
        },
      ],
    };
    render(<QuizListPage />);
    expect(screen.getByRole("heading", { name: "Linear Equations Quiz" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Fractions Quiz" })).toBeInTheDocument();
    expect(screen.getByText(/30 min/)).toBeInTheDocument();
    expect(screen.getByText(/5 questions/)).toBeInTheDocument();
  });

  it("shows the empty state when there are no quizzes", () => {
    quizzesQueryMock.data = { count: 0, next: null, previous: null, results: [] };
    render(<QuizListPage />);
    expect(screen.getByText(/no quizzes available/i)).toBeInTheDocument();
  });

  it("shows an error with a retry action on failure", async () => {
    quizzesQueryMock.isError = true;
    quizzesQueryMock.data = undefined;
    const user = await import("@testing-library/user-event");
    render(<QuizListPage />);
    expect(screen.getByText(/could not load your quizzes/i)).toBeInTheDocument();
    await user.default.click(screen.getByRole("button", { name: /retry/i }));
    expect(quizzesQueryMock.refetch).toHaveBeenCalled();
  });
});