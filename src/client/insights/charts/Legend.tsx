/** One entry in a chart's legend: a short line in the series' style, then its name. */
export function LegendItem({ label, line }: { label: string; line: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground">
      <span aria-hidden="true" className={`h-0 w-4 ${line}`} />
      {label}
    </span>
  );
}
