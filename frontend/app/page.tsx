import Link from "next/link";

import { ROUTES } from "@/lib/routes";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
        <span className="text-lg font-semibold text-slate-900">AralAI</span>
        <nav aria-label="Account" className="flex items-center gap-3">
          <Link
            href={ROUTES.login}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
          >
            Sign in
          </Link>
          <Link
            href={ROUTES.register}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
          >
            Create account
          </Link>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-16 text-center">
        <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">
          Learn Grade 8 Mathematics at your own pace.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-slate-600">
          AralAI helps students practice with quizzes that adapt to their progress, while teachers
          see how their class is doing at a glance.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link
            href={ROUTES.register}
            className="rounded-lg bg-teal-600 px-6 py-3 text-base font-medium text-white hover:bg-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
          >
            Get started
          </Link>
          <Link
            href={ROUTES.login}
            className="rounded-lg border border-slate-300 bg-white px-6 py-3 text-base font-medium text-slate-800 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
          >
            Sign in
          </Link>
        </div>
      </main>
    </div>
  );
}