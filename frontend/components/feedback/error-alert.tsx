import type { ReactNode } from "react";

export function ErrorAlert({
  message,
  children,
  role = "alert",
}: {
  message?: string;
  children?: ReactNode;
  role?: "alert" | "status";
}) {
  return (
    <div
      role={role}
      className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
    >
      {message ?? children}
    </div>
  );
}
