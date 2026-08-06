import { Suspense } from "react";

import type { Metadata } from "next";

import { AttemptPage } from "@/features/quizzes/components/attempt-page";

export const metadata: Metadata = {
  title: "Attempt | AralAI",
};

export default async function AttemptRoute({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  const id = Number(attemptId);

  // Non-numeric ids cannot exist; rendering with 0 produces the 404 state.
  return (
    <Suspense fallback={null}>
      <AttemptPage attemptId={Number.isInteger(id) && id > 0 ? id : 0} />
    </Suspense>
  );
}