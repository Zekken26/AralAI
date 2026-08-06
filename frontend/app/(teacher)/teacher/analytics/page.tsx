import type { Metadata } from "next";

import { AnalyticsLandingPage } from "@/features/analytics/components/analytics-landing-page";

export const metadata: Metadata = {
  title: "Analytics — AralAI",
};

export default function AnalyticsPage() {
  return <AnalyticsLandingPage />;
}