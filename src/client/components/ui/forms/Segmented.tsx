interface SegmentedProps<Value extends string> {
  label: string;
  /** Hides the visible label when a heading already names the group. */
  hideLabel?: boolean;
  value: Value;
  options: readonly { value: Value; label: string; disabled?: boolean }[];
  onChange: (value: Value) => void;
}

/** A choice between a few fixed values. Switches are kept for turning a feature on or off. */
export function Segmented<Value extends string>({
  label,
  hideLabel = false,
  value,
  options,
  onChange,
}: SegmentedProps<Value>) {
  return (
    <div className="flex flex-col gap-1.5">
      {!hideLabel && <span className="text-sm font-semibold">{label}</span>}
      <div role="group" aria-label={label} className="flex gap-0.5 rounded-[10px] bg-muted p-1">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={option.value === value}
            disabled={option.disabled}
            onClick={() => onChange(option.value)}
            className="hit-area min-h-9 min-w-0 flex-1 cursor-pointer rounded-[7px] px-2 py-1 text-sm leading-tight break-words hyphens-auto disabled:cursor-not-allowed disabled:opacity-50 desktop:px-3 font-medium text-muted-foreground aria-pressed:bg-card aria-pressed:font-semibold aria-pressed:text-foreground aria-pressed:shadow-[0_1px_2px_rgba(31,42,68,0.12)] aria-pressed:inset-ring aria-pressed:inset-ring-input-border"
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
