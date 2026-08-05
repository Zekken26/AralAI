"use client";

import { type ReactNode } from "react";

import { useAuth } from "@/features/auth/hooks/use-auth";

/**
 * Blocks protected content until the startup /auth/me/ request resolves.
 * While loading, shows a full-screen loading state so authenticated routes
 * never flash before the user's identity is known.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 p-6">
        <div
          role="status"
          aria-live="polite"
          className="h-10 w-10 animate-spin rounded-full border-4 border-slate-300 border-t-teal-600"
          aria-label="Loading"
        />
        <p className="text-sm text-slate-600">Loading your account…</p>
      </div>
    );
  }

  return <>{children}</>;
}