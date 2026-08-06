import { forwardRef, useId, type TextareaHTMLAttributes } from "react";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, hint, id, className = "", ...props },
  ref,
) {
  const autoId = useId();
  const textareaId = id ?? autoId;
  const describedBy = error ? `${textareaId}-error` : hint ? `${textareaId}-hint` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={textareaId} className="text-sm font-medium text-slate-800">
        {label}
      </label>
      <textarea
        ref={ref}
        id={textareaId}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        className={`min-h-28 rounded-lg border bg-white px-3 py-2 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
          error
            ? "border-red-500 focus:border-red-500 focus:ring-red-500/40"
            : "border-slate-300 focus:border-teal-600 focus:ring-teal-600/40"
        } ${className}`}
        {...props}
      />
      {error ? (
        <p id={`${textareaId}-error`} role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p id={`${textareaId}-hint`} className="text-sm text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
});
