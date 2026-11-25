import { useEffect, useRef, useState } from "react";
import { List } from "../components/ui/layout/List.js";
import { useTranslation } from "react-i18next";
import { FeedRow } from "./FeedRow.js";
import { FoodTypeTile } from "../stock/FoodTypeMark.js";
import { EmptyState } from "../components/EmptyState.js";
import { ChevronDownIcon, HistoryIcon, PlusIcon } from "../components/icons.js";
import { PetChip } from "../pets/PetChip.js";
import { Badge } from "../components/ui/feedback/Badge.js";
import { ProgressBar } from "../components/ui/feedback/ProgressBar.js";
import { FloatingActions } from "../components/ui/layout/FloatingActions.js";
import { PageHeader } from "../components/ui/layout/PageHeader.js";
import { button } from "../components/ui/forms/button.js";
import { dayStatus, isOverTarget } from "../lib/dayStatus.js";
import { useHistory, type DaySummary, type FeedEntry } from "./feeds.js";
import { foodTypeLabel } from "../stock/foods.js";
import { formatAppDay } from "../lib/format.js";
import { usePets } from "../pets/pets.js";
import { useFoodCount } from "../stock/foods.js";
import { useSelectedPet } from "../pets/selectedPet.js";
import { FeedSheetsProvider, useFeedSheets } from "./FeedSheetsProvider.js";
import { LogFeedSheet } from "./LogFeedSheet.js";
import { LogWeightButton, WeightSheetsProvider } from "../pets/WeightSheetsProvider.js";
import { useSettings } from "../settings/settings.js";

const typeBackground = { wet: "bg-wet-soft", dry: "bg-dry-soft", custom: "bg-background" };

interface DayCardProps {
  summary: DaySummary;
  today: string;
  timeZone: string;
  expanded: boolean;
  onToggle: () => void;
  onOpen: (entry: FeedEntry) => void;
  onLogAgain: (entry: FeedEntry) => void;
  onDelete: (entry: FeedEntry) => void;
}

function DayCard({
  summary,
  today,
  timeZone,
  expanded,
  onToggle,
  onOpen,
  onLogAgain,
  onDelete,
}: DayCardProps) {
  const { t, i18n } = useTranslation();
  const status = dayStatus(summary, today);
  const percent = summary.targetKcal
    ? Math.round((summary.eatenKcal / summary.targetKcal) * 100)
    : 0;
  const isToday = summary.day === today;
  const date = formatAppDay(summary.day, i18n.language, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  return (
    <List>
      <button
        type="button"
        aria-expanded={expanded}
        onClick={onToggle}
        className="flex w-full cursor-pointer flex-col gap-2 px-4 py-3.5 text-left desktop:px-[22px] desktop:py-4"
      >
        <span className="flex w-full items-center justify-between gap-2">
          <span className="text-[15px] font-semibold">
            {isToday ? t("history.today", { date }) : date}
          </span>
          <span
            className={`flex text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`}
          >
            <ChevronDownIcon size={20} />
          </span>
        </span>
        <span className="flex w-full items-center justify-between gap-2">
          <span className="flex items-baseline gap-1 tabular-nums">
            <span className="font-display text-title font-semibold">{summary.eatenKcal}</span>
            <span className="text-[13px] text-muted-foreground">
              {summary.targetKcal === null
                ? t("common.kcal")
                : t("common.ofTarget", { target: summary.targetKcal })}
            </span>
          </span>
          {status === "soFar" && <Badge tone="neutral">{t("history.soFar")}</Badge>}
          {status === "onTarget" && <Badge tone="success">{t("history.onTarget")}</Badge>}
        </span>
        {summary.targetKcal !== null && (
          <ProgressBar
            percent={percent}
            tone={
              isToday
                ? "soFar"
                : isOverTarget(summary.eatenKcal, summary.targetKcal)
                  ? "over"
                  : "default"
            }
            label={t("history.progress", { percent })}
            className="h-1.5 w-full"
          />
        )}
      </button>
      {expanded && summary.entries.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-2 px-4 pb-3.5 desktop:px-[22px]">
            {summary.byType.map((total) => (
              <div
                key={total.type.id}
                className={`flex items-center gap-2.5 rounded-[10px] p-2.5 ${typeBackground[total.type.systemKey ?? "custom"]}`}
              >
                <span className="scale-80">
                  <FoodTypeTile type={total.type} />
                </span>
                <span className="flex flex-col tabular-nums">
                  <span className="text-sm font-semibold">
                    {total.kcal} {t("common.kcal")}
                  </span>
                  <span className="text-caption text-muted-foreground">
                    {t("history.byType", {
                      type: foodTypeLabel(total.type, t),
                      grams: total.eatenG,
                    })}
                  </span>
                </span>
              </div>
            ))}
          </div>
          <div className="border-t border-border">
            {summary.entries.map((entry) => (
              <FeedRow
                key={entry.id}
                entry={entry}
                timeZone={timeZone}
                onOpen={() => onOpen(entry)}
                onLogAgain={() => onLogAgain(entry)}
                onDelete={() => onDelete(entry)}
              />
            ))}
          </div>
        </>
      )}
    </List>
  );
}

