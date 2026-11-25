import type { TFunction } from "i18next";
import type { DayIntake } from "../../../shared/insights.js";
import { isOnTarget, isOverTarget } from "../../lib/dayStatus.js";
import { formatAppDay } from "../../lib/format.js";
import { foodTypeLabel } from "../../stock/foods.js";

/** A day of the intake chart, with what it was split into for its details. */
export interface ChartDay extends DayIntake {
  byType: { type: { systemKey: "wet" | "dry" | null; name: string | null }; kcal: number }[];
}

/** The chosen bar, where the chart drew it. */
export interface ChosenBar {
  day: string;
  x: number;
  y: number;
  width: number;
}

const GAP = 12;
/** About the box's height with its three lines, to keep it inside the chart. */
const BOX_HEIGHT = 72;

/**
 * Where a bar's details go: beside it on the side with more room, never wider
 * than that room, and inside the chart top to bottom, with the arrow at the
 * bar's top.
 */
export function placeBarDetails(bar: ChosenBar, chartWidth: number, chartHeight: number) {
  const onRight = bar.x + bar.width / 2 <= chartWidth / 2;
  const room = onRight ? chartWidth - (bar.x + bar.width) - GAP : bar.x - GAP;
  const top = Math.max(0, Math.min(bar.y - BOX_HEIGHT / 2, chartHeight - BOX_HEIGHT));
  return {
    side: onRight ? ("right" as const) : ("left" as const),
    // From the chart's left edge, or its right edge for a box on the bar's left.
    offset: onRight ? bar.x + bar.width + GAP : chartWidth - bar.x + GAP,
    maxWidth: Math.max(room, 0),
    top,
    arrowTop: Math.max(10, Math.min(bar.y - top, BOX_HEIGHT - 10)),
  };
}

/** "Tue 17 Nov", "251 / 260 kcal", "On target · Wet 70 · Dry 181". */
export function barDetailLines(day: ChartDay, today: string, locale: string, t: TFunction) {
  const status =
    day.day === today
      ? t("insights.barSoFar")
      : day.targetKcal === null
        ? null
        : isOnTarget(day.eatenKcal, day.targetKcal)
          ? t("insights.onTarget")
          : isOverTarget(day.eatenKcal, day.targetKcal)
            ? t("insights.barOver")
            : t("insights.barUnder");
  const split = day.byType.map((total) =>
    t("feed.split", { type: foodTypeLabel(total.type, t), kcal: total.kcal }),
  );
  return {
    date: formatAppDay(day.day, locale, { weekday: "short", day: "numeric", month: "short" }),
    value:
      day.targetKcal === null
        ? t("insights.kcalValue", { kcal: day.eatenKcal })
        : t("insights.barOfTarget", { eaten: day.eatenKcal, target: day.targetKcal }),
    note: [status, ...split].filter((part) => part !== null).join(" · "),
  };
}

/** The navy box beside a chosen bar. Pointer only: screen readers have the chart's table. */
export function BarDetails({
  lines,
  place,
}: {
  lines: ReturnType<typeof barDetailLines>;
  place: ReturnType<typeof placeBarDetails>;
}) {
  return (
    <div
      className="pointer-events-none absolute z-10 flex w-max flex-col gap-0.5 rounded-lg bg-foreground px-3 py-2 text-card shadow-[0_6px_16px_rgba(31,42,68,0.25)]"
      style={{
        top: place.top,
        maxWidth: place.maxWidth,
        ...(place.side === "right" ? { left: place.offset } : { right: place.offset }),
      }}
    >
      <span
        className={`absolute size-2.5 rotate-45 bg-foreground ${place.side === "right" ? "-left-1" : "-right-1"}`}
        style={{ top: place.arrowTop - 5 }}
      />
      <span className="text-caption font-semibold text-inverse-muted">{lines.date}</span>
      <span className="text-sm font-semibold tabular-nums">{lines.value}</span>
      <span className="text-caption tabular-nums">{lines.note}</span>
    </div>
  );
}
