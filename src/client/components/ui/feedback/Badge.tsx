import type { ReactNode } from "react";

const tones = {
  neutral: "bg-muted text-muted-foreground",
  success: "bg-success-soft text-success",
  wet: "bg-wet text-wet-foreground",
  dry: "bg-dry text-dry-foreground",
};

/** A short label on a tinted pill, such as "On target" or a food type. */
export function Badge({ tone, children }: { tone: keyof typeof tones; children: ReactNode }) {
  return (
    <span
      className={`inline-flex h-[22px] items-center rounded-full px-2 text-caption font-semibold ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
