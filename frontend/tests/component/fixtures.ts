import type { Classroom, ClassroomList } from "@/types/classrooms";
import type { Lesson, LessonList, Topic } from "@/types/lessons";

export const classroomFixture: Classroom = {
  id: 1,
  name: "Grade 8 - Section A",
  section: "Section A",
  school_year: "2026-2027",
  join_code: null,
  is_active: true,
  created_at: "2026-08-01T09:00:00Z",
  updated_at: "2026-08-01T09:00:00Z",
};

export const closedClassroomFixture: Classroom = {
  ...classroomFixture,
  id: 2,
  name: "Old Algebra Club",
  section: "After-school club",
  school_year: "2025-2026",
  is_active: false,
};

export const classroomListFixture: ClassroomList = {
  count: 2,
  next: null,
  previous: null,
  results: [classroomFixture, closedClassroomFixture],
};

export const lessonFixture: Lesson = {
  id: 10,
  topic: 3,
  classroom: 1,
  author: { id: 5, first_name: "Maria", last_name: "Santos" },
  title: "Solving Linear Equations",
  summary: "An introduction to one-variable equations.",
  learning_objectives: ["Solve linear equations in one variable.", "Check solutions."],
  content: "A linear equation is one where the highest exponent of the variable is 1.\n\nExample: 2x + 3 = 7.",
  status: "PUBLISHED",
  version: 2,
  published_at: "2026-08-03T10:00:00Z",
  created_at: "2026-08-01T09:00:00Z",
  updated_at: "2026-08-03T10:00:00Z",
};

export const secondLessonFixture: Lesson = {
  ...lessonFixture,
  id: 11,
  topic: 4,
  title: "Laws of Exponents",
  summary: "Simplify expressions using exponent rules.",
};

export const lessonListFixture: LessonList = {
  count: 2,
  next: null,
  previous: null,
  results: [lessonFixture, secondLessonFixture],
};

export const topicFixture: Topic = {
  id: 3,
  subject: { id: 1, name: "Mathematics", code: "MATH8", is_active: true },
  grade_level: 8,
  code: "M8AL-Ia-1",
  title: "Linear Equations",
  description: "Solving and graphing linear equations in one variable.",
  sequence_order: 1,
};

export const secondTopicFixture: Topic = {
  ...topicFixture,
  id: 4,
  code: "M8AL-Ic-2",
  title: "Laws of Exponents",
  sequence_order: 4,
};