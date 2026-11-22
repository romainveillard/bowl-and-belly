import { useId, type InputHTMLAttributes, type ReactNode } from "react";

export const inputClass =
  "h-11 w-full rounded-lg border border-border bg-card px-3 text-base tabular-nums text-foreground focus:border-primary-strong focus:ring-[3px] focus:ring-accent-soft focus:outline-none";

interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Unit shown inside the field, on the right. */
  suffix?: string;
  hint?: ReactNode;
}

export function Field({ label, value, onChange, suffix, hint, ...input }: FieldProps) {
  const id = useId();

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
      {hint && <span className="text-[13px] text-muted-foreground">{hint}</span>}
    </div>
  );
}
