import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-6xl" aria-hidden="true">
        🔒
      </p>
      <h1 className="text-2xl font-bold text-slate-900">Not so fast.</h1>
      <p className="max-w-md text-sm text-slate-600">
        This area is not available for your account type. Sign in with a student or teacher
        account to continue.
      </p>
      <Link
        href="/"
        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
      >
        Back to home
      </Link>
    </div>
  );
}