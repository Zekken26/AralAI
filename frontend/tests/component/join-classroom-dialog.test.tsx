import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { JoinClassroomDialog } from "@/features/classrooms/components/join-classroom-dialog";

const hooksMock = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
  isPending: false,
}));

vi.mock("@/features/classrooms/hooks/use-classrooms", () => ({
  useJoinClassroom: () => ({
    mutateAsync: hooksMock.mutateAsync,
    isPending: hooksMock.isPending,
  }),
}));

const onJoined = vi.fn();
const onClose = vi.fn();

function renderDialog() {
  return render(<JoinClassroomDialog open onClose={onClose} onJoined={onJoined} />);
}

beforeEach(() => {
  hooksMock.mutateAsync.mockReset();
  hooksMock.isPending = false;
  onJoined.mockClear();
  onClose.mockClear();
});

describe("JoinClassroomDialog", () => {
  it("requires a code before submitting", async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole("button", { name: /join classroom/i }));
    expect(await screen.findByText(/enter your classroom code/i)).toBeInTheDocument();
    expect(hooksMock.mutateAsync).not.toHaveBeenCalled();
  });

  it("normalizes the code to uppercase and reports the joined classroom", async () => {
    const user = userEvent.setup();
    hooksMock.mutateAsync.mockResolvedValue({ id: 4, classroom: 7, status: "ACTIVE" });
    renderDialog();

    await user.type(screen.getByLabelText(/classroom code/i), "  ab12cd34  ");
    await user.click(screen.getByRole("button", { name: /join classroom/i }));

    await waitFor(() => {
      expect(hooksMock.mutateAsync).toHaveBeenCalledWith("AB12CD34");
    });
    await waitFor(() => {
      expect(onJoined).toHaveBeenCalledWith(7);
    });
    expect(onClose).toHaveBeenCalled();
  });

  it("disables the submit button while a join is in flight", () => {
    hooksMock.isPending = true;
    renderDialog();
    expect(screen.getByRole("button", { name: /joining…/i })).toBeDisabled();
  });

  it("shows the invalid code message from the backend code", async () => {
    const user = userEvent.setup();
    hooksMock.mutateAsync.mockRejectedValue({
      code: "INVALID_JOIN_CODE",
      message: "The join code does not match any classroom.",
      status: 400,
    });
    renderDialog();

    await user.type(screen.getByLabelText(/classroom code/i), "NOPE0001");
    await user.click(screen.getByRole("button", { name: /join classroom/i }));

    expect(await screen.findByText(/the classroom code is invalid/i)).toBeInTheDocument();
    expect(onJoined).not.toHaveBeenCalled();
  });

  it("shows the duplicate enrollment message from the backend code", async () => {
    const user = userEvent.setup();
    hooksMock.mutateAsync.mockRejectedValue({
      code: "DUPLICATE_ENROLLMENT",
      message: "You are already enrolled in this classroom.",
      status: 409,
    });
    renderDialog();

    await user.type(screen.getByLabelText(/classroom code/i), "AB12CD34");
    await user.click(screen.getByRole("button", { name: /join classroom/i }));

    expect(await screen.findByText(/you have already joined this classroom/i)).toBeInTheDocument();
  });

  it("shows a network fallback when the request fails to connect", async () => {
    const user = userEvent.setup();
    hooksMock.mutateAsync.mockRejectedValue({
      code: "NETWORK_ERROR",
      message: "Cannot reach the server.",
    });
    renderDialog();

    await user.type(screen.getByLabelText(/classroom code/i), "AB12CD34");
    await user.click(screen.getByRole("button", { name: /join classroom/i }));

    expect(
      await screen.findByText(/we could not connect to the server. try again/i),
    ).toBeInTheDocument();
  });
});