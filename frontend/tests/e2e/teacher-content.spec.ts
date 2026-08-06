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
  // The backend rotates refresh tokens, so the app's first refresh blacklists
  // the seeded token. A plain addInitScript would re-apply that stale token
  // on every full navigation, killing the session. Instead, apply a seed
  // exactly once per explicit seedSession call and otherwise leave the
  // app's rotated token untouched.
  await page.addInitScript((value) => {
    const pending = window.sessionStorage.getItem("aralai.pending-refresh");
    if (pending != null) {
      window.sessionStorage.setItem("aralai.refresh", pending);
      window.sessionStorage.removeItem("aralai.pending-refresh");
    } else if (window.sessionStorage.getItem("aralai.refresh") == null) {
      window.sessionStorage.setItem("aralai.refresh", value as string);
    }
  }, refresh);
  try {
    await page.evaluate((value) => {
      window.sessionStorage.setItem("aralai.pending-refresh", value);
    }, refresh);
  } catch {
    // Not navigated yet (about:blank): the init script's fallback seeds the
    // token on the first page load.
  }
}

async function mathSubject(
  request: APIRequestContext,
  token: string,
): Promise<{ id: number; name: string }> {
  const response = await request.get(`${API_BASE}/subjects/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(response.ok()).toBeTruthy();
  const subjects = (await response.json()).results ?? [];
  const math = subjects.find((subject: { code: string }) => subject.code === "MATH8") ?? subjects[0];
  expect(math, "expected a seeded curriculum subject").toBeTruthy();
  return { id: math.id, name: math.name };
}

async function firstTopic(
  request: APIRequestContext,
  token: string,
  subjectId: number,
): Promise<{ id: number; title: string }> {
  const response = await request.get(`${API_BASE}/subjects/${subjectId}/topics/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(response.ok()).toBeTruthy();
  const topics = (await response.json()).results ?? [];
  expect(topics.length, "expected seeded topics for the subject").toBeGreaterThan(0);
  return { id: topics[0].id, title: topics[0].title };
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

async function seedQuestionWithChoices(
  request: APIRequestContext,
  token: string,
  quizId: number,
  topicId: number,
): Promise<number> {
  const created = await request.post(`${API_BASE}/quizzes/${quizId}/questions/`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      topic: topicId,
      question_type: "MULTIPLE_CHOICE",
      prompt: "What is 2 + 2?",
      explanation: "2 + 2 equals 4.",
      difficulty: 2,
      points: 1,
      sequence_order: 1,
    },
  });
  expect(created.ok()).toBeTruthy();
  const question = await created.json();

  const wrong = await request.post(`${API_BASE}/questions/${question.id}/choices/`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { text: "3", is_correct: false, sequence_order: 1 },
  });
  expect(wrong.ok()).toBeTruthy();
  const correct = await request.post(`${API_BASE}/questions/${question.id}/choices/`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { text: "4", is_correct: true, sequence_order: 2 },
  });
  expect(correct.ok()).toBeTruthy();

  const approved = await request.post(`${API_BASE}/questions/${question.id}/approve/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(approved.ok()).toBeTruthy();
  return question.id;
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

async function joinClassroom(
  request: APIRequestContext,
  token: string,
  joinCode: string,
): Promise<void> {
  const joined = await request.post(`${API_BASE}/classrooms/join/`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { join_code: joinCode },
  });
  expect(joined.ok()).toBeTruthy();
}

test.describe("teacher content management", () => {
  test("teacher creates a classroom and sees the join code", async ({ page, request }) => {
    const teacher = await registerAndLogin(request, "TEACHER");
    await seedSession(page, teacher.refresh);

    await page.goto("/teacher/classrooms/create");
    await page.getByLabel("Classroom name").fill("E2E Teacher Class");
    await page.getByLabel("Section").fill("Alpha");
    await page.getByLabel("School year").fill("2026-2027");
    await page.getByRole("button", { name: "Create classroom" }).click();

    await expect(page).toHaveURL(/\/teacher\/classrooms\/\d+$/);
    await expect(page.getByRole("heading", { name: "E2E Teacher Class" })).toBeVisible();
    await expect(page.getByText("Join code", { exact: true })).toBeVisible();
    await expect(page.locator("p.font-mono")).toHaveText(/^[A-Z0-9]{8}$/);
  });

  test("teacher can create a lesson, publish it, and archive it", async ({ page, request }) => {
    const teacher = await registerAndLogin(request, "TEACHER");
    await createClassroom(request, teacher.access, "E2E Lesson Class");
    const subject = await mathSubject(request, teacher.access);
    const topic = await firstTopic(request, teacher.access, subject.id);
    await seedSession(page, teacher.refresh);

    await page.goto("/teacher/lessons/create");
    await page.getByLabel("Classroom").selectOption({ label: "E2E Lesson Class" });
    await page.getByLabel("Subject").selectOption({ label: subject.name });

    await expect(
      page.getByLabel("Topic").locator(`option[value="${topic.id}"]`),
    ).toHaveCount(1);
    await page.getByLabel("Topic").selectOption(String(topic.id));

    await page.getByLabel("Title").fill("E2E Linear Equations Lesson");
    await page.getByLabel("Summary").fill("Teacher-created E2E lesson.");
    await page.getByLabel("Objective 1", { exact: true }).fill("Solve the e2e problem.");
    await page.getByLabel("Content").fill("Step one.\n\nSolve x + 1 = 2.");
    await page.getByRole("button", { name: "Create lesson" }).click();

    await expect(page).toHaveURL(/\/teacher\/lessons\/\d+$/);
    await expect(page.getByRole("heading", { name: "E2E Linear Equations Lesson" })).toBeVisible();
    await expect(page.getByText("draft", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Publish" }).click();
    await expect(page.getByText("published", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Archive" }).click();
    await expect(page.getByText("archived", { exact: true })).toBeVisible();
  });

  test("teacher can build a quiz, add and approve a question, and publish it", async ({
    page,
    request,
  }) => {
    const teacher = await registerAndLogin(request, "TEACHER");
    const classroom = await createClassroom(request, teacher.access, "E2E Quiz Class");
    const subject = await mathSubject(request, teacher.access);
    const topic = await firstTopic(request, teacher.access, subject.id);
    const lessonId = await createPublishedLesson(
      request,
      teacher.access,
      classroom.id,
      topic.id,
      "E2E Quiz Lesson",
    );
    await seedSession(page, teacher.refresh);

    await page.goto("/teacher/quizzes/create");
    await page.getByLabel("Classroom").selectOption({ label: "E2E Quiz Class" });
    await expect(page.getByLabel("Lesson").locator(`option[value="${lessonId}"]`)).toHaveCount(1);
    await page.getByLabel("Lesson").selectOption(String(lessonId));
    await page.getByLabel("Title").fill("E2E Teacher Quiz");
    await page.getByLabel("Instructions").fill("Answer all questions carefully.");
    await page.getByRole("button", { name: "Create quiz" }).click();

    await expect(page).toHaveURL(/\/teacher\/quizzes\/\d+\/questions$/);
    await expect(page.getByRole("heading", { name: "E2E Teacher Quiz" })).toBeVisible();

    await page.getByRole("button", { name: "Add question" }).click();
    const dialog = page.locator("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByLabel("Subject").selectOption({ label: subject.name });
    await expect(dialog.getByLabel("Topic").locator(`option[value="${topic.id}"]`)).toHaveCount(1);
    await dialog.getByLabel("Topic").selectOption(String(topic.id));
    await dialog.getByLabel("Prompt").fill("What is 2 + 2?");
    await dialog.getByLabel("Choice 1", { exact: true }).fill("3");
    await dialog.getByLabel("Choice 2", { exact: true }).fill("4");
    await dialog.getByRole("radio", { name: /correct/i }).nth(1).check();
    await dialog.getByRole("button", { name: "Add question" }).click();

    await expect(page.locator("dialog")).toBeHidden();
    await expect(page.getByText("What is 2 + 2?")).toBeVisible();

    await page.getByRole("button", { name: "Approve" }).click();
    await expect(page.getByText("Approved", { exact: true })).toBeVisible();

    await page.getByRole("link", { name: /back to quiz/i }).click();
    await expect(page.getByText("draft", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Publish" }).click();
    await expect(page.getByText("published", { exact: true })).toBeVisible();

    await page.goto("/teacher/quizzes");
    await expect(page.getByText("E2E Teacher Quiz")).toBeVisible();
  });

  test("teacher sees student attempts and classroom results after a quiz", async ({
    page,
    request,
  }) => {
    const teacher = await registerAndLogin(request, "TEACHER");
    const classroom = await createClassroom(request, teacher.access, "E2E Results Class");
    const topic = await firstTopic(
      request,
      teacher.access,
      (await mathSubject(request, teacher.access)).id,
    );
    const lessonId = await createPublishedLesson(
      request,
      teacher.access,
      classroom.id,
      topic.id,
      "E2E Results Lesson",
    );
    const quizId = await createQuiz(
      request,
      teacher.access,
      lessonId,
      classroom.id,
      "E2E Results Quiz",
    );
    await seedQuestionWithChoices(request, teacher.access, quizId, topic.id);
    await publishQuiz(request, teacher.access, quizId);

    const student = await registerAndLogin(request, "STUDENT");
    await joinClassroom(request, student.access, classroom.joinCode);
    await seedSession(page, student.refresh);

    await page.goto("/student/quizzes");
    await page.getByRole("link", { name: "View quiz" }).first().click();
    await page.getByRole("button", { name: /start attempt/i }).click();
    await page.getByRole("radio", { name: "4" }).click();
    await page.getByRole("button", { name: /submit attempt/i }).click();
    await expect(page.getByText("Passed", { exact: true })).toBeVisible();

    await seedSession(page, teacher.refresh);
    await page.goto(`/teacher/quizzes/${quizId}/results`);
    await expect(page.getByRole("heading", { name: `Results — E2E Results Quiz` })).toBeVisible();
    await expect(page.getByRole("row", { name: /Student #\d+/ })).toBeVisible();
    await expect(page.getByText(/submitted · passed/i)).toBeVisible();

    await page.goto(`/teacher/classrooms/${classroom.id}`);
    await expect(page.getByRole("heading", { name: "Quiz performance" })).toBeVisible();
    await expect(page.getByText("E2E Results Quiz")).toBeVisible();
  });
});