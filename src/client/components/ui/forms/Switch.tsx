import { Switch as RadixSwitch } from "radix-ui";

type SwitchProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
} & (
  | { label: string }
  /** The ids of visible text that names and describes the switch. */
  | { labelledBy: string; describedBy?: string }
);

export function Switch({ checked, onCheckedChange, ...naming }: SwitchProps) {
  return (
    <RadixSwitch.Root
      {...("label" in naming
        ? { "aria-label": naming.label }
        : { "aria-labelledby": naming.labelledBy, "aria-describedby": naming.describedBy })}
      checked={checked}
      onCheckedChange={onCheckedChange}
      className="group flex size-11 flex-none cursor-pointer items-center justify-center"
    >
      <span className="relative block h-[22px] w-10 rounded-full bg-switch-off group-data-[state=checked]:bg-primary">
        <RadixSwitch.Thumb className="absolute top-0.5 left-0.5 block size-[18px] rounded-full bg-card shadow-[0_1px_3px_rgba(31,42,68,0.25)] transition-transform data-[state=checked]:translate-x-[18px]" />
      </span>
    </RadixSwitch.Root>
  );
}
