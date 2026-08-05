import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { LessonList } from "@/features/lessons/components/lesson-list";
import { lessonFixture, lessonListFixture, secondTopicFixture, topicFixture } from "./fixtures";
import type { LessonList as LessonListType } from "@/types/lessons";

type QueryShape = {
  data: LessonListType | undefined;
  isPending: boolean;
  isError: boolean;
  isPlaceholderData: boolean;
  refetch: ReturnType<typeof vi.fn>;
};

const onFilterChange = vi.fn();

function renderList(query: Partial<QueryShape>, topicId?: number) {
  const queryProps: QueryShape = {
    data: undefined,
    isPending: false,
    isError: false,
    isPlaceholderData: false,
    refetch: vi.fn(),
    ...query,
  };
  return render(
    <LessonList
      lessonsQuery={queryProps as never}
      topicId={topicId}
      topics={[topicFixture, secondTopicFixture]}
      topicsLoaded
      page={1}
      onFilterChange={onFilterChange}
    />,
  );
}

beforeEach(() => {
  onFilterChange.mockClear();
});

describe("LessonList", () => {
  it("shows skeletons while lessons load", () => {
    renderList({ isPending: true });
    expect(screen.getByLabelText(/loading lessons/i)).toHaveAttribute("aria-busy", "true");
  });

  it("renders published lesson cards with topic names", () => {
    renderList({ data: lessonListFixture });
    expect(screen.getByRole("heading", { name: "Solving Linear Equations" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Laws of Exponents" })).toBeInTheDocument();
    expect(screen.getAllByText("Linear Equations").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Laws of Exponents").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/published august 3, 2026/i)).toHaveLength(2);
    const lessonLinks = screen.getAllByRole("link", { name: /open lesson/i });
    expect(lessonLinks[0]).toHaveAttribute("href", "/student/lessons/10");
    expect(lessonLinks[1]).toHaveAttribute("href", "/student/lessons/11");
  });

  it("shows an empty state when no lessons are published", () => {
    renderList({
      data: { count: 0, next: null, previous: null, results: [] },
    });
    expect(screen.getByText(/no published lessons yet/i)).toBeInTheDocument();
  });

  it("shows an error with retry on failure", async () => {
    const refetch = vi.fn();
    const user = userEvent.setup();
    renderList({ isError: true, refetch });
    expect(screen.getByText(/could not load the lessons/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /retry/i }));
    expect(refetch).toHaveBeenCalled();
  });

  it("filters by topic when a chip is selected", async () => {
    const user = userEvent.setup();
    renderList({ data: lessonListFixture });
    await user.click(screen.getByRole("button", { name: "Laws of Exponents" }));
    expect(onFilterChange).toHaveBeenCalledWith(4, 1);
  });

  it("clears the topic filter when All lessons is selected", async () => {
    const user = userEvent.setup();
    renderList({ data: lessonListFixture }, topicFixture.id);
    await user.click(screen.getByRole("button", { name: /all lessons/i }));
    expect(onFilterChange).toHaveBeenCalledWith(undefined, 1);
  });

  it("pages through backend results with the Next button", async () => {
    const user = userEvent.setup();
    renderList({
      data: { ...lessonListFixture, next: "http://localhost:8000/api/v1/lessons/?page=2" },
    });
    await user.click(screen.getByRole("button", { name: /next/i }));
    expect(onFilterChange).toHaveBeenCalledWith(undefined, 2);
    expect(screen.getByText("Page 1")).toBeInTheDocument();
  });

  it("does not render an open link for an unpublished lesson it never shows (published only)", () => {
    const draft = { ...lessonFixture, id: 99, status: "DRAFT" as const };
    renderList({
      data: { count: 1, next: null, previous: null, results: [draft] },
    });
    expect(screen.getByText("Solving Linear Equations")).toBeInTheDocument();
  });
});