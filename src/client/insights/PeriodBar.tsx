import { useTranslation } from "react-i18next";
import { BackIcon, ChevronRightIcon } from "../components/icons.js";
import { Segmented } from "../components/ui/forms/Segmented.js";
import { formatAppDay, formatAppDayRange } from "../lib/format.js";
import { useIsDesktop } from "../lib/useIsDesktop.js";
import { periodSpan, type Period } from "./period.js";

/** What each period's view gets from the Insights screen. */
export interface PeriodViewProps {
  petId: number;
  today: string;
  /** A day in the period shown, from the address. */
  from: string;
}

const arrowLabels = {
  day: ["insights.previousDay", "insights.nextDay"],
  week: ["insights.previousWeek", "insights.nextWeek"],
  month: ["insights.previousMonth", "insights.nextMonth"],
} as const;

/**
 * The period switch and the arrows through periods. Insights shows one for
 * every period, so focus and the spoken label stay put when the period changes.
 */
export function PeriodBar({
  period,
  from,
  today,
  onPeriod,
  onFrom,
}: {
  period: Period;
  from: string;
  today: string;
  onPeriod: (period: Period) => void;
  /** Shows the period around another day. */
  onFrom: (day: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const isDesktop = useIsDesktop();
  const span = periodSpan(period, from, today);
  const [previousLabel, nextLabel] = arrowLabels[period];
  const label =
    period === "day"
      ? formatAppDay(span.start, i18n.language, {
          weekday: isDesktop ? "long" : "short",
          day: "numeric",
          month: isDesktop ? "long" : "short",
        })
      : period === "week"
        ? formatAppDayRange(span.start, span.end, i18n.language, {
            day: "numeric",
            month: "short",
          })
        : formatAppDay(span.start, i18n.language, { month: "long", year: "numeric" });

  return (
    <div className="flex flex-col gap-3 desktop:flex-row desktop:flex-wrap desktop:items-center desktop:justify-between desktop:gap-4">
      <div className="desktop:w-80">
        <Segmented
          label={t("insights.period")}
          hideLabel
          value={period}
          onChange={onPeriod}
          options={[
            { value: "day", label: t("insights.day") },
            { value: "week", label: t("insights.week") },
            { value: "month", label: t("insights.month") },
          ]}
        />
      </div>
      <div className="flex items-center justify-between desktop:gap-1">
        <button
          type="button"
          aria-label={t(previousLabel)}
          onClick={() => onFrom(span.previous)}
          className="flex size-11 cursor-pointer items-center justify-center rounded-full"
        >
          <BackIcon />
        </button>
        <span aria-live="polite" className="min-w-[120px] text-center text-[15px] font-semibold">
          {label}
        </span>
        {/* Not disabled, which would drop focus to the page on reaching the latest. */}
        <button
          type="button"
          aria-label={t(nextLabel)}
          aria-disabled={span.atLatest}
          onClick={() => {
            if (!span.atLatest) {
              onFrom(span.next);
            }
          }}
          className="flex size-11 cursor-pointer items-center justify-center rounded-full aria-disabled:cursor-default aria-disabled:text-border"
        >
          <ChevronRightIcon />
        </button>
      </div>
    </div>
  );
}
