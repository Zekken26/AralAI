"use client";

import { useEffect, type ReactNode } from "react";

import { useRouter } from "next/navigation";

import { ROUTES } from "@/lib/routes";
import { useAuth } from "@/features/auth/hooks/use-auth";

type GuardMode = "anonymous" | "student" | "teacher";

/**
 * Route guard for navigation only. Backend authorization remains the security
 * boundary. Modes:
 * - anonymous: authenticated users are sent to their dashboard.
 * - student: anonymous -> /login, non-students -> /unauthorized.
 * - teacher: anonymous -> /login, non-teachers -> /unauthorized.
 */
export function RouteGuard({ mode, children }: { mode: GuardMode; children: ReactNode }) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) {
      return;
    }
    if (mode === "anonymous") {
      if (isAuthenticated && user) {
        router.replace(
          user.role === "STUDENT" ? ROUTES.studentDashboard : ROUTES.teacherDashboard,
        );
      }
      return;
    }
    if (!isAuthenticated) {
      router.replace(ROUTES.login);
      return;
    }
    if (user) {
      if (mode === "student" && user.role !== "STUDENT") {
        router.replace(ROUTES.unauthorized);
      }
      if (mode === "teacher" && user.role !== "TEACHER") {
        router.replace(ROUTES.unauthorized);
      }
    }
  }, [mode, isAuthenticated, isLoading, user, router]);

  if (mode !== "anonymous" && isLoading) {
    return null;
  }

  return <>{children}</>;
}
