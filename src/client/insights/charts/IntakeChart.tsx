import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Bar,
  Cell,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { isOverTarget } from "../../lib/dayStatus.js";
import { formatAppDay } from "../../lib/format.js";
import {
  BarDetails,
  barDetailLines,
  placeBarDetails,
  type ChartDay,
  type ChosenBar,
} from "./BarDetails.js";
import { ChartTable } from "./ChartTable.js";
import { markColour } from "./colours.js";
import { LegendItem } from "./Legend.js";

const colours = {
  primary: "var(--color-primary)",
  over: "var(--color-primary-strong)",
  today: "var(--color-accent)",
  ink: "var(--color-foreground)",
  muted: "var(--color-muted-foreground)",
  axis: "var(--color-border)",
};

function Legend() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1">
      <LegendItem label={t("insights.legendDaily")} line="border-t-[3px] border-primary" />
      <LegendItem label={t("insights.legendOver")} line="border-t-[3px] border-primary-strong" />
      <LegendItem label={t("insights.legendToday")} line="border-t-[3px] border-accent" />
      <LegendItem
        label={t("insights.legendTarget")}
        line="border-t-2 border-dashed border-foreground"
      />
    </div>
  );
}

/**
 * One bar per day against the target: darker when over it, lighter for today
 * while it is still going, none for a day without feeds.
 */
export function IntakeChart({
  days,
  today,
  label,
  height = 176,
  legend = true,
  axis = "weekday",
}: {
  days: ChartDay[];
  today: string;
  label: string;
  height?: number;
  legend?: boolean;
  /** Weekday names for a week; day numbers, one week apart, for a month. */
  axis?: "weekday" | "monthDay";
}) {
  const { t, i18n } = useTranslation();
  const box = useRef<HTMLDivElement>(null);
  const [chosen, setChosen] = useState<(ChosenBar & { chartWidth: number }) | null>(null);

  // A tap anywhere closes the details; a tap on a bar opens them again, on it.
  useEffect(() => {
    if (!chosen) {
      return undefined;
    }
    const close = () => setChosen(null);
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [chosen]);

  const top = Math.max(...days.map((day) => Math.max(day.eatenKcal, day.targetKcal ?? 0)), 1);
  // Days still to come show as short grey stubs, so the month keeps its shape.
  const stub = top * 0.02;
  const data = days.map((day) => {
    const dayOfMonth = Number(day.day.slice(8));
    return {
      ...day,
      label:
        axis === "weekday"
          ? formatAppDay(day.day, i18n.language, { weekday: "short" })
          : (dayOfMonth - 1) % 7 === 0
            ? String(dayOfMonth)
            : "",
      kcal: day.day > today ? stub : day.fed ? day.eatenKcal : null,
    };
  });
  const targets = new Set(days.map((day) => day.targetKcal));
  const [onlyTarget] = targets;
  const steadyTarget = targets.size === 1 && onlyTarget !== null && onlyTarget !== undefined;
  const choose = (bar: { x: number; y: number; width: number }, index: number) => {
    const day = data[index];
    if (day && day.day <= today) {
      setChosen({ day: day.day, ...bar, chartWidth: box.current?.clientWidth ?? 0 });
    }
  };
  const chosenDay = chosen && data.find((day) => day.day === chosen.day);
  const kcal = (value: number | null) =>
    value === null ? t("common.noValue") : t("insights.kcalValue", { kcal: value });

  return (
    <div className="flex flex-col gap-3">
      <ChartTable
        caption={label}
        columns={[t("insights.day"), t("insights.eaten"), t("insights.target")]}
        rows={days
          .filter((day) => day.day <= today)
          .map((day) => ({
            key: day.day,
            cells: [
              formatAppDay(day.day, i18n.language, {
                weekday: "long",
                day: "numeric",
                month: "long",
              }),
              day.fed ? kcal(day.eatenKcal) : t("insights.noFeedsDay"),
              kcal(day.targetKcal),
            ],
          }))}
      />
      {/* Hidden from screen readers, which have the table; the details are pointer only. */}
      <div ref={box} aria-hidden="true" className="relative" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            accessibilityLayer={false}
            data={data}
            margin={{ top: 22, right: 0, bottom: 0, left: 0 }}
          >
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={{ stroke: colours.axis }}
              tick={{ fontSize: 11, fill: colours.muted }}
              interval={0}
            />
            <YAxis hide domain={[0, Math.ceil(top * 1.12)]} />
            <Bar
              dataKey="kcal"
              radius={axis === "weekday" ? 5 : 2}
              maxBarSize={30}
              isAnimationActive={false}
              className="cursor-pointer"
              onMouseEnter={(bar, index) => choose(bar, index)}
              onMouseLeave={() => setChosen(null)}
              onClick={(bar, index) => choose(bar, index)}
            >
              {data.map((day) => (
                <Cell
                  key={day.day}
                  // An outline lifts pale bars to 3:1 against the card.
                  stroke={
                    day.day === chosen?.day
                      ? colours.ink
                      : day.day > today
                        ? "none"
                        : markColour("barOutline")
                  }
                  strokeWidth={day.day === chosen?.day ? 2 : 1}
                  fill={
                    day.day > today
                      ? colours.axis
                      : day.day === today
                        ? colours.today
                        : isOverTarget(day.eatenKcal, day.targetKcal)
                          ? colours.over
                          : colours.primary
                  }
                />
              ))}
            </Bar>
            {steadyTarget ? (
              <ReferenceLine
                y={onlyTarget}
                stroke={colours.ink}
                strokeWidth={2}
                strokeDasharray="6 5"
                label={{
                  value: t("insights.targetValue", { kcal: onlyTarget }),
                  position: "insideTopRight",
                  fontSize: 11,
                  fontWeight: 600,
                  fill: colours.ink,
                  dy: -16,
                }}
              />
            ) : (
              // The target changed during the period, so it steps with the days.
              <Line
                dataKey="targetKcal"
                type="stepAfter"
                stroke={colours.ink}
                strokeWidth={2}
                strokeDasharray="6 5"
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
        {chosen && chosenDay && (
          <BarDetails
            lines={barDetailLines(chosenDay, today, i18n.language, t)}
            place={placeBarDetails(chosen, chosen.chartWidth, height)}
          />
        )}
      </div>
      {legend && <Legend />}
    </div>
  );
}
