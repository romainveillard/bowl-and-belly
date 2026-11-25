import { useTranslation } from "react-i18next";
import {
  Area,
  ComposedChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  XAxis,
  YAxis,
} from "recharts";
import type { FeedEntry } from "../../lib/feeds.js";
import { formatTime } from "../../lib/format.js";
import { LegendItem } from "./IntakeChart.js";

const HOUR_MS = 3_600_000;

const dotColour = {
  wet: "var(--color-wet-foreground)",
  dry: "var(--color-dry-foreground)",
  custom: "var(--color-muted-foreground)",
};

function Dot({ label, colour }: { label: string; colour: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground">
      <span aria-hidden="true" className={`size-2.5 rounded-full ${colour}`} />
      {label}
    </span>
  );
}

/** The running kcal total through one app day, stepping up at each feed. */
export function DayChart({
  entries,
  start,
  end,
  targetKcal,
  timeZone,
  now,
  label,
  height = 190,
}: {
  /** The day's feeds, in any order. */
  entries: FeedEntry[];
  /** When the app day starts and ends, in milliseconds. */
  start: number;
  end: number;
  targetKcal: number | null;
  timeZone: string;
  /** When the screen opened, in milliseconds. */
  now: number;
  label: string;
  height?: number;
}) {
  const { t, i18n } = useTranslation();
  const feeds = entries.toSorted((a, b) => Date.parse(a.fedAt) - Date.parse(b.fedAt));
  const dots = feeds.map((entry, index) => ({
    at: Date.parse(entry.fedAt),
    total: feeds.slice(0, index + 1).reduce((sum, feed) => sum + feed.kcal, 0),
    kind: entry.type.systemKey ?? ("custom" as const),
  }));
  const total = dots.at(-1)?.total ?? 0;
  // Today's line stops at now; a finished day runs to its end.
  const last = Math.min(end, Math.max(now, dots.at(-1)?.at ?? start));
  const steps = [{ at: start, total: 0 }, ...dots, { at: last, total }];
  const ticks = [0, 6, 12, 18, 24].map((hours) => start + hours * HOUR_MS);
  const top = Math.max(total, targetKcal ?? 0, 1);

  return (
    <div className="flex flex-col gap-3">
      <div role="img" aria-label={label} style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={steps} margin={{ top: 22, right: 8, bottom: 0, left: 8 }}>
            <XAxis
              dataKey="at"
              type="number"
              domain={[start, end]}
              ticks={ticks}
              interval={0}
              tickFormatter={(at: number) => formatTime(new Date(at), timeZone, i18n.language)}
              tickLine={false}
              axisLine={{ stroke: "var(--color-border)" }}
              tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
            />
            <YAxis hide domain={[0, Math.ceil(top * 1.12)]} />
            <Area
              dataKey="total"
              type="stepAfter"
              stroke="var(--color-primary)"
              strokeWidth={3}
              fill="var(--color-accent-soft)"
              fillOpacity={1}
              isAnimationActive={false}
            />
            {targetKcal !== null && (
              <ReferenceLine
                y={targetKcal}
                stroke="var(--color-foreground)"
                strokeWidth={2}
                strokeDasharray="6 5"
                label={{
                  value: t("insights.targetValue", { kcal: targetKcal }),
                  position: "insideTopRight",
                  fontSize: 11,
                  fontWeight: 600,
                  fill: "var(--color-foreground)",
                  dy: -16,
                }}
              />
            )}
            {(["wet", "dry", "custom"] as const).map((kind) => (
              <Scatter
                key={kind}
                data={dots.filter((dot) => dot.kind === kind)}
                dataKey="total"
                fill={dotColour[kind]}
                stroke="var(--color-card)"
                strokeWidth={2}
                isAnimationActive={false}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        <LegendItem label={t("insights.legendRunning")} line="border-t-[3px] border-primary" />
        <Dot label={t("insights.legendWet")} colour="bg-wet-foreground" />
        <Dot label={t("insights.legendDry")} colour="bg-dry-foreground" />
        {dots.some((dot) => dot.kind === "custom") && (
          <Dot label={t("insights.legendOther")} colour="bg-muted-foreground" />
        )}
        <LegendItem
          label={t("insights.legendTarget")}
          line="border-t-2 border-dashed border-foreground"
        />
      </div>
    </div>
  );
}
