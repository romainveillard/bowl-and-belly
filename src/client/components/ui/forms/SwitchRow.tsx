import { useId } from "react";
import { Switch } from "./Switch.js";

interface SwitchRowProps {
  label: string;
  hint: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

/** A switch with its label and what it does beside it, both read with the switch. */
export function SwitchRow({ label, hint, checked, onCheckedChange }: SwitchRowProps) {
  const id = useId();

  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex flex-col gap-0.5">
        <span id={`${id}-label`} className="text-sm font-semibold">
          {label}
        </span>
        <span id={`${id}-hint`} className="text-[13px] text-muted-foreground">
          {hint}
        </span>
      </span>
      <Switch
        labelledBy={`${id}-label`}
        describedBy={`${id}-hint`}
        checked={checked}
        onCheckedChange={onCheckedChange}
      />
    </div>
  );
}
