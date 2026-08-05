import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { LessonDetailPage } from "@/features/lessons/components/lesson-detail";
import { lessonFixture, topicFixture } from "./fixtures";
import type { Lesson, Topic } from "@/types/lessons";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: replace, prefetch: vi.fn() }),
  usePathname: () => "/student/lessons/10",
}));

const lessonMock = vi.hoisted<{
  data: Lesson | undefined;
  isPending: boolean;
  isError: boolean;
  error: unknown;
}>(() => ({
  data: undefined,
  isPending: false,
  isError: false,
  error: undefined,
}));

const topicMock = vi.hoisted<{
  data: Topic | undefined;
  isPending: boolean;
  isError: boolean;
}>(() => ({
  data: undefined,
  isPending: false,
  isError: false,
}));

vi.mock("@/features/lessons/hooks/use-lessons", () => ({
  useStudentLesson: () => lessonMock,
  useTopic: () => topicMock,
}));

beforeEach(() => {
  lessonMock.data = undefined;
  lessonMock.isPending = false;
  lessonMock.isError = false;
  lessonMock.error = undefined;
  topicMock.data = undefined;
  topicMock.isPending = false;
  topicMock.isError = false;
  replace.mockClear();
});

describe("LessonDetailPage", () => {
  it("shows skeletons while the lesson loads", () => {
    lessonMock.isPending = true;
    render(<LessonDetailPage lessonId={10} />);
    expect(screen.getByLabelText(/loading lesson/i)).toHaveAttribute("aria-busy", "true");
  });

  it("renders title, topic, objectives, and escaped plain-text content", () => {
    lessonMock.data = lessonFixture;
    topicMock.data = topicFixture;
    render(<LessonDetailPage lessonId={10} />);

    expect(screen.getByRole("heading", { name: "Solving Linear Equations" })).toBeInTheDocument();
    expect(screen.getByText("Linear Equations")).toBeInTheDocument();

    const objectives = screen.getByRole("list");
    expect(objectives).toBeInTheDocument();
    expect(screen.getByText("Solve linear equations in one variable.")).toBeInTheDocument();
    expect(screen.getByText("Check solutions.")).toBeInTheDocument();

    expect(screen.getByText(/a linear equation is one where/i)).toBeInTheDocument();
    expect(screen.getByText(/example: 2x \+ 3 = 7/i)).toBeInTheDocument();
  });

  it("escapes raw HTML in lesson content instead of rendering it", () => {
    lessonMock.data = { ...lessonFixture, content: '<script>alert("pwned")</script>' };
    const { container } = render(<LessonDetailPage lessonId={10} />);
    expect(container.innerHTML).toContain("&lt;script&gt;");
    expect(document.querySelector("script")).toBeNull();
  });

  it("shows the unavailable message for a hidden lesson", () => {
    lessonMock.isError = true;
    lessonMock.error = {
      code: "not_found",
      message: "Lesson not found.",
      status: 404,
    };
    lessonMock.data = undefined;
    render(<LessonDetailPage lessonId={999} />);
    expect(screen.getByText(/this classroom or lesson is unavailable/i)).toBeInTheDocument();
  });

  it("renders topic name as fallback when the topic lookup failed", () => {
    lessonMock.data = lessonFixture;
    topicMock.isError = true;
    render(<LessonDetailPage lessonId={10} />);
    expect(screen.getByRole("heading", { name: "Solving Linear Equations" })).toBeInTheDocument();
  });
});