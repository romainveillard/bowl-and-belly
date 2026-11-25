import type { TFunction } from "i18next";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { addDays, addMonths } from "../../shared/app-day.js";
import { periodIntake, rollingAverage } from "../../shared/insights.js";
import { Card, CardHeading } from "../components/ui/layout/Card.js";
import { dayStatus } from "../lib/dayStatus.js";
import { formatAppDay, formatDateInput, formatInstantDay, formatKg } from "../lib/format.js";
import { targetOn, usePet } from "../pets/pets.js";
import { weightTrend } from "../pets/weightTrend.js";
import { IntakeChart } from "./charts/IntakeChart.js";
import { WeightChart } from "./charts/WeightChart.js";
import { PeriodBar, type PeriodViewProps } from "./PeriodBar.js";
import { AverageStat, Stat, TargetStat } from "./Stat.js";
import { useInsights } from "./useInsights.js";
import { useSettings } from "../settings/settings.js";

/** "Steady this month", or how far the rolling average moved over the month's readings. */
function trendNote(averagesG: number[], locale: string, t: TFunction): string | undefined {
  const trend = weightTrend(averagesG);
  if (!trend) {
    return undefined;
  }
  if (trend.direction === "steady") {
    return t("insights.steady");
  }
  const weight = formatKg(trend.changeG, locale);
  return t(trend.direction === "up" ? "insights.up" : "insights.down", { weight });
}

export function MonthInsights({ petId, today, onPeriod }: PeriodViewProps) {
  const { t, i18n } = useTranslation();
  const [start, setStart] = useState(() => `${today.slice(0, 7)}-01`);
  const next = addMonths(start, 1);
  const end = addDays(next, -1);
  const { data } = useInsights(petId, start, end, addDays(start, -7));
  const { data: pet } = usePet(petId);
  const { data: settings } = useSettings();
  const isCurrentMonth = start === `${today.slice(0, 7)}-01`;
  const month = formatAppDay(start, i18n.language, { month: "long", year: "numeric" });

  const bar = (
    <PeriodBar
      period="month"
      onPeriod={onPeriod}
      label={month}
      previousLabel={t("insights.previousMonth")}
      nextLabel={t("insights.nextMonth")}
      onPrevious={() => setStart(addMonths(start, -1))}
      onNext={() => setStart(next)}
      atLatest={isCurrentMonth}
    />
  );
  if (!data || !pet || !settings) {
    return bar;
  }

  const [intake] = periodIntake(data.days, "month", data.today);
  const counted = data.days.filter(
    (day) => day.fed && day.day < data.today && day.targetKcal !== null,
  );
  const onTarget = counted.filter((day) => dayStatus(day, data.today) === "onTarget");
  const lastDay = isCurrentMonth ? data.today : end;
  const targetRow = targetOn(pet, lastDay);
  const inMonth = rollingAverage(data.weights).filter((reading) => {
    const day = formatDateInput(new Date(reading.at), settings.timeZone);
    return day >= start && day <= end;
  });
  const latest = inMonth.at(-1);

  return (
    <>
      {bar}
      <div className="flex gap-3 desktop:grid desktop:grid-cols-4 desktop:gap-4">
        <AverageStat averageKcal={intake?.averageKcal ?? null} row={targetRow} />
        <TargetStat pet={pet} row={targetRow} />
        <Stat
          label={t("insights.onTarget")}
          value={counted.length === 0 ? "–" : onTarget.length}
          unit={t("insights.ofDays", { count: counted.length })}
          note={t("insights.within")}
        />
        <Stat
          className="hidden desktop:flex"
          label={t("insights.weight")}
          value={latest ? formatKg(latest.weightG, i18n.language) : "–"}
          unit={t("weight.kg")}
          note={
            trendNote(
              inMonth.map((reading) => reading.averageG),
              i18n.language,
              t,
            ) ??
            (latest &&
              t("insights.lastWeighed", {
                date: formatInstantDay(new Date(latest.at), settings, pet.today, i18n.language),
              }))
          }
        />
      </div>

      <Card>
        <CardHeading title={t("insights.calories")} hint={t("insights.oneBarPerDay")} />
        <IntakeChart
          days={data.days}
          today={data.today}
          axis="monthDay"
          height={180}
          label={t("insights.monthLabel", { month })}
        />
      </Card>

      {inMonth.length > 0 && (
        <Card>
          <CardHeading
            title={t("insights.weightChart")}
            hint={t("insights.weighIns", { count: inMonth.length })}
          />
          <WeightChart
            readings={data.weights}
            from={start}
            to={end}
            tickEvery={7}
            timeZone={settings.timeZone}
            height={150}
            label={t("insights.monthWeightLabel", { month })}
          />
        </Card>
      )}
    </>
  );
}
