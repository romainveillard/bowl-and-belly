import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FeedRow } from "../components/FeedRow.js";
import { FoodTypeTile } from "../components/FoodTypeMark.js";
import { EmptyState } from "../components/EmptyState.js";
import { ChevronDownIcon, HistoryIcon, PlusIcon } from "../components/icons.js";
import { PetChip } from "../components/PetChip.js";
import { button } from "../components/ui/forms/button.js";
import { dayStatus } from "../lib/dayStatus.js";
import { useDaySettings, useHistory, type DaySummary, type FeedEntry } from "../lib/feeds.js";
import { foodTypeLabel } from "../lib/foods.js";
import { formatAppDay } from "../lib/format.js";
import { useFoodCount, usePets } from "../lib/pets.js";
import { useSelectedPet } from "../lib/selectedPet.js";
import { useFeedSheets } from "./FeedSheets.js";
import { LogFeedSheet } from "./LogFeedSheet.js";
import { useWeightSheets } from "./WeightSheets.js";

const typeBackground = { wet: "bg-[#F2F7FF]", dry: "bg-[#FFF6EE]", custom: "bg-background" };

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
    <div className="overflow-hidden rounded-xl bg-card inset-ring inset-ring-border desktop:rounded-[14px]">
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
                ? t("pets.kcal")
                : t("pets.ofTarget", { target: summary.targetKcal })}
            </span>
          </span>
          {status === "soFar" && (
            <span className="inline-flex h-[22px] items-center rounded-full bg-muted px-2 text-caption font-semibold text-muted-foreground">
              {t("history.soFar")}
            </span>
          )}
          {status === "onTarget" && (
            <span className="inline-flex h-[22px] items-center rounded-full bg-success-soft px-2 text-caption font-semibold text-success">
              {t("history.onTarget")}
            </span>
          )}
        </span>
        {summary.targetKcal !== null && (
          <span
            role="img"
            aria-label={t("history.progress", { percent })}
            className="relative block h-1.5 w-full rounded-full bg-muted"
          >
            <span
              className={`absolute inset-y-0 left-0 rounded-full ${isToday ? "bg-accent" : percent > 100 ? "bg-primary-strong" : "bg-primary"}`}
              style={{ width: `${Math.min(percent, 100)}%` }}
            />
          </span>
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
                    {total.kcal} {t("feed.kcal")}
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
    </div>
  );
}

export function HistoryScreen() {
  const { t } = useTranslation();
  const { data: pets } = usePets();
  const { data: foodCount } = useFoodCount();
  const { data: settings } = useDaySettings();
  const { pet } = useSelectedPet();
  const history = useHistory(pet?.id, pets?.today);
  const sheets = useFeedSheets(pet?.id ?? 0, pets?.today ?? "", settings?.timeZone ?? "UTC");
  const [toggled, setToggled] = useState<Record<string, boolean>>({});
  const [logging, setLogging] = useState(false);
  const weightSheets = useWeightSheets(pet?.id);
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
    <div className="flex flex-col desktop:gap-6">
      <header className="flex items-center justify-between gap-4 px-5 pt-5 pb-3 desktop:p-0">
        <h1 className="font-display text-display font-semibold desktop:text-[34px] desktop:leading-10">
          {t("nav.history")}
        </h1>
        <PetChip />
      </header>
      <div className="flex flex-col gap-2.5 px-5 pt-1 pb-6 desktop:max-w-[720px] desktop:gap-3 desktop:p-0 desktop:pb-24">
        {days.map((summary) => (
          <DayCard
            key={summary.day}
            summary={summary}
            today={pets.today}
            timeZone={settings.timeZone}
            expanded={isExpanded(summary.day)}
            onToggle={() =>
              setToggled((current) => ({ ...current, [summary.day]: !isExpanded(summary.day) }))
            }
            onOpen={(entry) => sheets.open(entry, summary.day)}
            onLogAgain={sheets.logAgain}
            onDelete={sheets.remove}
          />
        ))}
        <div ref={end} />
      </div>

      <div className="fixed right-8 bottom-8 hidden items-center gap-2.5 desktop:flex">
        <button type="button" className={button.floatingSecondary} onClick={weightSheets.openLog}>
          <PlusIcon size={18} />
          {t("logWeight.button")}
        </button>
        {(foodCount ?? 0) > 0 && (
          <button type="button" className={button.floating} onClick={() => setLogging(true)}>
            <PlusIcon size={20} />
            {t("feed.logFeed")}
          </button>
        )}
      </div>
      {weightSheets.ui}
      {logFeedSheet}
      {sheets.sheet}
    </div>
  );
}
