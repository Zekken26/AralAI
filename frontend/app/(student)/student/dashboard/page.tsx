import type { Metadata } from "next";

import { StudentDashboard } from "@/components/dashboard/student-dashboard";

export const metadata: Metadata = {
  title: "Student dashboard — AralAI",
};

export default function DashboardPage() {
  return <StudentDashboard />;
}