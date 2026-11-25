const base =
  "inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-[10px] px-[18px] text-[15px] font-semibold disabled:cursor-not-allowed disabled:opacity-50";

/** Button styles from the Components artboard. */
export const button = {
  primary: `${base} bg-primary text-foreground`,
  outline: `${base} border border-border bg-card text-foreground`,
  ghost: `${base} text-foreground`,
  dangerGhost: `${base} text-danger`,
  /** Full-width main action of a sheet or a phone form. */
  primaryLarge: `${base} h-[52px] w-full rounded-xl bg-primary text-base text-foreground`,
  /** Floating main action of a tab. */
  floating: `${base} h-14 rounded-full bg-primary px-6 text-base text-foreground shadow-[0_6px_16px_rgba(31,42,68,0.18)] desktop:px-[26px]`,
  /** The quieter floating action beside the main one on desktop. */
  floatingSecondary: `${base} h-[52px] rounded-full bg-card px-5 text-foreground shadow-[inset_0_0_0_1px_var(--color-border),0_6px_16px_rgba(31,42,68,0.12)]`,
  icon: "flex size-11 flex-none cursor-pointer items-center justify-center rounded-full text-foreground",
};
