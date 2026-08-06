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

type TokenPair = { id: number; email: string; access: string; refresh: string };

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
  return { id: (await register.json()).id, email, access: tokens.access, refresh: tokens.refresh };
}

async function seedSession(page: Page, refresh: string): Promise<void> {
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

async function seedOneQuestionQuiz(
  request: APIRequestContext,
  token: string,
  lessonId: number,
  classroomId: number,
  topicId: number,
  title: string,
): Promise<{ quizId: number; questionId: number; correctChoiceId: number; wrongChoiceId: number }> {
  const quiz = await request.post(`${API_BASE}/quizzes/`, {
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
  expect(quiz.ok()).toBeTruthy();
  const quizId = (await quiz.json()).id;

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

  await request.post(`${API_BASE}/quizzes/${quizId}/publish/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return {
    quizId,
    questionId: question.id,
    correctChoiceId: (await correct.json()).id,
    wrongChoiceId: (await wrong.json()).id,
  };
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

async function submitQuiz(
  request: APIRequestContext,
  token: string,
  quizId: number,
  questionId: number,
  correctChoiceId: number,
): Promise<void> {
  const start = await request.post(`${API_BASE}/quizzes/${quizId}/attempts/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(start.ok()).toBeTruthy();
  const attempt = await start.json();
  const answered = await request.put(
    `${API_BASE}/attempts/${attempt.id}/answers/${questionId}/`,
    {
      headers: { Authorization: `Bearer ${token}` },
      data: { selected_choice: correctChoiceId },
    },
  );
  expect(answered.ok()).toBeTruthy();
  const submitted = await request.post(`${API_BASE}/attempts/${attempt.id}/submit/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(submitted.ok()).toBeTruthy();
}

async function enrolledStudentId(
  request: APIRequestContext,
  token: string,
  classroomId: number,
  which: "first" | "last" = "first",
): Promise<number> {
  const roster = await request.get(`${API_BASE}/classrooms/${classroomId}/students/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(roster.ok()).toBeTruthy();
  const students = (await roster.json()).results ?? [];
  expect(students.length, "expected at least one enrolled student").toBeGreaterThan(0);
  const picked = which === "last" ? students[students.length - 1] : students[0];
  return picked.student.id;
}

test.describe("teacher analytics", () => {
  test("analytics landing lists classrooms with an open-analytics action", async ({
    page,
    request,
  }) => {
    const teacher = await registerAndLogin(request, "TEACHER");
    const classroom = await createClassroom(request, teacher.access, "E2E Landing Class");
    await seedSession(page, teacher.refresh);

    await page.goto("/teacher/analytics");
    await expect(page.getByRole("heading", { name: "Analytics" })).toBeVisible();
    await expect(page.getByText("E2E Landing Class")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Open analytics" }).first(),
    ).toHaveAttribute("href", `/teacher/classrooms/${classroom.id}/analytics`);
  });

  test("nav analytics item navigates to the analytics landing page", async ({
    page,
    request,
  }) => {
    const teacher = await registerAndLogin(request, "TEACHER");
    await seedSession(page, teacher.refresh);

    await page.goto("/teacher/dashboard");
    await expect(page.getByRole("link", { name: "Analytics" })).toBeVisible();
    await page.getByRole("link", { name: "Analytics" }).click();
    await expect(page).toHaveURL(/\/teacher\/analytics$/);
    await expect(page.getByRole("heading", { name: "Analytics" })).toBeVisible();
  });

  test("classroom analytics shows the no-progress state for a quiet classroom", async ({
    page,
    request,
  }) => {
    const teacher = await registerAndLogin(request, "TEACHER");
    const classroom = await createClassroom(request, teacher.access, "E2E Quiet Class");
    await seedSession(page, teacher.refresh);

    await page.goto(`/teacher/classrooms/${classroom.id}/analytics`);
    await expect(
      page.getByText("No submitted assessments have produced progress data yet."),
    ).toBeVisible();
    await expect(page.getByText("E2E Quiet Class")).toBeVisible();
  });

  test("overview shows average mastery, weakest topics, and quiz results after submissions", async ({
    page,
    request,
  }) => {
    const teacher = await registerAndLogin(request, "TEACHER");
    const classroom = await createClassroom(request, teacher.access, "E2E Overview Class");
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
      "E2E Overview Lesson",
    );
    const { quizId, questionId, correctChoiceId, wrongChoiceId } = await seedOneQuestionQuiz(
      request,
      teacher.access,
      lessonId,
      classroom.id,
      topic.id,
      "E2E Overview Quiz",
    );

    const goodStudent = await registerAndLogin(request, "STUDENT");
    await joinClassroom(request, goodStudent.access, classroom.joinCode);
    await submitQuiz(request, goodStudent.access, quizId, questionId, correctChoiceId);
    const weakStudent = await registerAndLogin(request, "STUDENT");
    await joinClassroom(request, weakStudent.access, classroom.joinCode);
    await submitQuiz(request, weakStudent.access, quizId, questionId, wrongChoiceId);

    await seedSession(page, teacher.refresh);
    await page.goto(`/teacher/classrooms/${classroom.id}/analytics`);
    await expect(page.getByRole("heading", { name: /E2E Overview Class/ })).toBeVisible();
    await expect(page.getByText("Average mastery").first()).toBeVisible();
    await expect(page.getByText("31.0%").first()).toBeVisible();
    await expect(page.getByRole("link", { name: topic.title }).first()).toBeVisible();
    await expect(page.getByText("E2E Overview Quiz")).toBeVisible();
    await expect(page.getByRole("link", { name: /View results/ })).toHaveAttribute(
      "href",
      `/teacher/quizzes/${quizId}/results`,
    );
    const distribution = page.getByRole("img", {
      name: /1 developing, 1 needing support/,
    });
    await expect(distribution).toBeVisible();
  });

  test("students needing support links to the struggling student's analytics", async ({
    page,
    request,
  }) => {
    const teacher = await registerAndLogin(request, "TEACHER");
    const classroom = await createClassroom(request, teacher.access, "E2E Support Class");
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
      "E2E Support Lesson",
    );
    const { quizId, questionId, correctChoiceId, wrongChoiceId } = await seedOneQuestionQuiz(
      request,
      teacher.access,
      lessonId,
      classroom.id,
      topic.id,
      "E2E Support Quiz",
    );
    const goodStudent = await registerAndLogin(request, "STUDENT");
    await joinClassroom(request, goodStudent.access, classroom.joinCode);
    await submitQuiz(request, goodStudent.access, quizId, questionId, correctChoiceId);
    const weakStudent = await registerAndLogin(request, "STUDENT");
    await joinClassroom(request, weakStudent.access, classroom.joinCode);
    await submitQuiz(request, weakStudent.access, quizId, questionId, wrongChoiceId);
    const weakStudentId = await enrolledStudentId(request, teacher.access, classroom.id, "last");

    await seedSession(page, teacher.refresh);
    await page.goto(`/teacher/classrooms/${classroom.id}/analytics`);
    await expect(
      page.getByRole("heading", { name: "Students needing support" }),
    ).toBeVisible();
    const supportLink = page.getByRole("link", { name: "View progress" });
    await expect(supportLink).toHaveAttribute(
      "href",
      `/teacher/classrooms/${classroom.id}/analytics/students/${weakStudentId}`,
    );
  });

  test("student analytics page shows topics and mastery statuses", async ({ page, request }) => {
    const teacher = await registerAndLogin(request, "TEACHER");
    const classroom = await createClassroom(request, teacher.access, "E2E Student Class");
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
      "E2E Student Lesson",
    );
    const { quizId, questionId, correctChoiceId } = await seedOneQuestionQuiz(
      request,
      teacher.access,
      lessonId,
      classroom.id,
      topic.id,
      "E2E Student Quiz",
    );
    const student = await registerAndLogin(request, "STUDENT");
    await joinClassroom(request, student.access, classroom.joinCode);
    await submitQuiz(request, student.access, quizId, questionId, correctChoiceId);
    const studentId = await enrolledStudentId(request, teacher.access, classroom.id);
    await seedSession(page, teacher.refresh);
    await page.goto(
      `/teacher/classrooms/${classroom.id}/analytics/students/${studentId}`,
    );
    await expect(page.getByRole("heading", { name: /Student #\d+/ })).toBeVisible();
    await expect(page.getByText("Overall mastery")).toBeVisible();
    await expect(page.getByText("Topics mastered")).toBeVisible();
    await expect(page.getByText(topic.title)).toBeVisible();
    await expect(page.locator("span.bg-amber-100", { hasText: "Developing" }).first()).toBeVisible();
  });

  test("topic analytics page shows the students who attempted the topic", async ({
    page,
    request,
  }) => {
    const teacher = await registerAndLogin(request, "TEACHER");
    const classroom = await createClassroom(request, teacher.access, "E2E Topic Class");
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
      "E2E Topic Lesson",
    );
    const { quizId, questionId, correctChoiceId } = await seedOneQuestionQuiz(
      request,
      teacher.access,
      lessonId,
      classroom.id,
      topic.id,
      "E2E Topic Quiz",
    );
    const student = await registerAndLogin(request, "STUDENT");
    await joinClassroom(request, student.access, classroom.joinCode);
    await submitQuiz(request, student.access, quizId, questionId, correctChoiceId);

    await seedSession(page, teacher.refresh);
    await page.goto(`/teacher/classrooms/${classroom.id}/analytics/topics/${topic.id}`);
    await expect(page.getByRole("heading", { name: topic.title })).toBeVisible();
    await expect(page.getByText("Students attempted")).toBeVisible();
    await expect(page.getByRole("link", { name: /Student #\d+/ })).toBeVisible();
    await expect(page.locator("span.bg-amber-100", { hasText: "Developing" }).first()).toBeVisible();
  });

  test("dashboard shows analytics at a glance for classrooms with data", async ({
    page,
    request,
  }) => {
    const teacher = await registerAndLogin(request, "TEACHER");
    const classroom = await createClassroom(request, teacher.access, "E2E Glance Class");
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
      "E2E Glance Lesson",
    );
    const { quizId, questionId, correctChoiceId } = await seedOneQuestionQuiz(
      request,
      teacher.access,
      lessonId,
      classroom.id,
      topic.id,
      "E2E Glance Quiz",
    );
    const student = await registerAndLogin(request, "STUDENT");
    await joinClassroom(request, student.access, classroom.joinCode);
    await submitQuiz(request, student.access, quizId, questionId, correctChoiceId);

    await seedSession(page, teacher.refresh);
    await page.goto("/teacher/dashboard");
    await expect(page.getByRole("heading", { name: "Analytics at a glance" })).toBeVisible();
    await expect(page.getByRole("link", { name: "E2E Glance Class" })).toBeVisible();
    await expect(page.getByText(/Average mastery:/)).toBeVisible();
  });

  test("an unenrolled student's analytics page reports no access", async ({ page, request }) => {
    const teacher = await registerAndLogin(request, "TEACHER");
    const classroom = await createClassroom(request, teacher.access, "E2E Guard Class");
    const outsider = await registerAndLogin(request, "STUDENT");

    await seedSession(page, teacher.refresh);
    await page.goto(
      `/teacher/classrooms/${classroom.id}/analytics/students/${outsider.id}`,
    );
    await expect(
      page.getByText("This classroom is unavailable or you do not have access."),
    ).toBeVisible();
  });

  test("a foreign teacher cannot open a classroom's analytics", async ({ page, request }) => {
    const owner = await registerAndLogin(request, "TEACHER");
    const classroom = await createClassroom(request, owner.access, "E2E Private Class");
    const intruder = await registerAndLogin(request, "TEACHER");
    await seedSession(page, intruder.refresh);

    await page.goto(`/teacher/classrooms/${classroom.id}/analytics`);
    await expect(
      page.getByText("This classroom is unavailable or you do not have access."),
    ).toBeVisible();
  });
});
