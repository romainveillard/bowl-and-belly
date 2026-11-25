import type { TFunction } from "i18next";
import { useEffect, useState } from "react";
import type { DayIntake } from "../../../shared/insights.js";
import { isOnTarget, isOverTarget } from "../../lib/dayStatus.js";
import { formatAppDay } from "../../lib/format.js";
import { foodTypeLabel } from "../../stock/foods.js";

/** A day of the intake chart, with what it was split into for its details. */
export interface ChartDay extends DayIntake {
  byType: { type: { systemKey: "wet" | "dry" | null; name: string | null }; kcal: number }[];
}

/** The chosen bar or point, where the chart drew it: a point has no width. */
export interface ChosenMark {
  key: string;
  x: number;
  y: number;
  width: number;
}

const GAP = 12;

/**
 * Where a mark's details go: beside it on the side with more room, never wider
 * than that room, and inside the chart top to bottom where it is tall enough,
 * with the arrow at the mark's top.
 */
export function placeDetails(
  mark: Omit<ChosenMark, "key">,
  chartWidth: number,
  chartHeight: number,
  /** About the box's height, three lines unless told otherwise. */
  boxHeight = 72,
) {
  const onRight = mark.x + mark.width / 2 <= chartWidth / 2;
  const room = onRight ? chartWidth - (mark.x + mark.width) - GAP : mark.x - GAP;
  const top = Math.max(0, Math.min(mark.y - boxHeight / 2, chartHeight - boxHeight));
  return {
    side: onRight ? ("right" as const) : ("left" as const),
    // From the chart's left edge, or its right edge for a box on the mark's left.
    offset: onRight ? mark.x + mark.width + GAP : chartWidth - mark.x + GAP,
    maxWidth: Math.max(room, 0),
    top,
    arrowTop: Math.max(10, Math.min(mark.y - top, boxHeight - 10)),
  };
}

/**
 * The mark whose details are open. Hovering or tapping one opens them; a tap
 * anywhere closes them, and a tap on a mark opens them again, on it, as the
 * mark's click comes after the tap's pointerdown.
 */
export function useChosenMark() {
  const [chosen, setChosen] = useState<(ChosenMark & { chartWidth: number }) | null>(null);
  useEffect(() => {
    if (!chosen) {
      return undefined;
    }
    const close = () => setChosen(null);
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [chosen]);
  return [chosen, setChosen] as const;
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

/** The navy box beside a chosen mark. Pointer only: screen readers have the chart's table. */
export function ChartDetails({
  lines,
  place,
}: {
  lines: { date: string; value: string; note?: string };
  place: ReturnType<typeof placeDetails>;
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
      {lines.note && <span className="text-caption tabular-nums">{lines.note}</span>}
    </div>
  );
}
