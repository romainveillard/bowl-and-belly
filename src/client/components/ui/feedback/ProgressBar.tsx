const tones = {
  default: "bg-primary",
  /** Past the target's band, from isOverTarget. */
  over: "bg-primary-strong",
  /** A day still in progress. */
  soFar: "bg-accent",
};

interface ProgressBarProps {
  /** Filled share, in percent; anything over 100 fills the bar. */
  percent: number;
  tone?: keyof typeof tones;
  label: string;
  /** Height, and the track colour where it differs from bg-muted. */
  className: string;
}

export function ProgressBar({ percent, tone = "default", label, className }: ProgressBarProps) {
  return (
    <span
      role="img"
      aria-label={label}
      className={`relative block rounded-full bg-muted ${className}`}
    >
      <span
        className={`absolute inset-y-0 left-0 rounded-full ${tones[tone]}`}
        style={{ width: `${Math.min(percent, 100)}%` }}
      />
    </span>
  );
}
