import { useState } from "react";
import { useTranslation } from "react-i18next";
import { PageHeader } from "../components/ui/layout/PageHeader.js";
import { FeedSheetsProvider } from "../feeds/FeedSheetsProvider.js";
import { usePets } from "../pets/pets.js";
import { PetChip } from "../pets/PetChip.js";
import { useSelectedPet } from "../pets/selectedPet.js";
import { DayInsights } from "./DayInsights.js";
import { MonthInsights } from "./MonthInsights.js";
import type { Period, PeriodViewProps } from "./PeriodBar.js";
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
  // Per device, like the selected pet and the language.
  const [period, setPeriod] = useState(readPeriod);

  if (!pets || !pet) {
    return null;
  }
  const view: PeriodViewProps = {
    petId: pet.id,
    today: pets.today,
    onPeriod: (next) => {
      setPeriod(next);
      try {
        localStorage.setItem(PERIOD_KEY, next);
      } catch {
        // The period resets on the next visit; harmless.
      }
    },
  };
  return (
    <div className="flex flex-col gap-3.5 desktop:gap-6">
      <PageHeader title={t("nav.insights")} extra={<PetChip />} spaceBelow={false} />
      <div className="flex flex-col gap-3.5 px-5 pb-6 desktop:gap-6 desktop:p-0 desktop:pb-10">
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
