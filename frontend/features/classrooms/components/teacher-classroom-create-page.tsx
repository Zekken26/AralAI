"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { ROUTES } from "@/lib/routes";
import { classroomCreateSchema } from "@/features/classrooms/schemas";
import { useCreateClassroom } from "@/features/classrooms/hooks/use-teacher-classrooms";
import { classroomMutationErrorMessage } from "@/features/classrooms/utils/classroom-errors";
import type { ClassroomCreateValues } from "@/types/classrooms";

export function TeacherClassroomCreatePage() {
  const router = useRouter();
  const create = useCreateClassroom();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ClassroomCreateValues>({
    resolver: zodResolver(classroomCreateSchema),
    defaultValues: { name: "", section: "", school_year: "" },
  });

  const onSubmit = async (values: ClassroomCreateValues) => {
    setFormError(null);
    try {
      const classroom = await create.mutateAsync(values);
      router.push(ROUTES.teacher.classroomDetail(classroom.id));
    } catch (error) {
      setFormError(classroomMutationErrorMessage(error));
    }
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">New classroom</h1>
        <p className="mt-1 text-sm text-slate-600">
          Create a classroom to get a join code students can use to enroll.
        </p>
      </div>

      <Card>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          {formError ? <ErrorAlert message={formError} /> : null}
          <Input
            label="Classroom name"
            placeholder="e.g. Grade 8 Math"
            error={errors.name?.message}
            {...register("name")}
          />
          <Input
            label="Section"
            placeholder="e.g. Section A"
            hint="Optional — use it to tell sections apart."
            error={errors.section?.message}
            {...register("section")}
          />
          <Input
            label="School year"
            placeholder="e.g. 2026-2027"
            hint="Optional."
            error={errors.school_year?.message}
            {...register("school_year")}
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push(ROUTES.teacher.classrooms)}
              disabled={create.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" loading={create.isPending} disabled={create.isPending}>
              {create.isPending ? "Creating…" : "Create classroom"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}