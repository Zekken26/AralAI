import { expect, test, type APIRequestContext, type APIResponse, type Page } from "@playwright/test";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";
const PASSWORD = "secure-pass-123";
const unique = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}@aralai.test`;

/**
 * Retry transient 429 (throttled) responses using the backend-provided wait
 * time. The backend throttles auth endpoints at 10/min; the retry helper
 * makes the suite resilient without artificial delays.
 */
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

/**
 * Seed an app session without a UI sign-in by placing the refresh token in
 * sessionStorage. The API client's refresh interceptor picks it up on the
 * first authenticated request and establishes the session.
 */
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

test.describe("student learning flow", () => {
  test("student sees their classrooms and recent lessons on the dashboard", async ({ page, request }) => {
    const teacher = await registerAndLogin(request, "TEACHER");
    const classroom = await createClassroom(request, teacher.access, "E2E Math Class A");
    const topicId = await mathTopicId(request, teacher.access);
    await createPublishedLesson(request, teacher.access, classroom.id, topicId, "Linear Equations 101");

    const student = await registerAndLogin(request, "STUDENT");
    await joinClassroom(request, student.access, classroom.joinCode);

    await seedSession(page, student.refresh);
    await page.goto("/student/dashboard");
    await expect(page.getByRole("heading", { name: "E2E Math Class A" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Linear Equations 101" })).toBeVisible();
  });

  test("joining with a valid code (lowercased and padded) opens the classroom", async ({ page, request }) => {
    const teacher = await registerAndLogin(request, "TEACHER");
    const classroom = await createClassroom(request, teacher.access, "E2E Math Class B");

    const student = await registerAndLogin(request, "STUDENT");
    await seedSession(page, student.refresh);
    await page.goto("/student/dashboard");

    await page.getByRole("button", { name: /join a classroom/i }).first().click();
    await page.getByLabel(/classroom code/i).fill(`  ${classroom.joinCode.toLowerCase()}  `);
    await page.getByRole("button", { name: /join classroom/i }).click();

    await expect(page).toHaveURL(new RegExp(`/student/classrooms/${classroom.id}$`));
    await expect(page.getByRole("heading", { name: "E2E Math Class B" })).toBeVisible();
    await expect(page.getByText(/no published lessons yet/i)).toBeVisible();
  });

  test("an invalid classroom code shows a friendly error", async ({ page, request }) => {
    const student = await registerAndLogin(request, "STUDENT");
    await seedSession(page, student.refresh);
    await page.goto("/student/dashboard");

    await page.getByRole("button", { name: /join a classroom/i }).first().click();
    await page.getByLabel(/classroom code/i).fill("ZZZZ9999");
    await page.getByRole("button", { name: /join classroom/i }).click();

    await expect(page.getByText(/the classroom code is invalid/i)).toBeVisible();
  });

  test("opening a classroom shows its published lessons", async ({ page, request }) => {
    const teacher = await registerAndLogin(request, "TEACHER");
    const classroom = await createClassroom(request, teacher.access, "E2E Math Class C");
    const topicId = await mathTopicId(request, teacher.access);
    await createPublishedLesson(request, teacher.access, classroom.id, topicId, "Exponent Basics");

    const student = await registerAndLogin(request, "STUDENT");
    await joinClassroom(request, student.access, classroom.joinCode);
    await seedSession(page, student.refresh);

    await page.goto(`/student/classrooms/${classroom.id}`);
    await expect(page.getByRole("heading", { name: "E2E Math Class C" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Exponent Basics" })).toBeVisible();
    await expect(page.getByRole("button", { name: /all lessons/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("opening a lesson shows its objectives and content", async ({ page, request }) => {
    const teacher = await registerAndLogin(request, "TEACHER");
    const classroom = await createClassroom(request, teacher.access, "E2E Math Class D");
    const topicId = await mathTopicId(request, teacher.access);
    const lessonId = await createPublishedLesson(
      request,
      teacher.access,
      classroom.id,
      topicId,
      "Graphing Basics",
    );

    const student = await registerAndLogin(request, "STUDENT");
    await joinClassroom(request, student.access, classroom.joinCode);
    await seedSession(page, student.refresh);

    await page.goto(`/student/lessons/${lessonId}`);
    await expect(page.getByRole("heading", { name: "Graphing Basics" })).toBeVisible();
    await expect(page.getByRole("heading", { name: /learning objectives/i })).toBeVisible();
    await expect(page.getByText("Solve the e2e problem.")).toBeVisible();
    await expect(page.getByText(/step one of the lesson/i)).toBeVisible();
    await expect(page.getByText(/example: x \+ 1 = 2/i)).toBeVisible();
  });
});

test.describe("student learning guardrails", () => {
  test("anonymous visitors are sent to login from classroom and lesson pages", async ({ page }) => {
    await page.goto("/student/classrooms");
    await expect(page).toHaveURL(/\/login$/);
    await page.goto("/student/lessons/1");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("a teacher is blocked from the classrooms page", async ({ page, request }) => {
    const teacher = await registerAndLogin(request, "TEACHER");
    await seedSession(page, teacher.refresh);
    await page.goto("/student/classrooms");
    await expect(page).toHaveURL(/\/unauthorized$/);
  });

  test("a teacher is blocked from the lesson detail page", async ({ page, request }) => {
    const teacher = await registerAndLogin(request, "TEACHER");
    await seedSession(page, teacher.refresh);
    await page.goto("/student/lessons/1");
    await expect(page).toHaveURL(/\/unauthorized$/);
  });
});