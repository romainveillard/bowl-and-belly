import { useState } from "react";
import { useTranslation } from "react-i18next";
import { addDays, appDayStart } from "../../shared/app-day.js";
import { Card, CardHeading, cardEdgeRows } from "../components/ui/layout/Card.js";
import { FeedRow } from "../feeds/FeedRow.js";
import { useFeedSheets } from "../feeds/FeedSheetsProvider.js";
import { useDay } from "../feeds/feeds.js";
import { isOnTarget } from "../lib/dayStatus.js";
import { formatAppDay, formatTime } from "../lib/format.js";
import { useIsDesktop } from "../lib/useIsDesktop.js";
import { targetOn, usePet } from "../pets/pets.js";
import { foodTypeLabel } from "../stock/foods.js";
import { DayChart } from "./charts/DayChart.js";
import { PeriodBar, type PeriodViewProps } from "./PeriodBar.js";
import { Stat, TargetStat } from "./Stat.js";
import { useSettings } from "../settings/settings.js";

/** One day's intake and feeds, inside a FeedSheetsProvider. */
export function DayInsights({ petId, today, onPeriod }: PeriodViewProps) {
  const { t, i18n } = useTranslation();
  const [day, setDay] = useState(today);
  const [openedAt] = useState(() => Date.now());
  const isDesktop = useIsDesktop();
  const { data: summary, isPending } = useDay(petId, day);
  const { data: pet } = usePet(petId);
  const { data: settings } = useSettings();
  const sheets = useFeedSheets();
  const format = (weekday: "short" | "long") =>
    formatAppDay(day, i18n.language, { weekday, day: "numeric", month: weekday });

  const bar = (
    <PeriodBar
      period="day"
      onPeriod={onPeriod}
      label={format(isDesktop ? "long" : "short")}
      previousLabel={t("insights.previousDay")}
      nextLabel={t("insights.nextDay")}
      onPrevious={() => setDay(addDays(day, -1))}
      onNext={() => setDay(addDays(day, 1))}
      atLatest={day === today}
    />
  );
  if (isPending || !pet || !settings) {
    return bar;
  }

  // A past day without feeds has no summary, but still had a target.
  const targetRow = targetOn(pet, day);
  const targetKcal = summary ? summary.targetKcal : (targetRow?.kcalPerDay ?? null);
  const eatenKcal = summary?.eatenKcal ?? 0;
  const entries = (summary?.entries ?? []).toReversed();
  const byType = summary?.byType ?? [];
  const lastFeed = entries.at(-1);
  let eatenNote: string | undefined;
  if (targetKcal !== null) {
    eatenNote =
      // The same 5% band as History and Month.
      isOnTarget(eatenKcal, targetKcal)
        ? t("insights.dayOnTarget")
        : eatenKcal < targetKcal
          ? t("insights.underTarget", { kcal: targetKcal - eatenKcal })
          : t("insights.overTarget", { kcal: eatenKcal - targetKcal });
  }
  const split = byType
    .map((total) => t("feed.split", { type: foodTypeLabel(total.type, t), kcal: total.kcal }))
    .join(" · ");

  return (
    <>
      {bar}
      <div className="flex gap-3 desktop:grid desktop:grid-cols-4 desktop:gap-4">
        <Stat
          label={t("insights.eaten")}
          value={eatenKcal}
          unit={t("feed.kcal")}
          note={eatenNote}
        />
        <TargetStat pet={pet} row={targetRow} kcal={targetKcal} />
        <Stat
          label={t("insights.feeds")}
          value={entries.length}
          note={
            <>
              <span className="desktop:hidden">{split && `${split} ${t("feed.kcal")}`}</span>
              <span className="hidden desktop:inline">
                {lastFeed &&
                  t("insights.lastAt", {
                    time: formatTime(lastFeed.fedAt, settings.timeZone, i18n.language),
                  })}
              </span>
            </>
          }
        />
        <Stat
          className="hidden desktop:flex"
          label={t("insights.wetDry")}
          value={byType.length === 0 ? "–" : byType.map((total) => total.kcal).join(" / ")}
          unit={t("feed.kcal")}
          note={byType.map((total) => `${total.eatenG} g`).join(" / ")}
        />
      </div>

      <Card>
        <CardHeading
          title={t("insights.throughDay")}
          hint={t("insights.dayStartsAt", { time: settings.dayStartsAt })}
        />
        <DayChart
          entries={entries}
          start={appDayStart(day, settings).getTime()}
          end={appDayStart(addDays(day, 1), settings).getTime()}
          targetKcal={targetKcal}
          timeZone={settings.timeZone}
          now={openedAt}
          label={t("insights.dayLabel", { date: format("long"), kcal: eatenKcal })}
        />
      </Card>

      <Card>
        <CardHeading title={t("insights.feedList")} />
        {entries.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">{t("insights.noFeedsDay")}</p>
        ) : (
          <div className={cardEdgeRows}>
            {entries.map((entry) => (
              <FeedRow
                key={entry.id}
                entry={entry}
                timeZone={settings.timeZone}
                onOpen={() => sheets.open(entry, day)}
                onLogAgain={() => sheets.logAgain(entry)}
                onDelete={() => sheets.remove(entry)}
              />
            ))}
          </div>
        )}
      </Card>
    </>
  );
}
