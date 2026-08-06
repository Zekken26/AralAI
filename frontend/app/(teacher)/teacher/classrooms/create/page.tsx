import type { Metadata } from "next";

import { TeacherClassroomCreatePage } from "@/features/classrooms/components/teacher-classroom-create-page";

export const metadata: Metadata = {
  title: "New classroom | AralAI",
};

export default function ClassroomCreateRoute() {
  return <TeacherClassroomCreatePage />;
}