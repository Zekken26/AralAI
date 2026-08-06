# AralAI — Frontend

Next.js (App Router) frontend for the AralAI Grade 8 mathematics tutoring app.
Serves student and teacher dashboards against the Django REST API in
[`../backend`](../backend).

## Stack

- Next.js 16 (App Router, Turbopack), React 19, TypeScript
- Tailwind CSS v4
- TanStack Query (server state), axios (HTTP), react-hook-form + zod (forms)
- Vitest + Testing Library (unit/component), Playwright (e2e)

## Setup

```bash
npm install
cp .env.example .env.local   # NEXT_PUBLIC_API_BASE_URL, defaults to http://localhost:8000/api/v1
```

The backend must be running with CORS allowed for `http://localhost:3000`:

```bash
cd ../backend
venv\Scripts\activate        # Windows; see backend docs for other platforms
python manage.py runserver 8000
```

## Scripts

| Command          | What it does                                         |
| ---------------- | ---------------------------------------------------- |
| `npm run dev`    | Dev server on http://localhost:3000                  |
| `npm run build`  | Production build (requires `.env.local`)             |
| `npm run lint`   | ESLint                                               |
| `npm run typecheck` | `tsc --noEmit`                                    |
| `npm test`       | Vitest unit + component tests (jsdom, no backend)    |
| `npm run e2e`    | Playwright against the real backend (see below)      |

## Feature areas

- **Authentication** — register/login, role-based route guards, JWT refresh
  with rotation (`/login`, `/register`, student + teacher dashboards).
- **Student learning** — dashboard, classrooms (join via code), published
  lessons with objectives and content.
- **Student assessment** — quiz lists, attempts with autosave, results with
  pass/fail and per-question feedback.
- **Teacher content management** — classrooms (join codes, student list),
  lessons (create/publish/archive), quizzes (create, question bank with
  multiple-choice/numeric questions and approval workflow, publish/archive),
  attempt review, and per-classroom quiz results.
- **Teacher analytics** — classroom mastery overview (class average, topic
  distribution, weakest/strongest topics, quiz results), per-topic analytics
  with student rows, per-student mastery with status filters, and a
  "students needing support" list. All data comes from the existing
  `/classrooms/.../progress/` endpoints (no new backend endpoints; see the
  contract notes below).
- **Teacher dashboard** — stats (classrooms, lessons, quizzes, published
  questions) with a recent-activity list and an "Analytics at a glance"
  preview per classroom.

## Teacher analytics contract

The analytics pages reuse the classroom progress endpoints:

- `GET /classrooms/{id}/progress/` — classroom summary; `topic_distribution`
  entries include `average_mastery` plus per-status bucket counts.
- `GET /classrooms/{id}/students-needing-support/` — students with at least
  one topic below 40% mastery; each student's topics are sorted weakest
  first. Returns `200` with an empty list when nobody qualifies.
- `GET /classrooms/{id}/topics/{topicId}/progress/` — one topic's students
  and distribution; unknown/attempt-less topics return `200` with
  null/zero values, not `404`.
- `GET /classrooms/{id}/students/{studentId}/progress/` — one student's
  topic rows ordered by mastery score, descending; `404` when the student is
  not enrolled.
- `GET /classrooms/{id}/quiz-results/` — reused for the "Latest quiz" and
  quiz results table on the overview page.

Transport conventions (locked by `backend/apps/progress/tests/test_teacher_contract.py`):

- Progress endpoints serialize decimals as **JSON numbers**; quiz-results
  scores are **strings**. `displayPercent` accepts both.
- Statuses are **uppercase** (`NEEDS_SUPPORT`, `DEVELOPING`, `PROFICIENT`,
  `MASTERED`); distribution bucket keys are **lowercase**
  (`needs_support`, `developing`, `proficient`, `mastered`).
- Mastery thresholds: `<40` needs support, `40–69` developing, `70–84`
  proficient, `≥85` mastered.

Error handling: non-owned resources come back as `404` and render the
teacher-facing copy "This classroom is unavailable or you do not have
access."; parse failures render "We could not read the analytics response."
All of these strings live in `features/analytics/utils/errors.ts`.

## Testing

Unit/component tests run in jsdom and mock the network; they need no backend.
`NEXT_PUBLIC_API_BASE_URL` is provided by the Vitest config.

E2E tests start the Next dev server automatically but require the Django
backend running on `:8000` (see Setup). Each test registers its own unique
user:

```bash
npm run e2e
```

E2E coverage: `auth.spec.ts`, `student-learning.spec.ts`,
`student-assessment.spec.ts`, `teacher-content.spec.ts` (the teacher
content management flow), and `teacher-analytics.spec.ts` (the analytics
routes: landing, overview, support list, topic/student detail, dashboard
preview, and 404 access guards). The spec helpers seed a session by placing
the refresh token in `sessionStorage`; because the backend rotates refresh
tokens, each seed is applied only once per explicit call, otherwise the
app's rotated token is left untouched.

## Auth contract

The backend returns JWT pairs in JSON bodies (no cookies), so there is no
CSRF concern; CORS is handled server-side.

- Access token: kept **in memory only** (`lib/auth.ts`).
- Refresh token: kept in `sessionStorage` so reloads within the tab keep the
  session. Rotation is supported: after every refresh the new pair is stored.
- `lib/api-client.ts` attaches the Bearer token, deduplicates concurrent 401
  refresh attempts, retries a failed request once, and fires
  `aralai:session-expired` when the refresh fails so the app can redirect to
  `/login`.
- Route access is enforced client-side by `RouteGuard` (anonymous/student/
  teacher modes) and the `AuthProvider` loading gate. The Django API remains
  the security boundary.

## Known limitations

- Refresh token in `sessionStorage` is XSS-readable (no httpOnly cookie
  support on the backend yet). Access token in memory limits the window.
- ADMIN cannot register publicly and has no dashboard yet; ADMIN accounts
  land on `/unauthorized`.
