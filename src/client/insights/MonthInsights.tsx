import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { NoValue } from "../components/Figures.js";
import { addDays, appDayOf } from "../../shared/app-day.js";
import { periodIntake, rollingAverage } from "../../shared/insights.js";
import { Card, CardHeading } from "../components/ui/layout/Card.js";
import { onTargetDays } from "../lib/dayStatus.js";
import { formatAppDay, formatInstantDay, formatKg } from "../lib/format.js";
import { targetOn, usePet } from "../pets/pets.js";
import { weightTrend } from "./weightTrend.js";
import { IntakeChart } from "./charts/IntakeChart.js";
import { WeightChart } from "./charts/WeightChart.js";
import type { PeriodViewProps } from "./PeriodBar.js";
import { periodSpan } from "./period.js";
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

export function MonthInsights({ petId, today, from }: PeriodViewProps) {
  const { t, i18n } = useTranslation();
  const { start, end, atLatest: isCurrentMonth } = periodSpan("month", from, today);
  const { data } = useInsights(petId, start, end, addDays(start, -7));
  const { data: pet } = usePet(petId);
  const { data: settings } = useSettings();
  const month = formatAppDay(start, i18n.language, { month: "long", year: "numeric" });

  if (!data || !pet || !settings) {
    return null;
  }

  const [intake] = periodIntake(data.days, "month", data.today);
  const { counted, onTarget } = onTargetDays(data.days, data.today);
  const lastDay = isCurrentMonth ? data.today : end;
  const targetRow = targetOn(pet, lastDay);
  const inMonth = rollingAverage(data.weights).filter((reading) => {
    const day = appDayOf(new Date(reading.at), settings);
    return day >= start && day <= end;
  });
  const latest = inMonth.at(-1);

  return (
    <>
      <div className="flex gap-3 desktop:grid desktop:grid-cols-4 desktop:gap-4">
        <AverageStat averageKcal={intake?.averageKcal ?? null} row={targetRow} />
        <TargetStat pet={pet} row={targetRow} />
        <Stat
          label={t("insights.onTarget")}
          value={counted === 0 ? <NoValue /> : onTarget}
          unit={t("insights.ofDays", { count: counted })}
          note={t("insights.within")}
        />
        <Stat
          className="hidden desktop:flex"
          label={t("insights.weight")}
          value={latest ? formatKg(latest.weightG, i18n.language) : <NoValue />}
          unit={t("common.kg")}
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
            daySettings={settings}
            height={150}
            label={t("insights.monthWeightLabel", { month })}
          />
        </Card>
      )}
    </>
  );
}
