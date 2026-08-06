import type { Metadata } from "next";

import { AttemptPage } from "@/features/quizzes/components/attempt-page";

export const metadata: Metadata = {
  title: "Attempt | AralAI",
};

export default function AttemptRoute({ params }: { params: { attemptId: string } }) {
  return <AttemptPage attemptId={Number(params.attemptId)} />;
}