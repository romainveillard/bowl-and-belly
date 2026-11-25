import { useId, type InputHTMLAttributes, type ReactNode } from "react";
import { AlertIcon, SearchIcon } from "../../icons.js";

export const inputClass =
  "h-11 w-full rounded-lg border border-border bg-card px-3 text-base tabular-nums text-foreground focus:border-primary-strong focus:ring-[3px] focus:ring-accent-soft focus:outline-none disabled:bg-muted disabled:text-muted-foreground aria-invalid:border-[1.5px] aria-invalid:border-danger aria-invalid:ring-[3px] aria-invalid:ring-danger-soft";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Unit shown inside the input, on the right. */
  suffix?: string | undefined;
  /** Classes for the box around the input, such as its width. */
  boxClassName?: string;
}

/** A text input, with an optional unit on the right. */
export function Input({ suffix, boxClassName = "", className = "", ...input }: InputProps) {
  // A one-letter unit such as "g" fits narrow boxes like the leftover field.
  const padding = suffix ? (suffix.length === 1 ? "pr-7" : "pr-14") : "";

  return (
    <div className={`relative ${boxClassName}`}>
      <input className={`${inputClass} ${padding} ${className}`} {...input} />
      {suffix && (
        <span
          aria-hidden="true"
          className="absolute top-3 right-3 text-[15px] text-muted-foreground"
        >
          {suffix}
        </span>
      )}
    </div>
  );
}

/** A search input, with the magnifier on the left. */
export function SearchInput({
  boxClassName = "",
  ...input
}: InputHTMLAttributes<HTMLInputElement> & { boxClassName?: string }) {
  return (
    <div className={`relative ${boxClassName}`}>
      <span aria-hidden="true" className="absolute top-3 left-3 text-muted-foreground">
        <SearchIcon size={20} />
      </span>
      <input type="search" className={`${inputClass} pl-10`} {...input} />
    </div>
  );
}

/** The message under an invalid field; the field's aria-describedby names `id`. */
export function FieldError({ id, children }: { id: string; children: ReactNode }) {
  return (
    <span id={id} className="flex items-center gap-1.5 text-[13px] font-medium text-danger">
      <AlertIcon size={16} />
      {children}
    </span>
  );
}

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
      <Input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        suffix={suffix}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        {...input}
      />
      {error && <FieldError id={errorId}>{error}</FieldError>}
      {hint && !error && <span className="text-[13px] text-muted-foreground">{hint}</span>}
    </div>
  );
}
