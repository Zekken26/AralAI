import { expect, test, type APIRequestContext, type APIResponse, type Page } from "@playwright/test";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";
const PASSWORD = "secure-pass-123";
const unique = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}@aralai.test`;

async function throttledPost(
  request: APIRequestContext,
  url: string,
  options: Parameters<APIRequestContext["post"]>[1],
  triesLeft = 3,
): Promise<APIResponse> {
  const response = await request.post(url, options);
  if (response.status() !== 429 || triesLeft <= 0) {
    return response;
  }
  const body = await response.text();
  const seconds = Number(body.match(/available in (\d+)/)?.[1] ?? 1);
  await new Promise((resolve) => setTimeout(resolve, (seconds + 1) * 1000));
  return throttledPost(request, url, options, triesLeft - 1);
}

type TokenPair = { email: string; access: string; refresh: string };

async function registerAndLogin(
  request: APIRequestContext,
  role: "STUDENT" | "TEACHER",
): Promise<TokenPair> {
  const email = unique(role.toLowerCase());
  const register = await throttledPost(request, `${API_BASE}/auth/register/`, {
    data: { email, password: PASSWORD, role },
  });
  expect(register.ok()).toBeTruthy();
  const login = await throttledPost(request, `${API_BASE}/auth/login/`, {
    data: { email, password: PASSWORD },
  });
  expect(login.ok()).toBeTruthy();
  const tokens = await login.json();
  return { email, access: tokens.access, refresh: tokens.refresh };
}

async function seedSession(page: Page, refresh: string): Promise<void> {
  await page.addInitScript((value) => {
    window.sessionStorage.setItem("aralai.refresh", value as string);
  }, refresh);
}

async function mathTopicId(request: APIRequestContext, token: string): Promise<number> {
  const subjectsResponse = await request.get(`${API_BASE}/subjects/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(subjectsResponse.ok()).toBeTruthy();
  const subjects = (await subjectsResponse.json()).results ?? [];
  const math = subjects.find((subject: { code: string }) => subject.code === "MATH8") ?? subjects[0];
  expect(math, "expected a seeded curriculum subject").toBeTruthy();
  const topicsResponse = await request.get(`${API_BASE}/subjects/${math.id}/topics/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(topicsResponse.ok()).toBeTruthy();
  const topics = (await topicsResponse.json()).results ?? [];
  expect(topics.length, "expected seeded topics for the subject").toBeGreaterThan(0);
  return topics[0].id;
}

async function createClassroom(
  request: APIRequestContext,
  token: string,
  name: string,
): Promise<{ id: number; joinCode: string }> {
  const response = await request.post(`${API_BASE}/classrooms/`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { name, section: "E2E Section", school_year: "2026-2027" },
  });
  expect(response.ok()).toBeTruthy();
  const classroom = await response.json();
  expect(classroom.join_code).toMatch(/^[A-Z0-9]{8}$/);
  return { id: classroom.id, joinCode: classroom.join_code };
}

async function createPublishedLesson(
  request: APIRequestContext,
  token: string,
  classroomId: number,
  topicId: number,
  title: string,
): Promise<number> {
  const created = await request.post(`${API_BASE}/lessons/`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      topic: topicId,
      classroom: classroomId,
      title,
      summary: "E2E summary for the lesson.",
      learning_objectives: ["Solve the e2e problem.", "Verify the solution."],
      content: "Step one of the lesson.\n\nExample: x + 1 = 2.",
    },
  });
  expect(created.ok()).toBeTruthy();
  const lesson = await created.json();
  const published = await request.post(`${API_BASE}/lessons/${lesson.id}/publish/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(published.ok()).toBeTruthy();
  return lesson.id;
}

async function joinClassroom(
  request: APIRequestContext,
  token: string,
  joinCode: string,
): Promise<number> {
  const joined = await request.post(`${API_BASE}/classrooms/join/`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { join_code: joinCode },
  });
  expect(joined.ok()).toBeTruthy();
  const enrollment = await joined.json();
  return enrollment.classroom;
}

async function createQuestion(
  request: APIRequestContext,
  token: string,
  lessonId: number,
  topicId: number,
): Promise<number> {
  const response = await request.post(`${API_BASE}/lessons/${lessonId}/questions/`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      topic: topicId,
      question_type: "MULTIPLE_CHOICE",
      prompt: "What is 2 + 2?",
      difficulty: 2,
      points: "1.00",
      choices: [{ text: "3", sequence_order: 1 }, { text: "4", sequence_order: 2 }],
      correct_choice: 2,
    },
  });
  expect(response.ok()).toBeTruthy();
  const question = await response.json();
  return question.id;
}

