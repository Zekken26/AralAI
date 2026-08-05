"use client";

import { useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { joinClassroomCodeSchema } from "@/features/classrooms/schemas";
import { useJoinClassroom } from "@/features/classrooms/hooks/use-classrooms";
import { joinErrorMessage } from "@/features/classrooms/utils/join-errors";

const joinFormSchema = z.object({ join_code: joinClassroomCodeSchema });
type JoinFormValues = z.infer<typeof joinFormSchema>;

/**
 * Dialog for joining a classroom by code. Normalizes the code to uppercase
 * (the backend stores uppercase codes and matches exactly). On success closes
 * the dialog and reports the joined classroom id to the caller.
 */
export function JoinClassroomDialog({
  open,
  onClose,
  onJoined,
}: {
  open: boolean;
  onClose: () => void;
  onJoined: (classroomId: number) => void;
}) {
  const join = useJoinClassroom();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<JoinFormValues>({
    resolver: zodResolver(joinFormSchema),
  });

  const onSubmit = async (values: JoinFormValues) => {
    setFormError(null);
    try {
      const result = await join.mutateAsync(values.join_code);
      reset();
      onClose();
      onJoined(result.classroom);
    } catch (error) {
      setFormError(joinErrorMessage(error));
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Join a classroom">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <p className="text-sm text-slate-600">
          Ask your teacher for the classroom code, then enter it below to join.
        </p>
        {formError ? <ErrorAlert message={formError} /> : null}
        <Input
          label="Classroom code"
          autoComplete="off"
          autoCapitalize="characters"
          placeholder="e.g. AB12CD34"
          hint="Codes are 8 characters and case-insensitive."
          error={errors.join_code?.message}
          {...register("join_code")}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={join.isPending}>
            Cancel
          </Button>
          <Button type="submit" loading={join.isPending} disabled={join.isPending}>
            {join.isPending ? "Joining…" : "Join classroom"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}