export function HistoryScreen() {
  const { t } = useTranslation();
  const { data: pets } = usePets();
  const { data: foodCount } = useFoodCount();
  const { data: settings } = useSettings();
  const { pet } = useSelectedPet();
  const history = useHistory(pet?.id, pets?.today);
  const [toggled, setToggled] = useState<Record<string, boolean>>({});
  const [logging, setLogging] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = history;

  // Older days load as the end of the list comes into view.
  useEffect(() => {
    const target = end.current;
    if (!target || !hasNextPage || typeof IntersectionObserver === "undefined") {
      return undefined;
    }
    const observer = new IntersectionObserver((seen) => {
      if (seen.some((entry) => entry.isIntersecting) && !isFetchingNextPage) {
        void fetchNextPage();
      }
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  if (!pets || !settings || !pet || !history.data) {
    return null;
  }

  const days = history.data.pages.flatMap((page) => page.days);
  const logFeedSheet = logging && <LogFeedSheet onClose={() => setLogging(false)} />;
  if (days.every((summary) => summary.entries.length === 0) && !history.hasNextPage) {
    return (
      <>
        <EmptyState
          heading={t("nav.history")}
          icon={<HistoryIcon size={30} />}
          title={t("history.noFeedsTitle")}
          body={t("history.noFeedsBody", { name: pet.name })}
          action={
            (foodCount ?? 0) > 0
              ? { label: t("feed.logFeed"), onClick: () => setLogging(true) }
              : { label: t("today.addFood"), to: "/stock/new" }
          }
        />
        {logFeedSheet}
      </>
    );
  }
  // The latest finished day opens by default: today's feeds are already on Today.
  const openByDefault = days.find((summary) => summary.day !== pets.today)?.day;
  const isExpanded = (day: string) => toggled[day] ?? day === openByDefault;

  return (
    <FeedSheetsProvider petId={pet.id} today={pets.today}>
      <WeightSheetsProvider petId={pet.id}>
        <div className="flex flex-col desktop:gap-6">
          <PageHeader title={t("nav.history")} extra={<PetChip />} />
          <div className="flex flex-col gap-2.5 px-5 pt-1 pb-6 desktop:max-w-[720px] desktop:gap-3 desktop:p-0 desktop:pb-24">
            <HistoryDays
              days={days}
              today={pets.today}
              timeZone={settings.timeZone}
              isExpanded={isExpanded}
              onToggle={(day) => setToggled((current) => ({ ...current, [day]: !isExpanded(day) }))}
            />
            <div ref={end} />
          </div>

          {/* On a phone, History has no floating buttons: logging happens on Today. */}
          <FloatingActions className="hidden desktop:flex">
            <LogWeightButton />
            {(foodCount ?? 0) > 0 && (
              <button type="button" className={button.floating} onClick={() => setLogging(true)}>
                <PlusIcon size={20} />
                {t("feed.logFeed")}
              </button>
            )}
          </FloatingActions>
          {logFeedSheet}
        </div>
      </WeightSheetsProvider>
    </FeedSheetsProvider>
  );
}

/** The day cards, whose feed rows open the feed sheets. */
function HistoryDays({
  days,
  today,
  timeZone,
  isExpanded,
  onToggle,
}: {
  days: DaySummary[];
  today: string;
  timeZone: string;
  isExpanded: (day: string) => boolean;
  onToggle: (day: string) => void;
}) {
  const sheets = useFeedSheets();

  return days.map((summary) => (
    <DayCard
      key={summary.day}
      summary={summary}
      today={today}
      timeZone={timeZone}
      expanded={isExpanded(summary.day)}
      onToggle={() => onToggle(summary.day)}
      onOpen={(entry) => sheets.open(entry, summary.day)}
      onLogAgain={sheets.logAgain}
      onDelete={sheets.remove}
    />
  ));
}
