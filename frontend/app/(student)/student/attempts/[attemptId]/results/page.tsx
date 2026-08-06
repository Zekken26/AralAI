import type { Metadata } from "next";

import { ResultsPage } from "@/features/quizzes/components/results-page";

export const metadata: Metadata = {
  title: "Results | AralAI",
};

export default function ResultsRoute({ params }: { params: { attemptId: string } }) {
  return <ResultsPage attemptId={Number(params.attemptId)} />;
}