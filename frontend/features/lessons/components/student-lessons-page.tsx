"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { LessonList } from "@/features/lessons/components/lesson-list";
import { useStudentLessons, useTopicsForLessons } from "@/features/lessons/hooks/use-lessons";

function parsePositiveInt(value: string | null): number | undefined {
  if (value == null) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export function StudentLessonsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const topicId = parsePositiveInt(searchParams.get("topic"));
  const page = Math.max(1, parsePositiveInt(searchParams.get("page")) ?? 1);
  const lessonsQuery = useStudentLessons({ topic: topicId, page, enabled: true });
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
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Lessons</h1>
        <p className="mt-1 text-sm text-slate-600">
          Published lessons from your classrooms.
        </p>
      </div>

      <LessonList
        lessonsQuery={lessonsQuery}
        topicId={topicId}
        topics={topics}
        topicsLoaded={topicsLoaded}
        page={page}
        onFilterChange={setFilter}
      />
    </div>
  );
}