import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-bold text-slate-900">Page not found</h1>
      <p className="max-w-md text-sm text-slate-600">
        The page you are looking for does not exist or has moved.
      </p>
      <Link
        href="/"
        className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
      >
        Back to home
      </Link>
    </div>
  );
}