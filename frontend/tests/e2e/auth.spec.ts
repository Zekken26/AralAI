import { expect, test } from "@playwright/test";

const uniqueEmail = (prefix: string) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}@aralai.test`;

test.describe("authentication happy path", () => {
  test("registering as a student lands on the student dashboard", async ({ page }) => {
    const email = uniqueEmail("student");
    await page.goto("/register");

    await page.getByRole("radio", { name: /i am a student/i }).check();
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("secure-pass-123");
    await page.getByRole("button", { name: /create account/i }).click();

    await expect(page).toHaveURL(/\/student\/dashboard$/);
    await expect(page.getByText(/practice quizzes and track your progress/i)).toBeVisible();
  });

  test("registering as a teacher lands on the teacher dashboard", async ({ page }) => {
    const email = uniqueEmail("teacher");
    await page.goto("/register");

    await page.getByRole("radio", { name: /i am a teacher/i }).check();
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("secure-pass-123");
    await page.getByRole("button", { name: /create account/i }).click();

    await expect(page).toHaveURL(/\/teacher\/dashboard$/);
    await expect(page.getByText(/manage classrooms and track class progress/i)).toBeVisible();
  });

  test("a returning user can sign in with the sign-in page", async ({ page }) => {
    const email = uniqueEmail("returning");
    await page.goto("/register");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("secure-pass-123");
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page).toHaveURL(/\/student\/dashboard$/);

    await page.getByRole("button", { name: email }).click();
    await page.getByRole("menuitem", { name: /sign out/i }).click();
    await expect(page).toHaveURL(/\/login$/);

    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("secure-pass-123");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/student\/dashboard$/);
  });
});

test.describe("authentication guardrails", () => {
  test("an unauthenticated visitor is sent to the login page", async ({ page }) => {
    await page.goto("/student/dashboard");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("an unknown account fails with a descriptive error", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("nobody@aralai.test");
    await page.getByLabel("Password").fill("wrong-password");
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page.getByText(/no active account found/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("a short password is rejected client-side on register", async ({ page }) => {
    await page.goto("/register");
    await page.getByLabel("Email").fill(uniqueEmail("short"));
    await page.getByLabel("Password").fill("short");
    await page.getByRole("button", { name: /create account/i }).click();

    await expect(page.getByText(/at least 8 characters/i)).toBeVisible();
  });
});