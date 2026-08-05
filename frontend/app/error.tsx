"use client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-bold text-slate-900">Something went wrong.</h1>
      <p className="max-w-md text-sm text-slate-600">
        The page could not be loaded. Please try again in a moment.
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
      >
        Try again
      </button>
      <p className="sr-only" role="alert">
        {error.message}
      </p>
    </div>
  );
}