async function approveQuestion(
  request: APIRequestContext,
  token: string,
  lessonId: number,
  questionId: number,
): Promise<void> {
  const response = await request.post(
    `${API_BASE}/lessons/${lessonId}/questions/${questionId}/approve/`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  expect(response.ok()).toBeTruthy();
}

async function createQuiz(
  request: APIRequestContext,
  token: string,
  lessonId: number,
  classroomId: number,
  title: string,
): Promise<number> {
  const response = await request.post(`${API_BASE}/quizzes/`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      lesson: lessonId,
      classroom: classroomId,
      title,
      instructions: "Answer all questions.",
      attempt_limit: 3,
      time_limit_minutes: 30,
      passing_score: 70,
    },
  });
  expect(response.ok()).toBeTruthy();
  const quiz = await response.json();
  return quiz.id;
}

async function publishQuiz(
  request: APIRequestContext,
  token: string,
  quizId: number,
): Promise<void> {
  const response = await request.post(`${API_BASE}/quizzes/${quizId}/publish/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(response.ok()).toBeTruthy();
}

test.describe("student assessment flow", () => {
  test("student can see published quizzes from their classroom", async ({ page, request }) => {
    const teacher = await registerAndLogin(request, "TEACHER");
    const classroom = await createClassroom(request, teacher.access, "E2E Assessment Class");
    const topicId = await mathTopicId(request, teacher.access);
    const lessonId = await createPublishedLesson(
      request,
      teacher.access,
      classroom.id,
      topicId,
      "E2E Linear Equations",
    );
    const questionId = await createQuestion(request, teacher.access, lessonId, topicId);
    await approveQuestion(request, teacher.access, lessonId, questionId);
    const quizId = await createQuiz(request, teacher.access, lessonId, classroom.id, "E2E Quiz");
    await publishQuiz(request, teacher.access, quizId);

    const student = await registerAndLogin(request, "STUDENT");
    await joinClassroom(request, student.access, classroom.joinCode);
    await seedSession(page, student.refresh);

    await page.goto("/student/quizzes");
    await expect(page.getByRole("heading", { name: "Quizzes" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "E2E Quiz" })).toBeVisible();
  });

  test("student can start an attempt, answer questions, and see results", async ({ page, request }) => {
    const teacher = await registerAndLogin(request, "TEACHER");
    const classroom = await createClassroom(request, teacher.access, "E2E Assessment Class B");
    const topicId = await mathTopicId(request, teacher.access);
    const lessonId = await createPublishedLesson(
      request,
      teacher.access,
      classroom.id,
      topicId,
      "E2E Algebra",
    );
    const questionId = await createQuestion(request, teacher.access, lessonId, topicId);
    await approveQuestion(request, teacher.access, lessonId, questionId);
    const quizId = await createQuiz(request, teacher.access, lessonId, classroom.id, "E2E Algebra Quiz");
    await publishQuiz(request, teacher.access, quizId);

    const student = await registerAndLogin(request, "STUDENT");
    await joinClassroom(request, student.access, classroom.joinCode);
    await seedSession(page, student.refresh);

    await page.goto("/student/quizzes");
    await page.getByRole("link", { name: /E2E Algebra Quiz/i }).first().click();
    await expect(page.getByRole("heading", { name: "E2E Algebra Quiz" })).toBeVisible();

    await page.getByRole("button", { name: /start attempt/i }).click();
    await expect(page.getByRole("heading", { name: /attempt #1/i })).toBeVisible();

    await page.getByRole("radio", { name: /4/ }).check();
    await page.getByRole("button", { name: /submit attempt/i }).click();

    await expect(page.getByRole("heading", { name: /passed/i })).toBeVisible();
  });

  test("anonymous visitors are redirected to login from quiz pages", async ({ page }) => {
    await page.goto("/student/quizzes");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("a teacher is blocked from the student quizzes page", async ({ page, request }) => {
    const teacher = await registerAndLogin(request, "TEACHER");
    await seedSession(page, teacher.refresh);
    await page.goto("/student/quizzes");
    await expect(page).toHaveURL(/\/unauthorized$/);
  });
});