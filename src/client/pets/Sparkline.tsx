import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { appDayOf, type DaySettings } from "../../shared/app-day.js";
import { ChartDetails, placeDetails, useChosenMark } from "../insights/charts/ChartDetails.js";
import { formatAppDay, formatReadingKg } from "../lib/format.js";

/** How many of the latest readings a sparkline shows. */
export const SPARKLINE_READINGS = 6;

const WIDTH = 306;
const HEIGHT = 56;
/** The details box's height with its two lines, the day and the weight. */
const DETAILS_HEIGHT = 50;

/**
 * Weight readings, oldest first, as a small line with dots; hovering or
 * tapping a dot shows its day and weight. Full charts are on Insights.
 */
export function Sparkline({
  readings,
  label,
  daySettings,
}: {
  readings: { measuredAt: string; weightG: number }[];
  label: string;
  daySettings: DaySettings;
}) {
  const { t, i18n } = useTranslation();
  const box = useRef<HTMLDivElement>(null);
  const [chosen, setChosen] = useChosenMark();
  const weightsG = readings.map((reading) => reading.weightG);
  const low = Math.min(...weightsG);
  const span = Math.max(...weightsG) - low || 1;
  const points = weightsG.map((weightG, index) => ({
    x: 8 + (index * 290) / (weightsG.length - 1),
    y: 42 - ((weightG - low) / span) * 28,
  }));

  // The drawing keeps its proportions, centred in the box, so a dot's place
  // in pixels comes from the scale the box gave it.
  const choose = (index: number) => {
    const point = points[index];
    if (!box.current || !point) {
      return;
    }
    const { clientWidth: width, clientHeight: height } = box.current;
    const scale = Math.min(width / WIDTH, height / HEIGHT);
    setChosen({
      key: String(index),
      x: (width - WIDTH * scale) / 2 + point.x * scale,
      y: (height - HEIGHT * scale) / 2 + point.y * scale,
      width: 0,
      chartWidth: width,
    });
  };
  const reading = chosen && readings[Number(chosen.key)];

  return (
    <div ref={box} className="relative">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={label} className="h-14 w-full">
        <polyline
          points={points.map((point) => `${point.x},${point.y}`).join(" ")}
          fill="none"
          className="stroke-primary"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        {points.map((point, index) => (
          <g
            key={point.x}
            className="cursor-pointer"
            onMouseEnter={() => choose(index)}
            onMouseLeave={() => setChosen(null)}
            onClick={() => choose(index)}
          >
            <circle cx={point.x} cy={point.y} r="14" fill="transparent" />
            <circle cx={point.x} cy={point.y} r="3" className="fill-foreground" />
            {chosen?.key === String(index) && (
              <circle
                cx={point.x}
                cy={point.y}
                r="6"
                fill="none"
                className="stroke-foreground"
                strokeWidth="2"
              />
            )}
          </g>
        ))}
      </svg>
      {chosen && reading && (
        <ChartDetails
          lines={{
            date: formatAppDay(appDayOf(new Date(reading.measuredAt), daySettings), i18n.language, {
              weekday: "short",
              day: "numeric",
              month: "short",
            }),
            value: t("weight.reading", { weight: formatReadingKg(reading.weightG, i18n.language) }),
          }}
          place={placeDetails(chosen, chosen.chartWidth, HEIGHT, DETAILS_HEIGHT)}
        />
      )}
    </div>
  );
}
