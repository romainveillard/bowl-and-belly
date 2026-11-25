import type { ReactNode } from "react";

/** "Eaten · 18 g, 67 kcal": the result a sheet will save, under its fields. */
export function SummaryRow({
  label,
  warning = false,
  children,
}: {
  label: string;
  warning?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex justify-between rounded-[10px] bg-muted px-3.5 py-3 text-sm tabular-nums">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-semibold ${warning ? "text-warning" : ""}`}>{children}</span>
    </div>
  );
}
