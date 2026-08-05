import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

import { useJoinClassroom } from "@/features/classrooms/hooks/use-classrooms";

vi.mock("@/features/classrooms/api/classrooms.api", () => ({
  joinClassroomRequest: vi.fn(),
}));

import { joinClassroomRequest } from "@/features/classrooms/api/classrooms.api";

function JoinButton() {
  const join = useJoinClassroom();
  return (
    <button type="button" onClick={() => join.mutateAsync("AB12CD34")}>
      Join
    </button>
  );
}

function Harness({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  return (
    <>
      {children}
      <span data-testid="cache-keys">{JSON.stringify(queryClient.getQueryCache().findAll().map((q) => q.queryKey))}</span>
    </>
  );
}

beforeEach(() => {
  vi.mocked(joinClassroomRequest).mockReset();
});

describe("useJoinClassroom query invalidation", () => {
  it("invalidates the student classroom list after a successful join", async () => {
    vi.mocked(joinClassroomRequest).mockResolvedValue({
      id: 4,
      classroom: 7,
      status: "ACTIVE",
    });

    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const user = userEvent.setup();
    render(
      <QueryClientProvider client={queryClient}>
        <Harness>
          <JoinButton />
        </Harness>
      </QueryClientProvider>,
    );

    await user.click(screen.getByRole("button", { name: /join/i }));

    await waitFor(() => {
      expect(joinClassroomRequest).toHaveBeenCalledWith("AB12CD34");
    });
    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["classrooms", "student"],
      });
    });
  });
});