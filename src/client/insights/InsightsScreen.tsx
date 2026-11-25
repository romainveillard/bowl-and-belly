import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";
import { PageHeader } from "../components/ui/layout/PageHeader.js";
import { FeedSheetsProvider } from "../feeds/FeedSheetsProvider.js";
import { usePets } from "../pets/pets.js";
import { PetChip } from "../pets/PetChip.js";
import { useSelectedPet } from "../pets/selectedPet.js";
import { DayInsights } from "./DayInsights.js";
import { MonthInsights } from "./MonthInsights.js";
import { PeriodBar, type PeriodViewProps } from "./PeriodBar.js";
import { insightsAddress, type Period } from "./period.js";
import { WeekInsights } from "./WeekInsights.js";

const PERIOD_KEY = "insightsPeriod";

function readPeriod(): Period {
  try {
    const stored = localStorage.getItem(PERIOD_KEY);
    return stored === "day" || stored === "month" ? stored : "week";
  } catch {
    return "week";
  }
}

export function InsightsScreen() {
  const { t } = useTranslation();
  const { data: pets } = usePets();
  const { pet } = useSelectedPet();
  // In the address, so a link or a reload shows the same view.
  const [search, setSearch] = useSearchParams();

  if (!pets || !pet) {
    return null;
  }
  // The default period is per device, like the selected pet and the language.
  const { period, from } = insightsAddress(search, pets.today, readPeriod());
  const show = (next: Period, day: string) =>
    setSearch(day === pets.today ? { period: next } : { period: next, from: day }, {
      // Back leaves Insights in one step, as it does any screen, rather than
      // stepping through every period viewed: on Android it is the way out.
      replace: true,
    });
  const choosePeriod = (next: Period) => {
    try {
      localStorage.setItem(PERIOD_KEY, next);
    } catch {
      // The default period resets on the next visit; harmless.
    }
    show(next, from);
  };
  const view: PeriodViewProps = { petId: pet.id, today: pets.today, from };
  return (
    <div className="flex flex-col gap-3.5 desktop:gap-6">
      <PageHeader title={t("nav.insights")} extra={<PetChip />} spaceBelow={false} />
      <div className="flex flex-col gap-3.5 px-5 pb-6 desktop:gap-6 desktop:p-0 desktop:pb-10">
        <PeriodBar
          period={period}
          from={from}
          today={pets.today}
          onPeriod={choosePeriod}
          onFrom={(day) => show(period, day)}
        />
        {period === "day" && (
          <FeedSheetsProvider key={pet.id} petId={pet.id} today={view.today}>
            <DayInsights {...view} />
          </FeedSheetsProvider>
        )}
        {period === "week" && <WeekInsights key={pet.id} {...view} />}
        {period === "month" && <MonthInsights key={pet.id} {...view} />}
      </div>
    </div>
  );
}
