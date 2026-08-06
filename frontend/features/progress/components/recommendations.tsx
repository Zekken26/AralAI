"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { ROUTES } from "@/lib/routes";
import { useRecommendations } from "@/features/progress/hooks/use-progress";
import { useCompleteRecommendation } from "@/features/progress/hooks/use-progress";
import { useDismissRecommendation } from "@/features/progress/hooks/use-progress";

const priorityLabel: Record<string, string> = {
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
};

const typeLabel: Record<string, string> = {
  REVIEW_LESSON: "Review lesson",
  EASY_PRACTICE: "Easy practice",
  GUIDED_PRACTICE: "Guided practice",
  MIXED_PRACTICE: "Mixed practice",
  ADVANCE_TOPIC: "Advance topic",
  SPACED_REVIEW: "Spaced review",
};

export function RecommendationsPage() {
  const router = useRouter();
  const query = useRecommendations();
  const complete = useCompleteRecommendation();
  const dismiss = useDismissRecommendation();
  const [actionError, setActionError] = useState<string | null>(null);

  const recommendations = query.data?.results ?? [];

  const handleComplete = async (id: number) => {
    setActionError(null);
    try {
      await complete.mutateAsync(id);
    } catch {
      setActionError("Could not complete the recommendation. Please try again.");
    }
  };

  const handleDismiss = async (id: number) => {
    setActionError(null);
    try {
      await dismiss.mutateAsync(id);
    } catch {
      setActionError("Could not dismiss the recommendation. Please try again.");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-slate-900">Recommendations</h1>

      {actionError ? <ErrorAlert message={actionError} /> : null}

      {query.isPending ? (
        <div className="flex flex-col gap-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorAlert>
          <p>We could not load your recommendations.</p>
          <Button variant="secondary" size="sm" onClick={() => query.refetch()} className="mt-1">
            Retry
          </Button>
        </ErrorAlert>
      ) : recommendations.length === 0 ? (
        <EmptyState title="No recommendations" description="Keep practicing to earn personalized recommendations." />
      ) : (
        <ul className="flex flex-col gap-4">
          {recommendations.map((rec) => (
            <li key={rec.id} className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex flex-col gap-2">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-base font-semibold text-slate-900">{rec.title}</h2>
                  <span className="shrink-0 rounded px-2 py-0.5 text-xs font-semibold text-slate-600">{priorityLabel[rec.priority]}</span>
                </div>
                <p className="text-sm text-slate-600">{rec.reason}</p>
                <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                  <span>{typeLabel[rec.recommendation_type]}</span>
                  <span>·</span>
                  <span>{rec.topic.title}</span>
                </div>
                <div className="mt-2 flex gap-2">
                  <Button size="sm" onClick={() => handleComplete(rec.id)} loading={complete.isPending}>
                    Mark complete
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDismiss(rec.id)} loading={dismiss.isPending}>
                    Dismiss
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Button variant="secondary" onClick={() => router.push(ROUTES.student.progress)}>
        Back to progress
      </Button>
    </div>
  );
}