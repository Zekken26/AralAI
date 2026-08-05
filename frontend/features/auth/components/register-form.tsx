"use client";

import { useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { ROUTES } from "@/lib/routes";
import { dashboardRouteForRole, useAuth } from "@/features/auth/hooks/use-auth";
import { registerRequestSchema } from "@/features/auth/schemas";
import type { PublicRegistrationRole } from "@/types/auth";

const ROLE_OPTIONS: { value: PublicRegistrationRole; label: string; description: string }[] = [
  { value: "STUDENT", label: "I am a student", description: "Join a classroom and take quizzes." },
  { value: "TEACHER", label: "I am a teacher", description: "Create classrooms and lessons." },
];

type RegisterFormInput = z.input<typeof registerRequestSchema>;
type RegisterFormValues = z.output<typeof registerRequestSchema>;

export function RegisterForm() {
  const router = useRouter();
  const { register: registerAccount, isRegistering } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RegisterFormInput, unknown, RegisterFormValues>({
    resolver: zodResolver(registerRequestSchema),
    defaultValues: { role: "STUDENT" },
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setFormError(null);
    try {
      const user = await registerAccount(values);
      if (user) {
        router.replace(dashboardRouteForRole(user.role));
      }
    } catch (error) {
      const apiError = error as ApiError;
      if (apiError?.fields) {
        for (const [field, messages] of Object.entries(apiError.fields)) {
          if (field === "email" || field === "password" || field === "role") {
            setError(field, { type: "server", message: messages[0] });
          }
        }
      }
      if (!apiError?.fields) {
        setFormError(apiError?.message ?? "Unable to create your account. Please try again.");
      }
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      {formError ? <ErrorAlert message={formError} /> : null}

      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-medium text-slate-800">I want to create an account as</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {ROLE_OPTIONS.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-300 bg-white p-4 has-[:checked]:border-teal-600 has-[:checked]:ring-2 has-[:checked]:ring-teal-600/40"
            >
              <input
                type="radio"
                value={option.value}
                className="mt-1 h-4 w-4 accent-teal-600"
                aria-describedby={`role-${option.value.toLocaleLowerCase()}`}
                {...register("role", {
                  validate: (value) => Boolean(value) || "Choose an account type.",
                })}
              />
              <span>
                <span className="block text-sm font-medium text-slate-900">{option.label}</span>
                <span
                  id={`role-${option.value.toLocaleLowerCase()}`}
                  className="block text-sm text-slate-600"
                >
                  {option.description}
                </span>
              </span>
            </label>
          ))}
        </div>
        {errors.role ? (
          <p role="alert" className="text-sm text-red-600">
            {errors.role.message}
          </p>
        ) : null}
      </fieldset>

      <Input
        label="First name"
        autoComplete="given-name"
        maxLength={150}
        error={errors.first_name?.message}
        {...register("first_name")}
      />
      <Input
        label="Last name"
        autoComplete="family-name"
        maxLength={150}
        error={errors.last_name?.message}
        {...register("last_name")}
      />
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
        autoComplete="new-password"
        hint="At least 8 characters."
        error={errors.password?.message}
        {...register("password")}
      />

      <Button type="submit" size="lg" loading={isRegistering} className="mt-2">
        {isRegistering ? "Creating account…" : "Create account"}
      </Button>

      <p className="text-center text-sm text-slate-600">
        Already have an account?{" "}
        <Link
          href={ROUTES.login}
          className="font-medium text-teal-700 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}