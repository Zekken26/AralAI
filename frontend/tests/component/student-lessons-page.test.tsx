import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { StudentLessonsPage } from "@/features/lessons/components/student-lessons-page";
import { lessonListFixture, topicFixture } from "./fixtures";
import type { LessonList } from "@/types/lessons";

const replace = vi.fn();

vi.mock("next/navigation", () => {
  const search = new URLSearchParams();
  return {
    useRouter: () => ({ replace, push: replace, prefetch: vi.fn() }),
    usePathname: () => "/student/lessons",
    useSearchParams: () => search,
  };
});

const lessonsMock = vi.hoisted<{
  data: LessonList | undefined;
  isPending: boolean;
  isError: boolean;
  isPlaceholderData: boolean;
  refetch: ReturnType<typeof vi.fn>;
}>(() => ({
  data: undefined,
  isPending: false,
  isError: false,
  isPlaceholderData: false,
  refetch: vi.fn(),
}));

vi.mock("@/features/lessons/hooks/use-lessons", () => ({
  useStudentLessons: () => lessonsMock,
  useTopicsForLessons: () => ({ topics: [topicFixture], loaded: true }),
}));

beforeEach(() => {
  lessonsMock.data = undefined;
  lessonsMock.isPending = false;
  lessonsMock.isError = false;
  lessonsMock.refetch.mockClear();
  replace.mockClear();
});

describe("StudentLessonsPage", () => {
  it("renders a heading and the published lesson cards", () => {
    lessonsMock.data = lessonListFixture;
    render(<StudentLessonsPage />);

    expect(screen.getByRole("heading", { name: "Lessons" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Solving Linear Equations" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Laws of Exponents" })).toBeInTheDocument();
  });

  it("shows an empty state when no lessons are published", () => {
    lessonsMock.data = { count: 0, next: null, previous: null, results: [] };
    render(<StudentLessonsPage />);
    expect(screen.getByText(/no published lessons yet/i)).toBeInTheDocument();
  });

  it("links lesson cards to the lesson detail page", () => {
    lessonsMock.data = lessonListFixture;
    render(<StudentLessonsPage />);
    const lessonLinks = screen.getAllByRole("link", { name: /open lesson/i });
    expect(lessonLinks[0]).toHaveAttribute("href", "/student/lessons/10");
    expect(lessonLinks[1]).toHaveAttribute("href", "/student/lessons/11");
  });

  it("filters by topic and updates the URL", async () => {
    const user = userEvent.setup();
    lessonsMock.data = lessonListFixture;
    render(<StudentLessonsPage />);

    await user.click(screen.getByRole("button", { name: "Linear Equations" }));
    expect(replace).toHaveBeenCalledWith("/student/lessons?topic=3");
  });
});