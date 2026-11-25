import { useId, type ReactNode } from "react";
import { ChevronDownIcon } from "../../icons.js";
import { inputClass } from "./Field.js";

interface SelectProps {
  id?: string;
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  hint?: string | undefined;
  disabled?: boolean;
  /** The `<option>`s. */
  children: ReactNode;
}

/** A labelled drop-down, styled like the text fields. */
export function Select({
  id,
  label,
  value,
  onChange,
  hint,
  disabled = false,
  children,
}: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={selectId} className="text-sm font-semibold">
        {label}
      </label>
      <span className="relative">
        <select
          id={selectId}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className={`${inputClass} appearance-none pr-11`}
        >
          {children}
        </select>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-3 right-3.5 text-muted-foreground"
        >
          <ChevronDownIcon size={20} />
        </span>
      </span>
      {hint && <span className="text-[13px] text-muted-foreground">{hint}</span>}
    </div>
  );
}
