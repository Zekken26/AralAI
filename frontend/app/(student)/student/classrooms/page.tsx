import type { Metadata } from "next";

import { ClassroomListPage } from "@/features/classrooms/components/classroom-list-page";

export const metadata: Metadata = {
  title: "My classrooms | AralAI",
};

export default function ClassroomsRoute() {
  return <ClassroomListPage />;
}