"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { ROUTES } from "@/lib/routes";
import { useProgress } from "@/features/progress/hooks/use-progress";

export function ProgressSummary() {
  const router = useRouter();
  const query = useProgress();

  if (query.isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (query.isError) {
    return (
      <ErrorAlert>
        <p>We could not load your progress.</p>
        <Button variant="secondary" size="sm" onClick={() => query.refetch()} className="mt-1">
          Retry
        </Button>
      </ErrorAlert>
    );
  }

  const progress = query.data;
  if (!progress) return null;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-slate-900">Progress</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Mastery average</p>
          <p className="text-2xl font-bold text-slate-900">{progress.overall_mastery_average ?? "—"}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Topics mastered</p>
          <p className="text-2xl font-bold text-slate-900">{progress.topics_mastered}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Needs support</p>
          <p className="text-2xl font-bold text-slate-900">{progress.topics_needing_support}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Attempts submitted</p>
          <p className="text-2xl font-bold text-slate-900">{progress.total_submitted_attempts}</p>
        </div>
      </div>

      {progress.recent_performance_trend.length > 0 ? (
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Recent performance</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {progress.recent_performance_trend.map((item) => (
              <li key={item.attempt} className="flex items-center gap-3 text-sm text-slate-600">
                <span>Attempt #{item.attempt}</span>
                <span className={item.passed ? "text-teal-700" : "text-red-700"}>{item.passed ? "Passed" : "Not passed"}</span>
                {item.score != null ? <span>{item.score}%</span> : null}
                <span className="text-slate-400">{new Date(item.submitted_at).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <Button variant="secondary" onClick={() => router.push(ROUTES.student.recommendations)}>
        View recommendations
      </Button>
    </div>
  );
}