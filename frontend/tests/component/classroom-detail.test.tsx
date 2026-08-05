import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { ClassroomDetailPage } from "@/features/classrooms/components/classroom-detail";
import { classroomFixture, lessonListFixture, topicFixture } from "./fixtures";
import type { Classroom } from "@/types/classrooms";
import type { LessonList } from "@/types/lessons";

const replace = vi.fn();

vi.mock("next/navigation", () => {
  const search = new URLSearchParams();
  return {
    useRouter: () => ({ replace, push: replace, prefetch: vi.fn() }),
    usePathname: () => "/student/classrooms/1",
    useSearchParams: () => search,
  };
});

const classroomMock = vi.hoisted<{
  data: Classroom | undefined;
  isPending: boolean;
  isError: boolean;
  error: unknown;
}>(() => ({
  data: undefined,
  isPending: false,
  isError: false,
  error: undefined,
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
  useStudentClassroom: () => classroomMock,
}));

vi.mock("@/features/lessons/hooks/use-lessons", () => ({
  useStudentLessons: () => lessonsMock,
  useTopicsForLessons: () => ({ topics: [topicFixture], loaded: false }),
}));

beforeEach(() => {
  classroomMock.data = undefined;
  classroomMock.isPending = false;
  classroomMock.isError = false;
  classroomMock.error = undefined;
  lessonsMock.data = undefined;
  lessonsMock.isPending = false;
  lessonsMock.isError = false;
  lessonsMock.refetch.mockClear();
  replace.mockClear();
});

describe("ClassroomDetailPage", () => {
  it("shows a loading state while the classroom loads", () => {
    classroomMock.isPending = true;
    render(<ClassroomDetailPage classroomId={1} />);
    expect(screen.getByLabelText(/loading classroom/i)).toHaveAttribute("aria-busy", "true");
  });

  it("renders the classroom header and its lessons", () => {
    classroomMock.data = classroomFixture;
    lessonsMock.data = lessonListFixture;
    render(<ClassroomDetailPage classroomId={1} />);

    expect(screen.getByRole("heading", { name: "Grade 8 - Section A" })).toBeInTheDocument();
    expect(screen.getByText("Section A · 2026-2027")).toBeInTheDocument();
    expect(screen.getByText("2 lessons")).toBeInTheDocument();
    const lessonLinks = screen.getAllByRole("link", { name: /open lesson/i });
    expect(lessonLinks[0]).toHaveAttribute("href", "/student/lessons/10");
    expect(lessonLinks[1]).toHaveAttribute("href", "/student/lessons/11");
    expect(screen.getByText("Linear Equations")).toBeInTheDocument();
  });

  it("shows the unavailable message for an unenrolled/hidden classroom", () => {
    classroomMock.isError = true;
    classroomMock.error = {
      code: "not_found",
      message: "No Classroom matches the given query.",
      status: 404,
    };
    classroomMock.data = undefined;
    render(<ClassroomDetailPage classroomId={999} />);
    expect(screen.getByText(/this classroom or lesson is unavailable/i)).toBeInTheDocument();
  });

  it("does not leak classroom details on an error", () => {
    classroomMock.isError = true;
    render(<ClassroomDetailPage classroomId={999} />);
    expect(screen.queryByText(/grade 8 - section a/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/2 lessons/i)).not.toBeInTheDocument();
  });

  it("shows a closed badge for an inactive classroom", () => {
    classroomMock.data = { ...classroomFixture, is_active: false };
    lessonsMock.data = lessonListFixture;
    render(<ClassroomDetailPage classroomId={1} />);
    expect(screen.getByText("Closed")).toBeInTheDocument();
  });
});