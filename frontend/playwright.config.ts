import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright end-to-end tests exercise the real Django backend. The Next.js
 * dev server is started automatically; the backend must be running manually:
 *   cd backend && python manage.py runserver 8000
 * with CORS_ALLOWED_ORIGINS including http://localhost:3000 (backend default).
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});