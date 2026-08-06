import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { AnalyticsLandingPage } from "@/features/analytics/components/analytics-landing-page";
import { analyticsClassroomListFixture } from "./analytics-fixtures";
import type { ClassroomList } from "@/types/classrooms";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
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

vi.mock("@/features/classrooms/hooks/use-teacher-classrooms", () => ({
  useTeacherClassrooms: () => classroomsMock,
}));

beforeEach(() => {
  classroomsMock.data = undefined;
  classroomsMock.isPending = false;
  classroomsMock.isError = false;
});

describe("AnalyticsLandingPage", () => {
  it("shows a loading state while classrooms are pending", () => {
    classroomsMock.isPending = true;
    const { container } = render(<AnalyticsLandingPage />);
    expect(container.querySelector('[aria-busy="true"]')).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Analytics" })).not.toBeInTheDocument();
  });

  it("lists classrooms with section, school year, and an open-analytics action", () => {
    classroomsMock.data = analyticsClassroomListFixture;
    render(<AnalyticsLandingPage />);
    expect(screen.getByText("Grade 8 - Section A")).toBeVisible();
    expect(screen.getAllByText(/Section A/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/2026-2027/).length).toBeGreaterThan(0);
    expect(
      screen.getByRole("link", { name: "Open analytics" }).getAttribute("href"),
    ).toBe("/teacher/classrooms/1/analytics");
  });

  it("renders an empty state when the teacher has no classrooms", () => {
    classroomsMock.data = { count: 0, next: null, previous: null, results: [] };
    render(<AnalyticsLandingPage />);
    expect(screen.getByText("No classrooms yet")).toBeVisible();
    expect(screen.getByRole("link", { name: "Create a classroom" })).toBeVisible();
  });

  it("renders an error state with a retry action on API failure", () => {
    classroomsMock.isError = true;
    render(<AnalyticsLandingPage />);
    expect(screen.getByText(/could not load your classrooms/i)).toBeVisible();
    expect(screen.getByRole("button", { name: "Retry" })).toBeVisible();
  });
});
