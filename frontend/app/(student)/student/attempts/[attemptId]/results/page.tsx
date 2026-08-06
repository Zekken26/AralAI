import { Suspense } from "react";

import type { Metadata } from "next";

import { ResultsPage } from "@/features/quizzes/components/results-page";

export const metadata: Metadata = {
  title: "Results | AralAI",
};

export default async function ResultsRoute({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  const id = Number(attemptId);

  // Non-numeric ids cannot exist; rendering with 0 produces the 404 state.
  return (
    <Suspense fallback={null}>
      <ResultsPage attemptId={Number.isInteger(id) && id > 0 ? id : 0} />
    </Suspense>
  );
}