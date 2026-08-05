import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { RouteGuard } from "@/features/auth/components/route-guard";
import { ROUTES } from "@/lib/routes";

const TEACHER_NAV = [
  { href: ROUTES.teacher.dashboard, label: "Dashboard" },
  { href: ROUTES.teacher.classrooms, label: "Classrooms", placeholder: true },
  { href: ROUTES.teacher.lessons, label: "Lessons", placeholder: true },
  { href: ROUTES.teacher.quizzes, label: "Quizzes", placeholder: true },
  { href: ROUTES.teacher.analytics, label: "Analytics", placeholder: true },
];

export default function TeacherLayout({ children }: { children: ReactNode }) {
  return (
    <RouteGuard mode="teacher">
      <AppShell items={TEACHER_NAV} title="Teacher">
        <main id="main-content" className="focus-visible:outline-none">
          {children}
        </main>
      </AppShell>
    </RouteGuard>
  );
}