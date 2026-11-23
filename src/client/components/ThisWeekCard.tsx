import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { addDays } from "../../shared/app-day.js";
import { weekStart } from "../../shared/insights.js";
import { useInsights } from "../lib/insights.js";
import { IntakeChart } from "./charts/IntakeChart.js";

/** This week's intake on desktop Today, linking to Insights. Loaded on demand, with the charts. */
export default function ThisWeekCard({ petId, today }: { petId: number; today: string }) {
  const { t } = useTranslation();
  const start = weekStart(today);
  const { data } = useInsights(petId, start, addDays(start, 6));

  if (!data) {
    return null;
  }
  return (
    <section className="flex flex-col gap-4 rounded-[14px] bg-card p-[22px] inset-ring inset-ring-border">
      <div className="flex items-baseline justify-between">
        <h2 className="text-base font-semibold">{t("today.thisWeek")}</h2>
        <Link to="/insights" className="text-sm font-semibold">
          {t("today.insightsLink")}
        </Link>
      </div>
      <IntakeChart
        days={data.days}
        today={data.today}
        label={t("today.thisWeek")}
        legend={false}
        height={150}
      />
    </section>
  );
}
