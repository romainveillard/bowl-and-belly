import type { ReactNode } from "react";
import { listRow } from "../layout/List.js";

interface ActionRowProps {
  icon: ReactNode;
  label: string;
  hint: string;
  danger?: boolean;
  onClick: () => void;
}

/** One action in an actions sheet: an icon, a label and what it does. */
export function ActionRow({ icon, label, hint, danger = false, onClick }: ActionRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-14 w-full cursor-pointer items-center gap-3.5 px-5 py-2 text-left desktop:px-6 ${listRow} ${danger ? "text-danger" : ""}`}
    >
      <span
        className={`flex size-9 flex-none items-center justify-center rounded-full ${danger ? "bg-danger-soft" : "bg-muted"}`}
      >
        {icon}
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="text-base font-semibold">{label}</span>
        <span className="text-[13px] text-muted-foreground">{hint}</span>
      </span>
    </button>
  );
}
