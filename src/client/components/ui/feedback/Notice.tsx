import type { ReactNode } from "react";
import { AlertIcon, InfoIcon } from "../../icons.js";

const tones = {
  danger: "bg-danger-soft text-danger-strong",
  warning: "bg-warning-soft text-warning-strong",
  info: "bg-muted",
};

/** A tinted box with an icon: an error, a warning or a note. */
export function Notice({
  tone,
  role,
  id,
  className = "",
  children,
}: {
  tone: keyof typeof tones;
  role?: "alert" | "status";
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      id={id}
      role={role}
      className={`flex items-start gap-2.5 rounded-[10px] px-3.5 py-3 text-sm leading-5 ${tones[tone]} ${className}`}
    >
      <span className="flex-none">
        {tone === "info" ? <InfoIcon size={18} /> : <AlertIcon size={18} />}
      </span>
      <span>{children}</span>
    </div>
  );
}
