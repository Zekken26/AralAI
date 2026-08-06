import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { StudentAnalyticsPage } from "@/features/analytics/components/student-analytics-page";
import { emptyStudentProgressFixture, studentProgressFixture } from "./analytics-fixtures";
import type { TeacherStudentProgress } from "@/features/analytics/types";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const studentMock = vi.hoisted<{
  data: TeacherStudentProgress | undefined;
  isPending: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => void;
}>(() => ({ data: undefined, isPending: false, isError: false, error: null, refetch: vi.fn() }));

vi.mock("@/features/analytics/hooks/use-teacher-analytics", () => ({
  useStudentAnalytics: () => studentMock,
}));

beforeEach(() => {
  studentMock.data = studentProgressFixture;
  studentMock.isPending = false;
  studentMock.isError = false;
  studentMock.error = null;
});

describe("StudentAnalyticsPage", () => {
  it("renders the summary cards and topic mastery rows", () => {
    render(<StudentAnalyticsPage classroomId={1} studentId={7} />);
    expect(screen.getByRole("heading", { name: "Ana Reyes" })).toBeVisible();
    expect(screen.getByText("Overall mastery")).toBeVisible();
    expect(screen.getByText("56.3%")).toBeVisible();
    expect(screen.getByText("Topics attempted")).toBeVisible();
    expect(screen.getByText("Topics mastered")).toBeVisible();
    expect(screen.getByText("Topics needing support")).toBeVisible();
    expect(screen.getByText("Laws of Exponents")).toBeVisible();
    expect(screen.getByText("Linear Equations")).toBeVisible();
    expect(screen.getAllByText("100.0%").length).toBeGreaterThan(0);
    expect(screen.getAllByText("12.5%").length).toBeGreaterThan(0);
  });

  it("describes the range of scores in plain text", () => {
    render(<StudentAnalyticsPage classroomId={1} studentId={7} />);
    expect(
      screen.getByText("Scores range from 12.5% to 100.0% across 2 topics."),
    ).toBeVisible();
  });

  it("filters rows by mastery status", async () => {
    const user = userEvent.setup();
    render(<StudentAnalyticsPage classroomId={1} studentId={7} />);
    await user.selectOptions(screen.getByLabelText("Filter by status"), "NEEDS_SUPPORT");
    expect(screen.getByText("Linear Equations")).toBeVisible();
    expect(screen.queryByText("Laws of Exponents")).not.toBeInTheDocument();
  });

  it("renders the no-activity state when the student has no topics", () => {
    studentMock.data = emptyStudentProgressFixture;
    render(<StudentAnalyticsPage classroomId={1} studentId={7} />);
    expect(screen.getByText("Overall mastery")).toBeVisible();
    expect(
      screen.getByText("No submitted assessments have produced progress data yet."),
    ).toBeVisible();
  });

  it("reports an inaccessible student", () => {
    studentMock.isError = true;
    studentMock.error = {
      status: 404,
      code: "not_found",
      message: "Progress data not found for this student.",
    };
    render(<StudentAnalyticsPage classroomId={1} studentId={99} />);
    expect(
      screen.getByText("This classroom is unavailable or you do not have access."),
    ).toBeVisible();
  });
});