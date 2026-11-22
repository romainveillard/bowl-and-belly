import { Switch as RadixSwitch } from "radix-ui";

interface SwitchProps {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export function Switch({ label, checked, onCheckedChange }: SwitchProps) {
  return (
    <RadixSwitch.Root
      aria-label={label}
      checked={checked}
      onCheckedChange={onCheckedChange}
      className="group flex size-11 flex-none cursor-pointer items-center justify-center"
    >
      <span className="relative block h-[22px] w-10 rounded-full bg-[#8A92A3] group-data-[state=checked]:bg-primary">
        <RadixSwitch.Thumb className="absolute top-0.5 left-0.5 block size-[18px] rounded-full bg-card shadow-[0_1px_3px_rgba(31,42,68,0.25)] transition-transform data-[state=checked]:translate-x-[18px]" />
      </span>
    </RadixSwitch.Root>
  );
}
