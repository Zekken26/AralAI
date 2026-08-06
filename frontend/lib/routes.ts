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
    lessons: "/teacher/lessons",
    quizzes: "/teacher/quizzes",
    analytics: "/teacher/analytics",
  },
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES] | (typeof ROUTES.student)[keyof typeof ROUTES.student] | (typeof ROUTES.teacher)[keyof typeof ROUTES.teacher];
