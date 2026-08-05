"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { ROUTES } from "@/lib/routes";
import { useStudentClassroom } from "@/features/classrooms/hooks/use-classrooms";
import { useStudentLessons, useTopicsForLessons } from "@/features/lessons/hooks/use-lessons";
import { LessonList } from "@/features/lessons/components/lesson-list";
import { unavailableMessage } from "@/features/lessons/utils/errors";

function parsePositiveInt(value: string | null): number | undefined {
  if (value == null) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export function ClassroomDetailPage({ classroomId }: { classroomId: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const classroomQuery = useStudentClassroom(classroomId);
  const topicId = parsePositiveInt(searchParams.get("topic"));
  const page = Math.max(1, parsePositiveInt(searchParams.get("page")) ?? 1);
  const lessonsQuery = useStudentLessons({ classroom: classroomId, topic: topicId, page });
  const { topics, loaded: topicsLoaded } = useTopicsForLessons(lessonsQuery.data?.results);

  const setFilter = (nextTopic: number | undefined, nextPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (nextTopic != null) {
      params.set("topic", String(nextTopic));
    } else {
      params.delete("topic");
    }
    if (nextPage > 1) {
      params.set("page", String(nextPage));
    } else {
      params.delete("page");
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  };

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Breadcrumb" className="text-sm text-slate-500">
        <ol className="flex list-none flex-wrap items-center gap-1 p-0">
          <li>
            <Link
              href={ROUTES.student.classrooms}
              className="rounded text-teal-700 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
            >
              Classrooms
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-slate-800">
            {classroomQuery.data?.name ?? "…"}
          </li>
        </ol>
      </nav>

      {classroomQuery.isPending ? (
        <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading classroom">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      ) : classroomQuery.isError ? (
        <EmptyState
          title={unavailableMessage(classroomQuery.error)}
          description="It may have been closed, or you may not be enrolled in it."
          action={
            <Link
              href={ROUTES.student.classrooms}
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
            >
              Back to my classrooms
            </Link>
          }
        />
      ) : classroomQuery.data ? (
        <>
          <header className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold text-slate-900">{classroomQuery.data.name}</h1>
            {!classroomQuery.data.is_active ? (
              <span className="w-fit rounded bg-slate-200 px-2 py-0.5 text-xs font-semibold uppercase text-slate-600">
                Closed
              </span>
            ) : null}
            {[classroomQuery.data.section, classroomQuery.data.school_year]
              .filter(Boolean)
              .join(" · ") ? (
              <p className="text-sm text-slate-600">
                {[classroomQuery.data.section, classroomQuery.data.school_year]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            ) : null}
          </header>

          {lessonsQuery.isError ? (
            <ErrorAlert>
              <p>We could not load the lessons for this classroom. Please try again.</p>
            </ErrorAlert>
          ) : lessonsQuery.data ? (
            <p className="text-sm text-slate-600">
              {lessonsQuery.data.count} {lessonsQuery.data.count === 1 ? "lesson" : "lessons"}
              {topicId ? " in this topic" : ""}
            </p>
          ) : null}

          <LessonList
            lessonsQuery={lessonsQuery}
            topicId={topicId}
            topics={topics}
            topicsLoaded={topicsLoaded}
            page={page}
            onFilterChange={setFilter}
          />
        </>
      ) : null}
    </div>
  );
}