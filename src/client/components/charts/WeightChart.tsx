import { useTranslation } from "react-i18next";
import { ComposedChart, Line, ResponsiveContainer, Scatter, XAxis, YAxis } from "recharts";
import { addDays } from "../../../shared/app-day.js";
import { rollingAverage, type Reading } from "../../../shared/insights.js";
import { LegendItem } from "./IntakeChart.js";

const DAY_MS = 86_400_000;

/** Raw readings as faint dots and their 7-day rolling average as a line, over eight weeks. */
export function WeightChart({
  readings,
  today,
  label,
  height = 160,
}: {
  readings: Reading[];
  today: string;
  label: string;
  height?: number;
}) {
  const { t, i18n } = useTranslation();
  const data = rollingAverage(readings).map((reading) => ({
    at: reading.at,
    kg: reading.weightG / 1000,
    averageKg: reading.averageG / 1000,
  }));
  const end = Date.parse(`${addDays(today, 1)}T00:00:00Z`);
  const start = end - 56 * DAY_MS;
  const ticks = [0, 14, 28, 42].map((days) => start + days * DAY_MS);
  const date = new Intl.DateTimeFormat(i18n.language, { day: "numeric", month: "short" });
  const kg = data.flatMap((point) => [point.kg, point.averageKg]);

  return (
    <div className="flex flex-col gap-3">
      <div role="img" aria-label={label} style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 12 }}>
            <XAxis
              dataKey="at"
              type="number"
              domain={[start, end]}
              ticks={ticks}
              tickFormatter={(at: number) => date.format(at)}
              tickLine={false}
              axisLine={{ stroke: "var(--color-border)" }}
              tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
            />
            <YAxis hide domain={[Math.min(...kg) - 0.2, Math.max(...kg) + 0.2]} />
            <Line
              dataKey="kg"
              stroke="var(--color-foreground)"
              strokeWidth={1.5}
              strokeOpacity={0.3}
              dot={false}
              isAnimationActive={false}
            />
            <Scatter dataKey="kg" fill="var(--color-foreground)" isAnimationActive={false} />
            <Line
              dataKey="averageKg"
              stroke="var(--color-primary)"
              strokeWidth={3}
              strokeLinecap="round"
              dot={false}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="flex gap-4">
        <LegendItem label={t("insights.legendReadings")} line="border-t-[3px] border-foreground" />
        <LegendItem label={t("insights.legendAverage")} line="border-t-[3px] border-primary" />
      </div>
    </div>
  );
}
