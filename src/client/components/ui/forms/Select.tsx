import { Select as RadixSelect } from "radix-ui";
import { useId, useRef } from "react";
import { CheckIcon, ChevronDownIcon } from "../../icons.js";
import { inputClass } from "./Field.js";

export interface SelectOption<Value extends string> {
  value: Value;
  label: string;
  /** For an option in another language, such as a language's own name. */
  lang?: string;
}

interface SelectProps<Value extends string> {
  id?: string;
  label: string;
  value: Value;
  options: readonly SelectOption<Value>[];
  onChange: (value: Value) => void;
  hint?: string | undefined;
  disabled?: boolean;
}

/** The trigger and panel of a list being chosen from, shared with the time zone picker. */
export const selectTrigger = `${inputClass} group flex cursor-pointer items-center justify-between gap-2 text-left disabled:cursor-not-allowed data-[state=open]:border-[1.5px] data-[state=open]:border-primary-strong data-[state=open]:ring-[3px] data-[state=open]:ring-accent-soft`;
export const selectPanel =
  "rounded-xl bg-card p-1.5 shadow-[inset_0_0_0_1px_var(--color-border),0_12px_28px_rgba(31,42,68,0.16)]";
/**
 * A row in the panel. Hover tints it; keyboard focus keeps the app's outline,
 * drawn inside, since a tint alone is too faint to follow.
 */
export const selectRow =
  "flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 text-left text-[15px] focus-visible:outline-offset-[-2px]";

/** A chevron that turns over while its list is open. */
export function SelectChevron() {
  return (
    <span
      aria-hidden="true"
      className="flex flex-none text-muted-foreground transition-transform group-data-[state=open]:rotate-180 motion-reduce:transition-none"
    >
      <ChevronDownIcon size={20} />
    </span>
  );
}

/**
 * A choice from a short list, styled like the text fields, with the list in
 * a panel under the field on phones and desktop alike. Radix gives it the
 * keyboard, type-to-jump and screen-reader behaviour of a native select.
 */
export function Select<Value extends string>({
  id,
  label,
  value,
  options,
  onChange,
  hint,
  disabled = false,
}: SelectProps<Value>) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const trigger = useRef<HTMLButtonElement>(null);
  // While the list is open the page takes no pointer events, so a tap on the
  // field lands outside the list and closes it, then the click that follows
  // reaches the field, which Radix opens again on touch. Such a click is let go.
  const closedFromField = useRef(false);

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={selectId} className="text-sm font-semibold">
        {label}
      </label>
      <RadixSelect.Root
        value={value}
        onValueChange={(next) => {
          const chosen = options.find((option) => option.value === next);
          if (chosen) {
            onChange(chosen.value);
          }
        }}
        disabled={disabled}
      >
        <RadixSelect.Trigger
          ref={trigger}
          id={selectId}
          onPointerDown={() => {
            closedFromField.current = false;
          }}
          onClick={(event) => {
            if (closedFromField.current) {
              closedFromField.current = false;
              // Stops Radix's own handler, which runs after this one.
              event.preventDefault();
            }
          }}
          aria-describedby={hint ? `${selectId}-hint` : undefined}
          className={selectTrigger}
        >
          <span className="truncate">
            <RadixSelect.Value />
          </span>
          <SelectChevron />
        </RadixSelect.Trigger>
        <RadixSelect.Portal>
          {/* Above sheets, which a select may sit in. */}
          <RadixSelect.Content
            onPointerDownOutside={(event) => {
              const field = trigger.current?.getBoundingClientRect();
              const { clientX: x, clientY: y } = event.detail.originalEvent;
              closedFromField.current =
                field !== undefined &&
                x >= field.left &&
                x <= field.right &&
                y >= field.top &&
                y <= field.bottom;
            }}
            position="popper"
            sideOffset={6}
            className={`z-30 max-h-(--radix-select-content-available-height) w-(--radix-select-trigger-width) ${selectPanel}`}
          >
            <RadixSelect.Viewport className="flex flex-col gap-0.5">
              {options.map((option) => (
                <RadixSelect.Item
                  key={option.value}
                  value={option.value}
                  {...(option.lang ? { lang: option.lang } : {})}
                  className={`${selectRow} data-highlighted:not-data-[state=checked]:bg-muted data-[state=checked]:bg-accent-soft data-[state=checked]:font-semibold`}
                >
                  <span aria-hidden="true" className="flex w-[18px] flex-none text-primary-strong">
                    <RadixSelect.ItemIndicator>
                      <CheckIcon size={18} />
                    </RadixSelect.ItemIndicator>
                  </span>
                  <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
                </RadixSelect.Item>
              ))}
            </RadixSelect.Viewport>
          </RadixSelect.Content>
        </RadixSelect.Portal>
      </RadixSelect.Root>
      {hint && (
        <span id={`${selectId}-hint`} className="text-[13px] text-muted-foreground">
          {hint}
        </span>
      )}
    </div>
  );
}
