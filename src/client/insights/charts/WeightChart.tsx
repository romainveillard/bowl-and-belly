import { useTranslation } from "react-i18next";
import { ComposedChart, Line, ResponsiveContainer, Scatter, XAxis, YAxis } from "recharts";
import { addDays, appDayOf, type DaySettings } from "../../../shared/app-day.js";
import { rollingAverage, type Reading } from "../../../shared/insights.js";
import { formatAppDay, formatKg } from "../../lib/format.js";
import { ChartTable } from "./ChartTable.js";
import { markColour } from "./colours.js";
import { LegendItem } from "./Legend.js";

const DAY_MS = 86_400_000;

/** Raw readings as faint dots and their 7-day rolling average as a line. */
export function WeightChart({
  readings,
  from,
  to,
  tickEvery,
  daySettings,
  label,
  height = 160,
}: {
  /** Readings from before `from` only feed the rolling average. */
  readings: Reading[];
  /** First and last day shown, "YYYY-MM-DD". */
  from: string;
  to: string;
  tickEvery: number;
  /** The app's time zone and day start, which decide the day each reading falls on. */
  daySettings: DaySettings;
  label: string;
  height?: number;
}) {
  const { t, i18n } = useTranslation();
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${addDays(to, 1)}T00:00:00Z`);
  const shown = rollingAverage(readings).filter((reading) => {
    const day = appDayOf(new Date(reading.at), daySettings);
    return day >= from && day <= to;
  });
  const data = shown.map((reading) => ({
    at: reading.at,
    kg: reading.weightG / 1000,
    averageKg: reading.averageG / 1000,
  }));
  const ticks: number[] = [];
  for (let tick = start; tick < end; tick += tickEvery * DAY_MS) {
    ticks.push(tick);
  }

  const weight = (grams: number) =>
    t("insights.kgValue", { weight: formatKg(grams, i18n.language) });
  const kg = data.flatMap((point) => [point.kg, point.averageKg]);

  return (
    <div className="flex flex-col gap-3">
      <ChartTable
        caption={label}
        columns={[t("insights.date"), t("insights.weight"), t("insights.legendAverage")]}
        rows={shown.map((reading) => ({
          key: String(reading.at),
          cells: [
            formatAppDay(appDayOf(new Date(reading.at), daySettings), i18n.language, {
              day: "numeric",
              month: "long",
            }),
            weight(reading.weightG),
            weight(reading.averageG),
          ],
        }))}
      />
      <div aria-hidden="true" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            accessibilityLayer={false}
            data={data}
            margin={{ top: 8, right: 12, bottom: 0, left: 12 }}
          >
            <XAxis
              dataKey="at"
              type="number"
              domain={[start, end]}
              ticks={ticks}
              // Ticks are UTC midnights, named as the days they stand for wherever the device is.
              tickFormatter={(at: number) =>
                formatAppDay(new Date(at).toISOString().slice(0, 10), i18n.language, {
                  day: "numeric",
                  month: "short",
                })
              }
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
              stroke={markColour("weightAverage")}
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
        <LegendItem
          label={t("insights.legendAverage")}
          line="border-t-[3px] border-primary-strong"
        />
      </div>
    </div>
  );
}
