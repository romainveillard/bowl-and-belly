import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { ComposedChart, Line, ResponsiveContainer, Scatter, XAxis, YAxis } from "recharts";
import { addDays, appDayOf, type DaySettings } from "../../../shared/app-day.js";
import { rollingAverage, type Reading } from "../../../shared/insights.js";
import { formatAppDay, formatKg } from "../../lib/format.js";
import { ChartDetails, placeDetails, useChosenMark } from "./ChartDetails.js";
import { ChartTable } from "./ChartTable.js";
import { markColour } from "./colours.js";
import { LegendItem } from "./Legend.js";

const DAY_MS = 86_400_000;

/**
 * A reading's dot, ringed when chosen, inside a hit area wider than the dot.
 * Recharts fills in where it goes and which reading it is.
 */
function ReadingDot({
  cx,
  cy,
  index = 0,
  chosen,
  onChoose,
  onLeave,
}: {
  cx?: number | undefined;
  cy?: number | undefined;
  index?: number;
  chosen: number | null;
  onChoose: (index: number, cx: number | undefined, cy: number | undefined) => void;
  onLeave: () => void;
}) {
  return (
    <g
      className="cursor-pointer"
      onMouseEnter={() => onChoose(index, cx, cy)}
      onMouseLeave={onLeave}
      onClick={() => onChoose(index, cx, cy)}
    >
      <circle cx={cx} cy={cy} r={14} fill="transparent" />
      <circle cx={cx} cy={cy} r={4} fill="var(--color-foreground)" />
      {chosen === index && (
        <circle
          cx={cx}
          cy={cy}
          r={7}
          fill="none"
          stroke="var(--color-foreground)"
          strokeWidth={2}
        />
      )}
    </g>
  );
}

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
  const box = useRef<HTMLDivElement>(null);
  const [chosen, setChosen] = useChosenMark();
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
  const choose = (index: number, cx: number | undefined, cy: number | undefined) => {
    if (cx !== undefined && cy !== undefined) {
      const chartWidth = box.current?.clientWidth ?? 0;
      setChosen({ key: String(index), x: cx, y: cy, width: 0, chartWidth });
    }
  };
  const chosenReading = chosen && shown[Number(chosen.key)];

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
      {/* Hidden from screen readers, which have the table; the details are pointer only. */}
      <div ref={box} aria-hidden="true" className="relative" style={{ height }}>
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
            <Scatter
              dataKey="kg"
              isAnimationActive={false}
              shape={
                <ReadingDot
                  chosen={chosen === null ? null : Number(chosen.key)}
                  onChoose={choose}
                  onLeave={() => setChosen(null)}
                />
              }
            />
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
        {chosen && chosenReading && (
          <ChartDetails
            lines={{
              date: formatAppDay(appDayOf(new Date(chosenReading.at), daySettings), i18n.language, {
                weekday: "short",
                day: "numeric",
                month: "short",
              }),
              value: weight(chosenReading.weightG),
              note: t("insights.averageNote", {
                weight: formatKg(chosenReading.averageG, i18n.language),
              }),
            }}
            place={placeDetails(chosen, chosen.chartWidth, height)}
          />
        )}
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
