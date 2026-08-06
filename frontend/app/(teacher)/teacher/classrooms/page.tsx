import type { Metadata } from "next";

import { TeacherClassroomListPage } from "@/features/classrooms/components/teacher-classroom-list-page";

export const metadata: Metadata = {
  title: "Classrooms | AralAI",
};

export default function ClassroomsRoute() {
  return <TeacherClassroomListPage />;
}