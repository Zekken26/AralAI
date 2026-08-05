"use client";

import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/feedback/empty-state";
import { ROUTES } from "@/lib/routes";
import { useAuth } from "@/features/auth/hooks/use-auth";

const PLACEHOLDER_CARDS = [
  {
    title: "Classrooms",
    description: "Your classrooms will appear here.",
    href: ROUTES.student.classrooms,
  },
  {
    title: "Lessons",
    description: "Lessons from your teachers will appear here.",
    href: ROUTES.student.lessons,
  },
  {
    title: "Quizzes",
    description: "Assigned quizzes will appear here.",
    href: ROUTES.student.quizzes,
  },
  {
    title: "Progress",
    description: "Your mastery and scores will appear here.",
    href: ROUTES.student.progress,
  },
];

export function StudentDashboard() {
  const { user } = useAuth();
  const firstName = user?.first_name || user?.email || "there";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Hi, {firstName}!</h1>
        <p className="mt-1 text-sm text-slate-600">
          Student account &mdash; practice quizzes and track your progress.
        </p>
        <span className="mt-2 inline-block rounded bg-teal-100 px-2 py-0.5 text-xs font-semibold text-teal-800">
          Student
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
        title="Your learning data will appear here"
        description="Join a classroom with a code your teacher shares, then your lessons, quizzes, and progress will show up on this dashboard."
      />
    </div>
  );
}