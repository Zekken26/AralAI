import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ClassroomListPage } from "@/features/classrooms/components/classroom-list-page";
import { classroomListFixture } from "./fixtures";
import type { ClassroomList } from "@/types/classrooms";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: push, prefetch: vi.fn() }),
}));

const classroomsQueryMock = vi.hoisted<{
  data: ClassroomList | undefined;
  isPending: boolean;
  isError: boolean;
  refetch: ReturnType<typeof vi.fn>;
}>(() => ({
  data: undefined,
  isPending: false,
  isError: false,
  refetch: vi.fn(),
}));

vi.mock("@/features/classrooms/hooks/use-classrooms", () => ({
  useStudentClassrooms: () => classroomsQueryMock,
  useJoinClassroom: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

beforeEach(() => {
  classroomsQueryMock.data = undefined;
  classroomsQueryMock.isPending = false;
  classroomsQueryMock.isError = false;
  classroomsQueryMock.refetch.mockClear();
  push.mockClear();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("ClassroomListPage", () => {
  it("shows skeletons while classrooms are loading", () => {
    classroomsQueryMock.isPending = true;
    render(<ClassroomListPage />);
    expect(screen.getByLabelText(/loading your classrooms/i)).toHaveAttribute("aria-busy", "true");
  });

  it("renders enrolled classroom cards with links", () => {
    classroomsQueryMock.data = classroomListFixture;
    render(<ClassroomListPage />);
    expect(screen.getByRole("heading", { name: "Grade 8 - Section A" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Old Algebra Club" })).toBeInTheDocument();
    expect(screen.getByText("Section A · 2026-2027")).toBeInTheDocument();
    expect(screen.getByText("Closed")).toBeInTheDocument();
    const openLinks = screen.getAllByRole("link", { name: /open classroom/i });
    expect(openLinks[0]).toHaveAttribute("href", "/student/classrooms/1");
    expect(openLinks[1]).toHaveAttribute("href", "/student/classrooms/2");
  });

  it("shows the empty state when there are no classrooms", () => {
    classroomsQueryMock.data = { count: 0, next: null, previous: null, results: [] };
    render(<ClassroomListPage />);
    expect(screen.getByText(/you have not joined any classrooms yet/i)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /join a classroom/i })).toHaveLength(2);
  });

  it("shows an error with a retry action on failure", async () => {
    classroomsQueryMock.isError = true;
    classroomsQueryMock.data = undefined;
    const user = userEvent.setup();
    render(<ClassroomListPage />);
    expect(screen.getByText(/could not load your classrooms/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /retry/i }));
    expect(classroomsQueryMock.refetch).toHaveBeenCalled();
  });

  it("opens the join dialog from the header button", async () => {
    classroomsQueryMock.data = { count: 0, next: null, previous: null, results: [] };
    const user = userEvent.setup();
    render(<ClassroomListPage />);
    await user.click(screen.getAllByRole("button", { name: /join a classroom/i })[0]);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText(/classroom code/i)).toBeInTheDocument();
  });
});