import type { Metadata } from "next";

import { RecommendationsPage } from "@/features/progress/components/recommendations";

export const metadata: Metadata = {
  title: "Recommendations | AralAI",
};

export default function RecommendationsRoute() {
  return <RecommendationsPage />;
}