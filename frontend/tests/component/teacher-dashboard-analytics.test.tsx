import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { TeacherDashboard } from "@/components/dashboard/teacher-dashboard";
import {
  classroomProgressFixture,
  emptyProgressFixture,
  quizResultsFixture,
  supportFixture,
} from "./analytics-fixtures";
import type { ClassroomList } from "@/types/classrooms";
import type { LessonList } from "@/types/lessons";
import type { TeacherQuizList } from "@/features/quizzes/schemas/teacher";
import type { ClassroomProgress, StudentsNeedingSupport } from "@/features/analytics/types";
import type { ClassroomQuizResultList } from "@/features/quizzes/schemas/teacher";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

vi.mock("@/features/auth/hooks/use-auth", () => ({
  useAuth: () => ({ user: { first_name: "Maria" } }),
}));

const classroomsMock = vi.hoisted<{
  data: ClassroomList | undefined;
  isPending: boolean;
  isError: boolean;
  refetch: () => void;
}>(() => ({ data: undefined, isPending: false, isError: false, refetch: vi.fn() }));

const lessonsMock = vi.hoisted<{
  data: LessonList | undefined;
  isPending: boolean;
  isError: boolean;
}>(() => ({ data: undefined, isPending: false, isError: false }));

const quizzesMock = vi.hoisted<{
  data: TeacherQuizList | undefined;
  isPending: boolean;
  isError: boolean;
}>(() => ({ data: undefined, isPending: false, isError: false }));

const progressMock = vi.hoisted<{
  data: ClassroomProgress | undefined;
  isPending: boolean;
  isError: boolean;
}>(() => ({ data: undefined, isPending: false, isError: false }));

const supportMock = vi.hoisted<{
  data: StudentsNeedingSupport | undefined;
  isPending: boolean;
  isError: boolean;
}>(() => ({ data: undefined, isPending: false, isError: false }));

const quizResultsMock = vi.hoisted<{
  data: ClassroomQuizResultList | undefined;
  isPending: boolean;
  isError: boolean;
}>(() => ({ data: undefined, isPending: false, isError: false }));

const emptyPaginated = { count: 0, next: null, previous: null, results: [] };

vi.mock("@/features/classrooms/hooks/use-teacher-classrooms", () => ({
  useTeacherClassrooms: () => classroomsMock,
}));

vi.mock("@/features/lessons/hooks/use-teacher-lessons", () => ({
  useTeacherLessons: () => lessonsMock,
}));

vi.mock("@/features/quizzes/hooks/use-teacher-quizzes", () => ({
  useTeacherQuizzes: () => quizzesMock,
  useClassroomQuizResults: () => quizResultsMock,
}));

vi.mock("@/features/analytics/hooks/use-teacher-analytics", () => ({
  useClassroomAnalytics: () => progressMock,
  useClassroomSupport: () => supportMock,
}));

beforeEach(() => {
  classroomsMock.data = {
    count: 1,
    next: null,
    previous: null,
    results: [
      {
        id: 1,
        name: "Grade 8 - Section A",
        section: "Section A",
        school_year: "2026-2027",
        join_code: "CODE1234",
        is_active: true,
        created_at: "2026-08-01T09:00:00Z",
        updated_at: "2026-08-01T09:00:00Z",
      },
    ],
  };
  classroomsMock.isPending = false;
  classroomsMock.isError = false;
  lessonsMock.data = emptyPaginated as LessonList;
  lessonsMock.isPending = false;
  lessonsMock.isError = false;
  quizzesMock.data = emptyPaginated as TeacherQuizList;
  quizzesMock.isPending = false;
  quizzesMock.isError = false;
  progressMock.data = classroomProgressFixture;
  progressMock.isPending = false;
  progressMock.isError = false;
  supportMock.data = supportFixture;
  supportMock.isPending = false;
  supportMock.isError = false;
  quizResultsMock.data = quizResultsFixture;
  quizResultsMock.isPending = false;
  quizResultsMock.isError = false;
});

describe("TeacherDashboard analytics preview", () => {
  it("renders real analytics previews for a classroom", () => {
    render(<TeacherDashboard />);
    expect(screen.getByRole("heading", { name: "Analytics at a glance" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Grade 8 - Section A" })).toBeVisible();
    expect(screen.getAllByText("31.0%").length).toBeGreaterThan(0);
    expect(screen.getByText(/Weakest: Linear Equations/)).toBeVisible();
    expect(screen.getByText("1 student needing support")).toBeVisible();
    expect(screen.getByText(/Latest quiz:/)).toBeVisible();
    expect(screen.getByText(/Sum Quiz 2/)).toBeVisible();
  });

  it("shows an empty preview with create links when no assessments exist", () => {
    progressMock.data = emptyProgressFixture;
    render(<TeacherDashboard />);
    expect(screen.getByText("No assessments yet.")).toBeVisible();
    expect(screen.getByRole("link", { name: "Create a lesson" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Create a quiz" })).toBeVisible();
  });

  it("marks a classroom with no support students without a badge", () => {
    supportMock.data = { count: 0, students: [] };
    render(<TeacherDashboard />);
    expect(screen.queryByText(/needing support/)).not.toBeInTheDocument();
    expect(screen.getAllByText("31.0%").length).toBeGreaterThan(0);
  });

  it("degrades to an unavailable note when the analytics query fails", () => {
    progressMock.isError = true;
    render(<TeacherDashboard />);
    expect(screen.getByText("Analytics unavailable.")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Hi, Maria!" })).toBeVisible();
  });
});