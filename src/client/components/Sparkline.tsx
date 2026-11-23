/** Weight readings, oldest first, as a small line with dots. Full charts are on Insights. */
export function Sparkline({ weightsG, label }: { weightsG: number[]; label: string }) {
  const low = Math.min(...weightsG);
  const span = Math.max(...weightsG) - low || 1;
  const points = weightsG.map((weightG, index) => ({
    x: 8 + (index * 290) / (weightsG.length - 1),
    y: 42 - ((weightG - low) / span) * 28,
  }));

  return (
    <svg viewBox="0 0 306 56" role="img" aria-label={label} className="h-14 w-full">
      <polyline
        points={points.map((point) => `${point.x},${point.y}`).join(" ")}
        fill="none"
        className="stroke-primary"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {points.map((point) => (
        <circle key={point.x} cx={point.x} cy={point.y} r="3" className="fill-foreground" />
      ))}
    </svg>
  );
}
