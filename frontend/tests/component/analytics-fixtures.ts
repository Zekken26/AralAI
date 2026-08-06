import type { ClassroomList } from "@/types/classrooms";
import type {
  ClassroomProgress,
  ClassroomTopicProgress,
  StudentsNeedingSupport,
  TeacherStudentProgress,
} from "@/features/analytics/types";
import type { ClassroomQuizResultList } from "@/features/quizzes/schemas/teacher";

export const analyticsClassroomListFixture: ClassroomList = {
  count: 1,
  next: null,
  previous: null,
  results: [
    {
      id: 1,
      name: "Grade 8 - Section A",
      section: "Section A",
      school_year: "2026-2027",
      join_code: "CODE1234",
      is_active: true,
      created_at: "2026-08-01T09:00:00Z",
      updated_at: "2026-08-01T09:00:00Z",
    },
  ],
};

export const classroomProgressFixture: ClassroomProgress = {
  classroom_id: 1,
  class_average_mastery: 31.0,
  attempted_topics: 1,
  weakest_topics: [
    { topic: { id: 1, title: "Linear Equations", code: "M8AL-Ia-1" }, average_mastery: 31.0 },
  ],
  strongest_topics: [
    { topic: { id: 2, title: "Laws of Exponents", code: "M8AL-Ic-2" }, average_mastery: 92.0 },
  ],
  topic_distribution: [
    {
      topic: { id: 1, title: "Linear Equations", code: "M8AL-Ia-1" },
      needs_support: 1,
      developing: 1,
      proficient: 0,
      mastered: 0,
      attempted_students: 2,
      submitted_attempts: 2,
      average_mastery: 31.0,
    },
    {
      topic: { id: 2, title: "Laws of Exponents", code: "M8AL-Ic-2" },
      needs_support: 0,
      developing: 0,
      proficient: 0,
      mastered: 2,
      attempted_students: 2,
      submitted_attempts: 2,
      average_mastery: 92.0,
    },
  ],
};

export const emptyProgressFixture: ClassroomProgress = {
  classroom_id: 1,
  class_average_mastery: null,
  attempted_topics: 0,
  weakest_topics: [],
  strongest_topics: [],
  topic_distribution: [],
};

export const supportFixture: StudentsNeedingSupport = {
  count: 1,
  students: [
    {
      student: { id: 7, first_name: "Ana", last_name: "Reyes" },
      topics: [
        {
          topic: { id: 1, title: "Linear Equations", code: "M8AL-Ia-1" },
          mastery_score: 12.5,
          status: "NEEDS_SUPPORT",
        },
      ],
    },
  ],
};

export const emptySupportFixture: StudentsNeedingSupport = { count: 0, students: [] };

export const topicProgressFixture: ClassroomTopicProgress = {
  topic: { id: 1, title: "Linear Equations", code: "M8AL-Ia-1" },
  average_mastery: 31.0,
  attempted_students: 2,
  distribution: { needs_support: 1, developing: 1, proficient: 0, mastered: 0 },
  students: [
    {
      student: { id: 7, first_name: "Ana", last_name: "Reyes" },
      mastery_score: 12.5,
      status: "NEEDS_SUPPORT",
    },
    {
      student: { id: 8, first_name: "Luis", last_name: "Tan" },
      mastery_score: 67.5,
      status: "DEVELOPING",
    },
  ],
};

export const studentProgressFixture: TeacherStudentProgress = {
  student: { id: 7, first_name: "Ana", last_name: "Reyes" },
  topics_attempted: 2,
  topics_mastered: 1,
  topics_needing_support: 1,
  overall_mastery_average: 56.25,
  topics: [
    { topic: { id: 2, title: "Laws of Exponents", code: "M8AL-Ic-2" }, mastery_score: 100.0, status: "MASTERED" },
    { topic: { id: 1, title: "Linear Equations", code: "M8AL-Ia-1" }, mastery_score: 12.5, status: "NEEDS_SUPPORT" },
  ],
};

export const emptyStudentProgressFixture: TeacherStudentProgress = {
  student: { id: 7, first_name: "Ana", last_name: "Reyes" },
  topics_attempted: 0,
  topics_mastered: 0,
  topics_needing_support: 0,
  overall_mastery_average: null,
  topics: [],
};

export const quizResultsFixture: ClassroomQuizResultList = {
  count: 1,
  next: null,
  previous: null,
  results: [
    {
      quiz: 5,
      title: "Sum Quiz 2",
      status: "PUBLISHED",
      total_attempts: 2,
      submitted_attempts: 2,
      passed_attempts: 1,
      average_score: "88.89",
    },
  ],
};

export const rosterFixture = {
  count: 2,
  next: null,
  previous: null,
  results: [
    {
      id: 11,
      student: { id: 7, first_name: "Ana", last_name: "Reyes" },
      status: "ACTIVE",
      joined_at: "2026-08-01T09:00:00Z",
    },
    {
      id: 12,
      student: { id: 8, first_name: "Luis", last_name: "Tan" },
      status: "ACTIVE",
      joined_at: "2026-08-01T09:00:00Z",
    },
  ],
};
