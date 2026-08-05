/**
 * Renders lesson content. The backend stores content as plain text (a
 * TextField — not Markdown and not JSON). We render it as escaped paragraphs;
 * React escapes embedded markup/scripts automatically, so no
 * dangerouslySetInnerHTML is used.
 */
export function LessonContent({ content }: { content: string }) {
  const paragraphs = content.split(/\n{2,}/).filter((part) => part.trim().length > 0);

  if (paragraphs.length === 0) {
    return <p className="text-sm text-slate-600">This lesson has no content yet.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {paragraphs.map((paragraph, index) => (
        <p key={index} className="whitespace-pre-wrap text-slate-800">
          {paragraph}
        </p>
      ))}
    </div>
  );
}