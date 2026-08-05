"use client";

import { useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { ROUTES } from "@/lib/routes";
import { dashboardRouteForRole, useAuth } from "@/features/auth/hooks/use-auth";
import { loginRequestSchema } from "@/features/auth/schemas";
import type { LoginRequest } from "@/types/auth";

export function LoginForm() {
  const router = useRouter();
  const { login, isLoggingIn } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginRequest>({
    resolver: zodResolver(loginRequestSchema),
  });

  const onSubmit = async (values: LoginRequest) => {
    setFormError(null);
    try {
      const user = await login(values);
      if (user) {
        router.replace(dashboardRouteForRole(user.role));
      }
    } catch (error) {
      const message =
        typeof error === "object" && error !== null && "message" in error
          ? String(error.message)
          : "Unable to sign in. Please try again.";
      setFormError(message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      {formError ? <ErrorAlert message={formError} /> : null}
      <Input
        label="Email"
        type="email"
        autoComplete="email"
        inputMode="email"
        placeholder="you@example.com"
        error={errors.email?.message}
        {...register("email")}
      />
      <Input
        label="Password"
        type="password"
        autoComplete="current-password"
        placeholder="••••••••"
        error={errors.password?.message}
        {...register("password")}
      />
      <Button type="submit" size="lg" loading={isLoggingIn} className="mt-2">
        {isLoggingIn ? "Signing in…" : "Sign in"}
      </Button>
      <p className="text-center text-sm text-slate-600">
        Don&apos;t have an account?{" "}
        <Link
          href={ROUTES.register}
          className="font-medium text-teal-700 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
        >
          Create one
        </Link>
      </p>
    </form>
  );
}