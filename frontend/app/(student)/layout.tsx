import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { RouteGuard } from "@/features/auth/components/route-guard";
import { ROUTES } from "@/lib/routes";

const STUDENT_NAV = [
  { href: ROUTES.student.dashboard, label: "Dashboard" },
  { href: ROUTES.student.classrooms, label: "Classrooms" },
  { href: ROUTES.student.lessons, label: "Lessons" },
  { href: ROUTES.student.quizzes, label: "Quizzes" },
  { href: ROUTES.student.progress, label: "Progress" },
  { href: ROUTES.student.recommendations, label: "Recommendations" },
];

export default function StudentLayout({ children }: { children: ReactNode }) {
  return (
    <RouteGuard mode="student">
      <AppShell items={STUDENT_NAV} title="Student">
        <main id="main-content" className="focus-visible:outline-none">
          {children}
        </main>
      </AppShell>
    </RouteGuard>
  );
}