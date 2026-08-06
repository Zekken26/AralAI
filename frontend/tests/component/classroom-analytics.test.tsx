import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { ClassroomAnalyticsOverview } from "@/features/analytics/components/classroom-analytics-overview";
import {
  classroomProgressFixture,
  emptyProgressFixture,
  quizResultsFixture,
  rosterFixture,
  supportFixture,
} from "./analytics-fixtures";
import { classroomFixture } from "./fixtures";
import type { ClassroomProgress, StudentsNeedingSupport } from "@/features/analytics/types";
import type { ClassroomQuizResultList } from "@/features/quizzes/schemas/teacher";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const classroomMock = vi.hoisted<{
  data: typeof classroomFixture | undefined;
  isPending: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => void;
}>(() => ({
  data: undefined,
  isPending: false,
  isError: false,
  error: null,
  refetch: vi.fn(),
}));

const rosterMock = vi.hoisted<{
  data: typeof rosterFixture | undefined;
  isPending: boolean;
  isError: boolean;
}>(() => ({ data: undefined, isPending: false, isError: false }));

const progressMock = vi.hoisted<{
  data: ClassroomProgress | undefined;
  isPending: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => void;
}>(() => ({ data: undefined, isPending: false, isError: false, error: null, refetch: vi.fn() }));

const supportMock = vi.hoisted<{
  data: StudentsNeedingSupport | undefined;
  isPending: boolean;
  isError: boolean;
  refetch: () => void;
}>(() => ({ data: undefined, isPending: false, isError: false, refetch: vi.fn() }));

const quizResultsMock = vi.hoisted<{
  data: ClassroomQuizResultList | undefined;
  isPending: boolean;
  isError: boolean;
  refetch: () => void;
}>(() => ({ data: undefined, isPending: false, isError: false, refetch: vi.fn() }));

vi.mock("@/features/classrooms/hooks/use-teacher-classrooms", () => ({
  useTeacherClassroom: () => classroomMock,
  useTeacherClassroomStudents: () => rosterMock,
}));

vi.mock("@/features/analytics/hooks/use-teacher-analytics", () => ({
  useClassroomAnalytics: () => progressMock,
  useClassroomSupport: () => supportMock,
}));

vi.mock("@/features/quizzes/hooks/use-teacher-quizzes", () => ({
  useClassroomQuizResults: () => quizResultsMock,
}));

beforeEach(() => {
  classroomMock.data = classroomFixture;
  classroomMock.isPending = false;
  classroomMock.isError = false;
  classroomMock.error = null;
  rosterMock.data = rosterFixture;
  rosterMock.isPending = false;
  rosterMock.isError = false;
  progressMock.data = classroomProgressFixture;
  progressMock.isPending = false;
  progressMock.isError = false;
  progressMock.error = null;
  supportMock.data = supportFixture;
  supportMock.isPending = false;
  supportMock.isError = false;
  quizResultsMock.data = quizResultsFixture;
  quizResultsMock.isPending = false;
  quizResultsMock.isError = false;
});

describe("ClassroomAnalyticsOverview", () => {
  it("renders summary cards from backend values", () => {
    render(<ClassroomAnalyticsOverview classroomId={1} />);
    expect(screen.getByRole("heading", { name: "Grade 8 - Section A" })).toBeVisible();
    expect(screen.getAllByText("Average mastery").length).toBeGreaterThan(0);
    expect(screen.getAllByText("31.0%").length).toBeGreaterThan(0);
    expect(screen.getByText("Topics attempted")).toBeVisible();
    expect(screen.getAllByText("Students needing support").length).toBeGreaterThan(0);
    expect(screen.getByText("Submitted attempts")).toBeVisible();
    expect(screen.getByText("Students in class")).toBeVisible();
    expect(screen.getByText("4")).toBeVisible();
  });

  it("shows weakest and strongest topics with links", () => {
    render(<ClassroomAnalyticsOverview classroomId={1} />);
    expect(screen.getByText("Weakest topics")).toBeVisible();
    expect(screen.getByText("Strongest topics")).toBeVisible();
    const weakestLink = screen.getByRole("link", { name: "Linear Equations" });
    expect(weakestLink.getAttribute("href")).toBe(
      "/teacher/classrooms/1/analytics/topics/1",
    );
    expect(screen.getAllByText("31.0%").length).toBeGreaterThan(0);
    expect(screen.getAllByText("92.0%").length).toBeGreaterThan(0);
  });

  it("renders the mastery-status distribution with its textual description", () => {
    render(<ClassroomAnalyticsOverview classroomId={1} />);
    const bar = screen.getByRole("img", {
      name: /2 mastered, 1 developing, 1 needing support/,
    });
    expect(bar).toBeVisible();
    expect(screen.getAllByText("Needs support").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Developing").length).toBeGreaterThan(0);
  });

  it("renders students needing support with weak topics and a progress link", () => {
    render(<ClassroomAnalyticsOverview classroomId={1} />);
    expect(screen.getByRole("heading", { name: "Students needing support" })).toBeVisible();
    expect(screen.getByText("Ana Reyes")).toBeVisible();
    expect(screen.getByText("1 weak topic")).toBeVisible();
    expect(screen.getByText("Lowest mastery: 12.5% · Weak topics: Linear Equations")).toBeVisible();
    expect(
      screen.getByRole("link", { name: "View progress" }).getAttribute("href"),
    ).toBe("/teacher/classrooms/1/analytics/students/7");
  });

  it("links quiz performance rows to the existing quiz results page", () => {
    render(<ClassroomAnalyticsOverview classroomId={1} />);
    expect(screen.getByText("Quiz performance")).toBeVisible();
    expect(screen.getByText("Sum Quiz 2")).toBeVisible();
    expect(screen.getByText("88.9%")).toBeVisible();
    expect(screen.getByRole("link", { name: "View results" }).getAttribute("href")).toBe(
      "/teacher/quizzes/5/results",
    );
  });

  it("shows the empty-progress state when no mastery data exists", () => {
    progressMock.data = emptyProgressFixture;
    render(<ClassroomAnalyticsOverview classroomId={1} />);
    expect(
      screen.getByText("No submitted assessments have produced progress data yet."),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "Create a lesson" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Create a quiz" })).toBeVisible();
  });

  it("shows the support empty message when no student meets the criteria", () => {
    supportMock.data = { count: 0, students: [] };
    render(<ClassroomAnalyticsOverview classroomId={1} />);
    expect(
      screen.getByText("No students currently meet the support criteria."),
    ).toBeVisible();
  });

  it("reports an inaccessible classroom", () => {
    classroomMock.isError = true;
    classroomMock.error = { status: 404, code: "not_found", message: "Classroom not found." };
    render(<ClassroomAnalyticsOverview classroomId={1} />);
    expect(
      screen.getByText("This classroom is unavailable or you do not have access."),
    ).toBeVisible();
  });

  it("reports a malformed analytics response", () => {
    progressMock.isError = true;
    progressMock.error = { status: 0, code: "INVALID_RESPONSE", message: "unexpected" };
    render(<ClassroomAnalyticsOverview classroomId={1} />);
    expect(screen.getByText("We could not read the analytics response.")).toBeVisible();
  });
});
