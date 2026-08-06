import { forwardRef, useId, type SelectHTMLAttributes } from "react";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  hint?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, hint, id, className = "", options, placeholder, ...props },
  ref,
) {
  const autoId = useId();
  const selectId = id ?? autoId;
  const describedBy = error ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={selectId} className="text-sm font-medium text-slate-800">
        {label}
      </label>
      <select
        ref={ref}
        id={selectId}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        className={`h-11 rounded-lg border bg-white px-3 text-base text-slate-900 focus:outline-none focus:ring-2 ${
          error
            ? "border-red-500 focus:border-red-500 focus:ring-red-500/40"
            : "border-slate-300 focus:border-teal-600 focus:ring-teal-600/40"
        } ${className}`}
        {...props}
      >
        {placeholder ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? (
        <p id={`${selectId}-error`} role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p id={`${selectId}-hint`} className="text-sm text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
});
