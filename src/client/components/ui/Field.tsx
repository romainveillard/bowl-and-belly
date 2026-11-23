import { useId, type InputHTMLAttributes, type ReactNode } from "react";
import { AlertIcon } from "../icons.js";

export const inputClass =
  "h-11 w-full rounded-lg border border-border bg-card px-3 text-base tabular-nums text-foreground focus:border-primary-strong focus:ring-[3px] focus:ring-accent-soft focus:outline-none aria-invalid:border-[1.5px] aria-invalid:border-danger aria-invalid:ring-[3px] aria-invalid:ring-danger-soft";

interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Unit shown inside the field, on the right. */
  suffix?: string | undefined;
  hint?: ReactNode;
  /** Shown under the field, which is then marked invalid. */
  error?: string | undefined;
}

export function Field({ label, value, onChange, suffix, hint, error, ...input }: FieldProps) {
  const generatedId = useId();
  const id = input.id ?? generatedId;
  const errorId = `${id}-error`;

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`${inputClass} ${suffix ? "pr-14" : ""}`}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          {...input}
        />
        {suffix && (
          <span
            aria-hidden="true"
            className="absolute top-3 right-3 text-[15px] text-muted-foreground"
          >
            {suffix}
          </span>
        )}
      </div>
      {error && (
        <span
          id={errorId}
          className="flex items-center gap-1.5 text-[13px] font-medium text-danger"
        >
          <AlertIcon size={16} />
          {error}
        </span>
      )}
      {hint && !error && <span className="text-[13px] text-muted-foreground">{hint}</span>}
    </div>
  );
}
