import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { StudentDashboard } from "@/components/dashboard/student-dashboard";
import { classroomFixture, lessonListFixture, topicFixture } from "./fixtures";
import type { ClassroomList } from "@/types/classrooms";
import type { LessonList } from "@/types/lessons";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

vi.mock("@/features/auth/hooks/use-auth", () => ({
  useAuth: () => ({ user: undefined }),
}));

const classroomsMock = vi.hoisted<{
  data: ClassroomList | undefined;
  isPending: boolean;
  isError: boolean;
  refetch: () => void;
}>(() => ({
  data: undefined,
  isPending: false,
  isError: false,
  refetch: vi.fn(),
}));

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

vi.mock("@/features/classrooms/hooks/use-classrooms", () => ({
  useStudentClassrooms: () => classroomsMock,
  useJoinClassroom: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock("@/features/lessons/hooks/use-lessons", () => ({
  useStudentLessons: () => lessonsMock,
  useTopicsForLessons: () => ({ topics: [topicFixture], loaded: false }),
}));

beforeEach(() => {
  classroomsMock.data = undefined;
  classroomsMock.isPending = false;
  classroomsMock.isError = false;
  lessonsMock.data = undefined;
  lessonsMock.isPending = false;
  lessonsMock.isError = false;
  lessonsMock.refetch.mockClear();
});

describe("StudentDashboard", () => {
  it("shows skeletons while classrooms load", () => {
    classroomsMock.isPending = true;
    lessonsMock.isPending = true;
    render(<StudentDashboard />);
    expect(screen.getByLabelText(/your classrooms/i)).toBeInTheDocument();
    expect(document.querySelector('[aria-busy="true"]')).toBeInTheDocument();
  });

  it("renders real classroom cards and recent lessons", () => {
    classroomsMock.data = { count: 1, next: null, previous: null, results: [classroomFixture] };
    lessonsMock.data = {
      count: 1,
      next: null,
      previous: null,
      results: [lessonListFixture.results[0]],
    };
    render(<StudentDashboard />);

    expect(screen.getByRole("heading", { name: "Grade 8 - Section A" })).toBeInTheDocument();
    expect(screen.getByText("Solving Linear Equations")).toBeInTheDocument();
  });

it("shows an empty state with a join action when there are no classrooms", async () => {
    classroomsMock.data = { count: 0, next: null, previous: null, results: [] };
    lessonsMock.data = { count: 0, next: null, previous: null, results: [] };
    const user = userEvent.setup();
    render(<StudentDashboard />);
    expect(screen.getByText(/you have not joined any classrooms yet/i)).toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: /join a classroom/i })[0]);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("hides the recent lessons section when none are published yet", () => {
    classroomsMock.data = { count: 0, next: null, previous: null, results: [] };
    lessonsMock.data = { count: 0, next: null, previous: null, results: [] };
    render(<StudentDashboard />);
    expect(screen.queryByText(/recent lessons/i)).not.toBeInTheDocument();
  });

  it("links classrooms to their detail page", () => {
    classroomsMock.data = { count: 1, next: null, previous: null, results: [classroomFixture] };
    render(<StudentDashboard />);
    expect(screen.getByRole("link", { name: /open classroom/i })).toHaveAttribute(
      "href",
      "/student/classrooms/1",
    );
  });
});