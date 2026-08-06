export const ROUTES = {
  home: "/",
  login: "/login",
  register: "/register",
  unauthorized: "/unauthorized",
  studentDashboard: "/student/dashboard",
  teacherDashboard: "/teacher/dashboard",
  student: {
    dashboard: "/student/dashboard",
    classrooms: "/student/classrooms",
    lessons: "/student/lessons",
    quizzes: "/student/quizzes",
    quizDetail: (quizId: number | string) => `/student/quizzes/${quizId}`,
    attempts: "/student/attempts",
    attemptDetail: (attemptId: number | string) => `/student/attempts/${attemptId}`,
    attemptResults: (attemptId: number | string) => `/student/attempts/${attemptId}/results`,
    progress: "/student/progress",
    recommendations: "/student/recommendations",
    classroomDetail: (classroomId: number | string) => `/student/classrooms/${classroomId}`,
    lessonDetail: (lessonId: number | string) => `/student/lessons/${lessonId}`,
  },
  teacher: {
    dashboard: "/teacher/dashboard",
    classrooms: "/teacher/classrooms",
    classroomCreate: "/teacher/classrooms/create",
    classroomDetail: (classroomId: number | string) => `/teacher/classrooms/${classroomId}`,
    classroomStudents: (classroomId: number | string) =>
      `/teacher/classrooms/${classroomId}/students`,
    lessons: "/teacher/lessons",
    lessonCreate: "/teacher/lessons/create",
    lessonDetail: (lessonId: number | string) => `/teacher/lessons/${lessonId}`,
    lessonEdit: (lessonId: number | string) => `/teacher/lessons/${lessonId}/edit`,
    quizzes: "/teacher/quizzes",
    quizCreate: "/teacher/quizzes/create",
    quizDetail: (quizId: number | string) => `/teacher/quizzes/${quizId}`,
    quizEdit: (quizId: number | string) => `/teacher/quizzes/${quizId}/edit`,
    quizQuestions: (quizId: number | string) => `/teacher/quizzes/${quizId}/questions`,
    quizResults: (quizId: number | string) => `/teacher/quizzes/${quizId}/results`,
    analytics: "/teacher/analytics",
    classroomAnalytics: (classroomId: number | string) =>
      `/teacher/classrooms/${classroomId}/analytics`,
    topicAnalytics: (classroomId: number | string, topicId: number | string) =>
      `/teacher/classrooms/${classroomId}/analytics/topics/${topicId}`,
    studentAnalytics: (classroomId: number | string, studentId: number | string) =>
      `/teacher/classrooms/${classroomId}/analytics/students/${studentId}`,
  },
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES] | (typeof ROUTES.student)[keyof typeof ROUTES.student] | (typeof ROUTES.teacher)[keyof typeof ROUTES.teacher];
