import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { TopicAnalyticsPage } from "@/features/analytics/components/topic-analytics-page";
import { topicProgressFixture } from "./analytics-fixtures";
import type { ClassroomTopicProgress } from "@/features/analytics/types";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const topicMock = vi.hoisted<{
  data: ClassroomTopicProgress | undefined;
  isPending: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => void;
}>(() => ({ data: undefined, isPending: false, isError: false, error: null, refetch: vi.fn() }));

vi.mock("@/features/analytics/hooks/use-teacher-analytics", () => ({
  useTopicAnalytics: () => topicMock,
}));

beforeEach(() => {
  topicMock.data = topicProgressFixture;
  topicMock.isPending = false;
  topicMock.isError = false;
  topicMock.error = null;
});

describe("TopicAnalyticsPage", () => {
  it("renders the topic summary and mastery scores", () => {
    render(<TopicAnalyticsPage classroomId={1} topicId={1} />);
    expect(screen.getByRole("heading", { name: "Linear Equations" })).toBeVisible();
    expect(screen.getByText("M8AL-Ia-1 · Topic analytics")).toBeVisible();
    expect(screen.getByText("Average mastery")).toBeVisible();
    expect(screen.getByText("Students attempted")).toBeVisible();
    expect(screen.getByText("Ana Reyes")).toBeVisible();
    expect(screen.getByText("12.5%")).toBeVisible();
    expect(screen.getByText("Luis Tan")).toBeVisible();
    expect(screen.getAllByText("Needs support").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Developing").length).toBeGreaterThan(0);
  });

  it("renders topic rows sorted by mastery score descending by default", () => {
    render(<TopicAnalyticsPage classroomId={1} topicId={1} />);
    const names = screen.getAllByRole("link", { name: /Ana Reyes|Luis Tan/ }).map(
      (element) => element.textContent,
    );
    expect(names).toEqual(["Luis Tan", "Ana Reyes"]);
  });

  it("sorts by mastery score ascending when the header is toggled", async () => {
    const user = userEvent.setup();
    render(<TopicAnalyticsPage classroomId={1} topicId={1} />);
    await user.click(screen.getByRole("button", { name: /sort by mastery score/i }));
    const scores = screen.getAllByText(/12.5%|67.5%/).map((element) => element.textContent);
    expect(scores).toEqual(["12.5%", "67.5%"]);
  });

  it("filters by mastery status", async () => {
    const user = userEvent.setup();
    render(<TopicAnalyticsPage classroomId={1} topicId={1} />);
    await user.selectOptions(screen.getByLabelText("Filter by status"), "NEEDS_SUPPORT");
    expect(screen.getByText("Ana Reyes")).toBeVisible();
    expect(screen.queryByText("Luis Tan")).not.toBeInTheDocument();
  });

  it("searches students by name", async () => {
    const user = userEvent.setup();
    render(<TopicAnalyticsPage classroomId={1} topicId={1} />);
    await user.type(screen.getByLabelText("Search students"), "luis");
    expect(screen.queryByText("Ana Reyes")).not.toBeInTheDocument();
    expect(screen.getByText("Luis Tan")).toBeVisible();
  });

  it("reports when no students match the current filter", async () => {
    const user = userEvent.setup();
    render(<TopicAnalyticsPage classroomId={1} topicId={1} />);
    await user.type(screen.getByLabelText("Search students"), "nobody");
    expect(screen.getByText("No students match the current filter.")).toBeVisible();
  });

  it("renders an empty state when no students have attempted the topic", () => {
    topicMock.data = {
      topic: { id: 9, title: "Functions", code: "M8AL-IIa-1" },
      average_mastery: null,
      attempted_students: 0,
      distribution: { needs_support: 0, developing: 0, proficient: 0, mastered: 0 },
      students: [],
    };
    render(<TopicAnalyticsPage classroomId={1} topicId={9} />);
    expect(
      screen.getByText("No submitted assessments have produced progress data yet."),
    ).toBeVisible();
  });

  it("reports an inaccessible topic", () => {
    topicMock.isError = true;
    topicMock.error = { status: 404, code: "not_found", message: "Classroom not found." };
    render(<TopicAnalyticsPage classroomId={1} topicId={9} />);
    expect(
      screen.getByText("This classroom is unavailable or you do not have access."),
    ).toBeVisible();
  });
});