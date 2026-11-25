interface SegmentedProps<Value extends string> {
  label: string;
  /** Hides the visible label when a heading already names the group. */
  hideLabel?: boolean;
  /**
   * A unit beside a field: as wide as its labels, which stay on one line,
   * while the field gives up the room.
   */
  inline?: boolean;
  value: Value;
  options: readonly { value: Value; label: string; disabled?: boolean }[];
  onChange: (value: Value) => void;
}

/** A choice between a few fixed values. Switches are kept for turning a feature on or off. */
export function Segmented<Value extends string>({
  label,
  hideLabel = false,
  inline = false,
  value,
  options,
  onChange,
}: SegmentedProps<Value>) {
  const chosen = options.findIndex((option) => option.value === value);
  const count = options.length;

  return (
    <div className={`flex flex-col gap-1.5 ${inline ? "flex-none" : ""}`}>
      {!hideLabel && <span className="text-sm font-semibold">{label}</span>}
      {/*
       * Equal columns: across the row when it is full width, and each as wide
       * as the longest label when inline. The highlight slides between them,
       * one column wide and offset by the chosen one's position, past the
       * p-1 padding and the 2px gaps.
       */}
      <div
        role="group"
        aria-label={label}
        className="relative grid auto-cols-[minmax(0,1fr)] grid-flow-col gap-0.5 rounded-[10px] bg-muted p-1"
      >
        {chosen >= 0 && (
          <span
            aria-hidden="true"
            className="absolute top-1 bottom-1 left-1 rounded-[7px] bg-card shadow-[0_1px_2px_rgba(31,42,68,0.12)] inset-ring inset-ring-input-border transition-[translate] duration-200 ease-out motion-reduce:transition-none"
            style={{
              width: `calc((100% - 8px - ${count - 1} * 2px) / ${count})`,
              translate: `calc(${chosen} * (100% + 2px)) 0`,
            }}
          />
        )}
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={option.value === value}
            disabled={option.disabled}
            onClick={() => onChange(option.value)}
            // Longer labels may break, as French ones do on a narrow phone.
            className={`hit-area min-h-9 min-w-0 cursor-pointer rounded-[7px] py-1 text-sm leading-tight disabled:cursor-not-allowed disabled:opacity-50 font-medium text-muted-foreground aria-pressed:font-semibold aria-pressed:text-foreground ${inline ? "px-3 whitespace-nowrap" : "px-2 break-words hyphens-auto desktop:px-3"}`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
