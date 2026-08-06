import type { Metadata } from "next";

import { ProgressSummary } from "@/features/progress/components/progress-summary";

export const metadata: Metadata = {
  title: "Progress | AralAI",
};

export default function ProgressRoute() {
  return <ProgressSummary />;
}