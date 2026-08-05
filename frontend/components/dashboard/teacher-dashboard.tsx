"use client";

import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/feedback/empty-state";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";
import { useAuth } from "@/features/auth/hooks/use-auth";

const PLACEHOLDER_CARDS = [
  {
    title: "Classrooms",
    description: "Your classrooms and student rosters will appear here.",
    href: ROUTES.teacher.classrooms,
  },
  {
    title: "Lessons",
    description: "Lessons you have published will appear here.",
    href: ROUTES.teacher.lessons,
  },
  {
    title: "Quizzes",
    description: "Quizzes and assessment results will appear here.",
    href: ROUTES.teacher.quizzes,
  },
  {
    title: "Analytics",
    description: "Class progress and mastery insights will appear here.",
    href: ROUTES.teacher.analytics,
  },
];

export function TeacherDashboard() {
  const { user } = useAuth();
  const firstName = user?.first_name || user?.email || "there";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Hi, {firstName}!</h1>
        <p className="mt-1 text-sm text-slate-600">
          Teacher account &mdash; manage classrooms and track class progress.
        </p>
        <span className="mt-2 inline-block rounded bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-800">
          Teacher
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PLACEHOLDER_CARDS.map((card) => (
          <Card key={card.title}>
            <h2 className="text-base font-semibold text-slate-900">{card.title}</h2>
            <p className="mt-1 text-sm text-slate-600">{card.description}</p>
            <p className="mt-3 text-xs font-medium uppercase tracking-wide text-slate-400">
              Coming soon
            </p>
          </Card>
        ))}
      </div>

      <EmptyState
        title="Create your first classroom to get started"
        description="Classroom creation and student enrollment arrive in the next milestone. Until then, this dashboard stays empty."
        action={
          <Button variant="secondary" size="sm" disabled aria-disabled="true" title="Coming in the next milestone">
            Create a classroom
          </Button>
        }
      />
    </div>
  );
}