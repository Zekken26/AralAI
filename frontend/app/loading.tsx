export default function LoadingPage() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading"
      className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 p-6"
    >
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-300 border-t-teal-600" />
      <p className="text-sm text-slate-600">Loading…</p>
    </div>
  );
}