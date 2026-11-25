import { lazy, Suspense, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { PlusIcon, SettingsIcon } from "../components/icons.js";
import { button } from "../components/ui/forms/button.js";
import { Card, CardHeading, cardEdgeRows } from "../components/ui/layout/Card.js";
import { FloatingActions } from "../components/ui/layout/FloatingActions.js";
import { PageHeader } from "../components/ui/layout/PageHeader.js";
import { formatAppDay } from "../lib/format.js";
import { useIsDesktop } from "../lib/useIsDesktop.js";
import { AgePrompt } from "../pets/AgePrompt.js";
import { PetChip } from "../pets/PetChip.js";
import { usePets, type PetSummary } from "../pets/pets.js";
import { useSelectedPet } from "../pets/selectedPet.js";
import { WeightCard } from "../pets/WeightCard.js";
import { LogWeightButton, WeightSheetsProvider } from "../pets/WeightSheetsProvider.js";
import { useFoodCount } from "../stock/foods.js";
import { CaloriesCard } from "./CaloriesCard.js";
import { FeedRow } from "./FeedRow.js";
import { FeedSheetsProvider, useFeedSheets } from "./FeedSheetsProvider.js";
import { useDay, useDaySettings } from "./feeds.js";
import { FirstRun } from "./FirstRun.js";
import { LogFeedSheet } from "./LogFeedSheet.js";
import { useSwipeHint } from "./useSwipeHint.js";

// The charting library only loads where a chart is shown.
const ThisWeekCard = lazy(() => import("../insights/ThisWeekCard.js"));

const card = "bg-card inset-ring inset-ring-border";

function TodayFeeds({ pet, today }: { pet: PetSummary; today: string }) {
  const { t } = useTranslation();
  const { data: summary } = useDay(pet.id, today);
  const { data: settings } = useDaySettings();
  const sheets = useFeedSheets();
  const isDesktop = useIsDesktop();
  const entries = summary?.entries ?? [];
  const peek = useSwipeHint(entries.length > 0);

  if (!summary || !settings) {
    return null;
  }

  return (
    <div className="grid gap-5 desktop:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] desktop:items-start desktop:gap-6">
      <div className="flex min-w-0 flex-col gap-5 desktop:gap-6">
        <CaloriesCard
          eatenKcal={summary.eatenKcal}
          targetKcal={summary.targetKcal}
          byType={summary.byType}
        />
        {entries.length > 0 && (
          <Card>
            <CardHeading title={t("feed.feeds", { count: entries.length })} />
            <div className={cardEdgeRows}>
              {entries.map((entry, index) => (
                <FeedRow
                  key={entry.id}
                  entry={entry}
                  timeZone={settings.timeZone}
                  peek={peek && index === 0 && !isDesktop}
                  onOpen={() => sheets.open(entry, summary.day)}
                  onLogAgain={() => sheets.logAgain(entry)}
                  onDelete={() => sheets.remove(entry)}
                />
              ))}
            </div>
          </Card>
        )}
      </div>
      <div className="hidden min-w-0 flex-col gap-6 desktop:flex">
        {isDesktop && (
          <Suspense fallback={null}>
            <ThisWeekCard petId={pet.id} today={today} />
          </Suspense>
        )}
        <WeightCard petId={pet.id} />
      </div>
    </div>
  );
}

export function TodayScreen() {
  const { t, i18n } = useTranslation();
  const { data: pets } = usePets();
  const { data: foodCount } = useFoodCount();
  const { pet } = useSelectedPet();
  const [logging, setLogging] = useState(false);

  if (!pets || foodCount === undefined) {
    return null;
  }

  const date = (style: "short" | "long") =>
    formatAppDay(pets.today, i18n.language, { weekday: style, day: "numeric", month: style });
  // Logging needs something to log, so it waits for a pet and a food.
  const canLog = pet !== undefined && foodCount > 0;

  return (
    <WeightSheetsProvider petId={pet?.id}>
      <div className="flex flex-col desktop:gap-6">
        <PageHeader
          title={t("nav.today")}
          subtitle={
            <>
              <span className="text-sm text-muted-foreground desktop:hidden">{date("short")}</span>
              <span className="hidden text-[15px] text-muted-foreground desktop:inline">
                {date("long")}
              </span>
            </>
          }
          extra={
            <div className="flex items-center gap-2 desktop:gap-3">
              <PetChip />
              <Link
                to="/settings"
                aria-label={t("today.settings")}
                className={`${button.icon} ${card} desktop:hidden`}
              >
                <SettingsIcon />
              </Link>
            </div>
          }
        />
        <div className={`px-5 pt-1 desktop:p-0 ${canLog ? "pb-24" : "pb-5"}`}>
          {canLog ? (
            <FeedSheetsProvider petId={pet.id} today={pets.today}>
              <TodayFeeds pet={pet} today={pets.today} />
            </FeedSheetsProvider>
          ) : (
            <FirstRun pet={pet} />
          )}
        </div>
        {canLog && (
          <FloatingActions>
            <LogWeightButton className="hidden desktop:inline-flex" />
            <button type="button" className={button.floating} onClick={() => setLogging(true)}>
              <PlusIcon size={20} />
              {t("feed.logFeed")}
            </button>
          </FloatingActions>
        )}
        {pet && <AgePrompt petId={pet.id} petName={pet.name} />}
        {logging && <LogFeedSheet onClose={() => setLogging(false)} />}
      </div>
    </WeightSheetsProvider>
  );
}
