import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { RegisterForm } from "@/features/auth/components/register-form";
import { ROUTES } from "@/lib/routes";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: replace, prefetch: vi.fn() }),
}));

const register = vi.fn();
vi.mock("@/features/auth/hooks/use-auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/auth/hooks/use-auth")>();
  return {
    ...actual,
    useAuth: () => ({
      user: undefined,
      isAuthenticated: false,
      isLoading: false,
      error: undefined,
      login: vi.fn(),
      register,
      logout: vi.fn(),
      refetchUser: vi.fn(),
      isLoggingIn: false,
      isRegistering: false,
    }),
  };
});

beforeEach(() => {
  replace.mockClear();
  register.mockReset();
});

describe("RegisterForm", () => {
  it("offers STUDENT and TEACHER roles but never ADMIN", () => {
    render(<RegisterForm />);
    expect(screen.getByRole("radio", { name: /i am a student/i })).toBeChecked();
    expect(screen.getByRole("radio", { name: /i am a teacher/i })).not.toBeChecked();
    expect(screen.queryByRole("radio", { name: /admin/i })).not.toBeInTheDocument();
  });

  it("rejects a short password before submitting", async () => {
    const user = userEvent.setup();
    render(<RegisterForm />);
    await user.type(screen.getByLabelText("Email"), "new@aralai.test");
    await user.type(screen.getByLabelText("Password"), "short");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(await screen.findByText(/at least 8 characters/i)).toBeInTheDocument();
    expect(register).not.toHaveBeenCalled();
  });

  it("registers as TEACHER and redirects to the teacher dashboard", async () => {
    const user = userEvent.setup();
    register.mockResolvedValue({ role: "TEACHER" });
    render(<RegisterForm />);

    await user.click(screen.getByRole("radio", { name: /i am a teacher/i }));
    await user.type(screen.getByLabelText("Email"), "teacher@aralai.test");
    await user.type(screen.getByLabelText("Password"), "secure-pass-123");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    await vi.waitFor(() => {
      expect(replace).toHaveBeenCalledWith(ROUTES.teacherDashboard);
    });
    expect(register).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "teacher@aralai.test",
        role: "TEACHER",
      }),
    );
  });

  it("maps backend field errors onto the matching inputs", async () => {
    const user = userEvent.setup();
    register.mockRejectedValue({
      fields: { email: ["A user with this email already exists."] },
    });
    render(<RegisterForm />);

    await user.type(screen.getByLabelText("Email"), "taken@aralai.test");
    await user.type(screen.getByLabelText("Password"), "secure-pass-123");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(
      await screen.findByText(/a user with this email already exists/i),
    ).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("shows a generic error when the request fails without field details", async () => {
    const user = userEvent.setup();
    register.mockRejectedValue({ message: "Server hiccup." });
    render(<RegisterForm />);

    await user.type(screen.getByLabelText("Email"), "new@aralai.test");
    await user.type(screen.getByLabelText("Password"), "secure-pass-123");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(await screen.findByText(/server hiccup/i)).toBeInTheDocument();
  });
});