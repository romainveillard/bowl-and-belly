import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { addDays } from "../../shared/app-day.js";
import { weekStart } from "../../shared/insights.js";
import { useInsights } from "./useInsights.js";
import { IntakeChart } from "./charts/IntakeChart.js";
import { Card, CardHeading } from "../components/ui/layout/Card.js";

/** This week's intake on desktop Today, linking to Insights. Loaded on demand, with the charts. */
export default function ThisWeekCard({ petId, today }: { petId: number; today: string }) {
  const { t } = useTranslation();
  const start = weekStart(today);
  const { data } = useInsights(petId, start, addDays(start, 6));

  if (!data) {
    return null;
  }
  return (
    <Card>
      <CardHeading
        title={t("today.thisWeek")}
        action={
          <Link to="/insights" className="text-sm font-semibold">
            {t("today.insightsLink")}
          </Link>
        }
      />
      <IntakeChart
        days={data.days}
        today={data.today}
        label={t("today.thisWeek")}
        legend={false}
        height={150}
      />
    </Card>
  );
}
