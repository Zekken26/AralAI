import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { dashboardRouteForRole } from "@/features/auth/hooks/use-auth";
import { LoginForm } from "@/features/auth/components/login-form";
import { ROUTES } from "@/lib/routes";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: replace, prefetch: vi.fn() }),
}));

const login = vi.fn();
vi.mock("@/features/auth/hooks/use-auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/auth/hooks/use-auth")>();
  return {
    ...actual,
    useAuth: () => ({
      user: undefined,
      isAuthenticated: false,
      isLoading: false,
      error: undefined,
      login,
      register: vi.fn(),
      logout: vi.fn(),
      refetchUser: vi.fn(),
      isLoggingIn: false,
      isRegistering: false,
    }),
  };
});

beforeEach(() => {
  replace.mockClear();
  login.mockReset();
});

describe("dashboardRouteForRole", () => {
  it("maps STUDENT and TEACHER to their dashboards and anything else to /unauthorized", () => {
    expect(dashboardRouteForRole("STUDENT")).toBe(ROUTES.studentDashboard);
    expect(dashboardRouteForRole("TEACHER")).toBe(ROUTES.teacherDashboard);
    expect(dashboardRouteForRole("ADMIN")).toBe(ROUTES.unauthorized);
  });
});

describe("LoginForm", () => {
  it("renders email and password fields", () => {
    render(<LoginForm />);
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /sign in/i }),
    ).toBeInTheDocument();
  });

  it("shows validation errors for invalid input", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    await user.type(screen.getByLabelText("Email"), "not-an-email");
    await user.click(screen.getByRole("button", { name: /sign in/i }));
    expect(await screen.findByText(/enter a valid email/i)).toBeInTheDocument();
  });

  it("resolves the backend response into a role-aware redirect to the student dashboard", async () => {
    const user = userEvent.setup();
    login.mockResolvedValue({ role: "STUDENT" });
    render(<LoginForm />);
    await user.type(screen.getByLabelText("Email"), "student@aralai.test");
    await user.type(screen.getByLabelText("Password"), "secret");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await vi.waitFor(() => {
      expect(replace).toHaveBeenCalledWith(ROUTES.studentDashboard);
    });
    expect(login).toHaveBeenCalledWith({
      email: "student@aralai.test",
      password: "secret",
    });
  });

  it("shows a generic error when login fails", async () => {
    const user = userEvent.setup();
    login.mockRejectedValue({
      message: "No active account found with the given credentials",
    });
    render(<LoginForm />);
    await user.type(screen.getByLabelText("Email"), "student@aralai.test");
    await user.type(screen.getByLabelText("Password"), "wrong");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText(/no active account/i)).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});