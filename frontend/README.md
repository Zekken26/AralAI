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

## Testing

Unit/component tests run in jsdom and mock the network; they need no backend.
`NEXT_PUBLIC_API_BASE_URL` is provided by the Vitest config.

E2E tests start the Next dev server automatically but require the Django
backend running on `:8000` (see Setup). Each test registers its own unique
user:

```bash
npm run e2e
```

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
