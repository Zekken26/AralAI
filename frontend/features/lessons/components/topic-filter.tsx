"use client";

import type { Topic } from "@/types/lessons";

/** Chips for filtering lessons by topic. "All lessons" clears the filter. */
export function TopicFilter({
  topics,
  selected,
  onSelect,
}: {
  topics: Topic[];
  selected?: number;
  onSelect: (topicId?: number) => void;
}) {
  const chipClass = (active: boolean) =>
    `rounded-full border px-3 py-1 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
      active
        ? "border-teal-600 bg-teal-600 text-white"
        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
    }`;

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Filter lessons by topic">
      <button
        type="button"
        aria-pressed={selected == null}
        onClick={() => onSelect(undefined)}
        className={chipClass(selected == null)}
      >
        All lessons
      </button>
      {topics.map((topic) => (
        <button
          key={topic.id}
          type="button"
          aria-pressed={selected === topic.id}
          onClick={() => onSelect(topic.id)}
          className={chipClass(selected === topic.id)}
        >
          {topic.title}
        </button>
      ))}
    </div>
  );
}