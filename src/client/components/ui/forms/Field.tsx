import { useCallback, useId, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { AlertIcon, SearchIcon } from "../../icons.js";

export const inputClass =
  "h-11 w-full rounded-lg border border-input-border bg-card px-3 text-base tabular-nums text-foreground placeholder:text-muted-foreground focus:border-primary-strong focus:ring-1 focus:ring-primary-strong focus:outline-none disabled:bg-muted disabled:text-muted-foreground aria-invalid:border-[1.5px] aria-invalid:border-danger aria-invalid:ring-[3px] aria-invalid:ring-danger-soft";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  suffix?: string | undefined;
  /** Classes for the box around the input, such as its width. */
  boxClassName?: string;
}

/** Ids for aria-describedby, leaving out the missing ones. */
export const describedBy = (...ids: (string | false | null | undefined)[]) =>
  ids.filter(Boolean).join(" ") || undefined;

export function Input({
  suffix,
  boxClassName = "",
  className = "",
  "aria-describedby": description,
  ...input
}: InputProps) {
  const [unitWidth, setUnitWidth] = useState<number | null>(null);
  const unitId = useId();

  // Units run from "g" to translated or typed portion names such as
  // "sachets", so the text keeps clear of the unit's measured width, which
  // also changes once the bundled font has loaded.
  const measureUnit = useCallback((element: HTMLSpanElement) => {
    const observer = new ResizeObserver(() => setUnitWidth(element.offsetWidth));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const clearance = suffix
    ? unitWidth === null
      ? `calc(${suffix.length}ch + 20px)`
      : `${unitWidth + 20}px`
    : undefined;

  return (
    <div className={`relative ${boxClassName}`}>
      <input
        className={`${inputClass} ${className}`}
        style={clearance ? { paddingInlineEnd: clearance } : undefined}
        // The unit is hidden as text of its own but read with the field: "4.5, kg".
        aria-describedby={describedBy(description, suffix && unitId)}
        {...input}
      />
      {suffix && (
        <span
          id={unitId}
          ref={measureUnit}
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
  suffix?: string | undefined;
  hint?: ReactNode;
  /** Shown under the field, which is then marked invalid. */
  error?: string | undefined;
}

export function Field({
  label,
  value,
  onChange,
  suffix,
  hint,
  error,
  "aria-describedby": description,
  ...input
}: FieldProps) {
  const generatedId = useId();
  const id = input.id ?? generatedId;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const showHint = Boolean(hint) && !error;

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
        aria-describedby={describedBy(error && errorId, showHint && hintId, description)}
        {...input}
      />
      {error && <FieldError id={errorId}>{error}</FieldError>}
      {showHint && (
        <span id={hintId} className="text-[13px] text-muted-foreground">
          {hint}
        </span>
      )}
    </div>
  );
}
