import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { BowlIcon, CheckIcon, LogoMark, PlusIcon, SettingsIcon } from "../components/icons.js";
import { FeedRow } from "../components/FeedRow.js";
import { PetChip } from "../components/PetChip.js";
import { WeightCard } from "../components/WeightCard.js";
import { button } from "../components/ui/button.js";
import { useDay, useDaySettings, type DaySummary } from "../lib/feeds.js";
import { foodTypeLabel } from "../lib/foods.js";
import { useFoodCount, usePets, type PetSummary } from "../lib/pets.js";
import { useSelectedPet } from "../lib/selectedPet.js";
import { useIsDesktop } from "../lib/useIsDesktop.js";
import { useFeedSheets } from "./FeedSheets.js";
import { AgePrompt } from "./AgePrompt.js";
import { LogFeedSheet } from "./LogFeedSheet.js";
import { useWeightSheets } from "./WeightSheets.js";

const card = "bg-card inset-ring inset-ring-border";

function GettingStarted({ petAdded }: { petAdded: boolean }) {
  const { t } = useTranslation();
  const steps = [
    { label: t("today.stepPet"), state: petAdded ? "done" : "current" },
    { label: t("today.stepFood"), state: petAdded ? "current" : "next" },
  ];

  return (
    <ol aria-label={t("today.gettingStarted")} className="flex flex-col gap-3">
      {steps.map((step, index) => (
        <li
          key={step.label}
          aria-current={step.state === "current" ? "step" : undefined}
          className="flex items-center gap-3"
        >
          {step.state === "done" ? (
            <span
              aria-hidden="true"
              className="flex size-7 flex-none items-center justify-center rounded-full bg-success-soft text-success"
            >
              <CheckIcon size={16} />
            </span>
          ) : (
            <span
              aria-hidden="true"
              className={`flex size-7 flex-none items-center justify-center rounded-full text-sm font-semibold ${step.state === "current" ? "bg-primary" : "text-muted-foreground inset-ring-[1.5px] inset-ring-[#B9BFCB]"}`}
            >
              {index + 1}
            </span>
          )}
          <span
            className={`text-[15px] ${step.state === "current" ? "font-semibold" : "text-muted-foreground"}`}
          >
            {step.state === "done" && <span className="sr-only">{t("today.stepDone")} </span>}
            {step.label}
          </span>
        </li>
      ))}
    </ol>
  );
}

function NoPets() {
  const { t } = useTranslation();

  return (
    <div className="grid gap-4 desktop:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] desktop:items-start desktop:gap-6">
      <section
        className={`${card} flex flex-col items-center gap-3 rounded-2xl px-[22px] pt-8 pb-[26px] text-center desktop:gap-3.5 desktop:px-10 desktop:pt-12 desktop:pb-10`}
      >
        <span className="desktop:hidden">
          <LogoMark width={110} />
        </span>
        <span className="hidden desktop:block">
          <LogoMark width={140} />
        </span>
        <h2 className="mt-1.5 font-display text-[26px] leading-8 font-semibold desktop:text-[30px] desktop:leading-9">
          {t("today.welcomeTitle")}
        </h2>
        <p className="text-[15px] leading-[22px] text-muted-foreground desktop:max-w-[420px] desktop:text-base desktop:leading-6">
          {t("today.welcomeBody")}
        </p>
        <Link
          to="/pets/new"
          className={`${button.primaryLarge} mt-1.5 desktop:mt-2 desktop:w-auto desktop:rounded-full desktop:px-[26px]`}
        >
          <PlusIcon size={20} />
          {t("today.addFirstPet")}
        </Link>
      </section>
      <section
        className={`${card} flex flex-col gap-3.5 rounded-xl p-[18px] desktop:gap-4 desktop:rounded-[14px] desktop:p-[22px]`}
      >
        <h2 className="text-caption font-medium tracking-[0.6px] text-muted-foreground uppercase desktop:text-base desktop:font-semibold desktop:tracking-normal desktop:text-foreground desktop:normal-case">
          {t("today.gettingStarted")}
        </h2>
        <GettingStarted petAdded={false} />
      </section>
    </div>
  );
}

function CaloriesCard({
  eatenKcal,
  targetKcal,
  byType,
}: {
  eatenKcal: number;
  targetKcal: number | null;
  byType: DaySummary["byType"];
}) {
  const { t } = useTranslation();
  const percent = targetKcal ? Math.round((eatenKcal / targetKcal) * 100) : 0;
  const over = targetKcal !== null && eatenKcal > targetKcal;

  return (
    <section
      aria-label={t("today.caloriesLabel")}
      className={`${card} flex flex-col gap-3 rounded-xl p-[18px] desktop:gap-4 desktop:rounded-[14px] desktop:p-[22px]`}
    >
      <h2 className="hidden text-base font-semibold desktop:block">{t("today.caloriesToday")}</h2>
      <span className="flex items-baseline gap-2 tabular-nums">
        <span className="font-display text-4xl leading-10 font-semibold desktop:text-[44px] desktop:leading-[48px]">
          {eatenKcal}
        </span>
        <span className="text-base text-muted-foreground desktop:text-heading">
          {targetKcal === null ? t("pets.kcal") : t("pets.ofTarget", { target: targetKcal })}
        </span>
      </span>
      {targetKcal !== null && (
        <span
          role="img"
          aria-label={t("pets.progress", { percent })}
          className="relative block h-2.5 rounded-full bg-muted desktop:h-3"
        >
          <span
            className={`absolute inset-y-0 left-0 rounded-full ${over ? "bg-primary-strong" : "bg-primary"}`}
            style={{ width: `${Math.min(percent, 100)}%` }}
          />
        </span>
      )}
      {byType.length === 0 ? (
        <span className="text-[13px] text-muted-foreground desktop:text-sm">
          {t("today.noFeeds")}
        </span>
      ) : (
        <span className="flex justify-between gap-3 text-[13px] text-muted-foreground tabular-nums desktop:text-sm">
          <span className={over ? "font-semibold text-warning" : ""}>
            {targetKcal !== null &&
              (over
                ? t("feed.kcalOver", { kcal: eatenKcal - targetKcal })
                : t("feed.kcalLeft", { kcal: targetKcal - eatenKcal }))}
          </span>
          <span>
            {byType
              .map((total) =>
                t("feed.split", { type: foodTypeLabel(total.type, t), kcal: total.kcal }),
              )
              .join(" · ")}
          </span>
        </span>
      )}
    </section>
  );
}

const SWIPE_HINT_KEY = "swipeHintShown";

function swipeHintShown(): boolean {
  try {
    return localStorage.getItem(SWIPE_HINT_KEY) !== null;
  } catch {
    return true;
  }
}

function TodayFeeds({ pet, today }: { pet: PetSummary; today: string }) {
  const { t } = useTranslation();
  const { data: summary } = useDay(pet.id, today);
  const { data: settings } = useDaySettings();
  const sheets = useFeedSheets(pet.id, today, settings?.timeZone ?? "UTC");
  const isDesktop = useIsDesktop();
  const [peek] = useState(() => !swipeHintShown());
  const entries = summary?.entries ?? [];

  useEffect(() => {
    if (entries.length > 0) {
      try {
        localStorage.setItem(SWIPE_HINT_KEY, "1");
      } catch {
        // The hint shows again next time; harmless.
      }
    }
  }, [entries.length]);

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
          <section className="flex flex-col gap-2.5 desktop:gap-4 desktop:rounded-[14px] desktop:bg-card desktop:pt-[22px] desktop:inset-ring desktop:inset-ring-border">
            <h2 className="text-caption font-medium tracking-[0.6px] text-muted-foreground uppercase desktop:px-[22px] desktop:text-base desktop:font-semibold desktop:tracking-normal desktop:text-foreground desktop:normal-case">
              {t("feed.feeds", { count: entries.length })}
            </h2>
            <div
              className={`${card} overflow-hidden rounded-xl desktop:rounded-t-none desktop:rounded-b-[14px] desktop:border-t desktop:border-border desktop:inset-ring-0`}
            >
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
          </section>
        )}
      </div>
      <div className="hidden min-w-0 flex-col gap-6 desktop:flex">
        <WeightCard petId={pet.id} />
      </div>
      {sheets.sheet}
    </div>
  );
}

function NoFoods({ pet }: { pet: PetSummary }) {
  const { t } = useTranslation();

  return (
    <div className="grid gap-4 desktop:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] desktop:items-start desktop:gap-6">
      <CaloriesCard eatenKcal={0} targetKcal={pet.targetKcal} byType={[]} />
      <section
        className={`${card} flex flex-col gap-3.5 rounded-2xl p-5 desktop:gap-4 desktop:p-6`}
      >
        <div className="flex items-center gap-3.5">
          <span
            aria-hidden="true"
            className="flex size-[52px] flex-none items-center justify-center rounded-[14px] bg-accent-soft text-primary-strong desktop:size-14"
          >
            <BowlIcon size={26} />
          </span>
          <h2 className="font-display text-xl font-semibold desktop:text-title">
            {t("today.addFoodTitle")}
          </h2>
        </div>
        <p className="text-[15px] leading-[22px] text-muted-foreground">
          <span className="desktop:hidden">{t("today.addFoodBody")}</span>
          <span className="hidden desktop:inline">{t("today.addFoodBodyDesktop")}</span>
        </p>
        <Link
          to="/stock/new"
          className={`${button.primaryLarge} desktop:h-12 desktop:w-auto desktop:self-start desktop:rounded-full desktop:px-[22px] desktop:text-[15px]`}
        >
          <PlusIcon size={20} />
          {t("today.addFood")}
        </Link>
        <div className="h-px bg-border" />
        <GettingStarted petAdded />
      </section>
    </div>
  );
}

export function TodayScreen() {
  const { t, i18n } = useTranslation();
  const { data: pets } = usePets();
  const { data: foodCount } = useFoodCount();
  const { pet } = useSelectedPet();
  const [logging, setLogging] = useState(false);
  const weightSheets = useWeightSheets(pet?.id);

  if (!pets || foodCount === undefined) {
    return null;
  }

  const date = (style: "short" | "long") =>
    new Intl.DateTimeFormat(i18n.language, {
      weekday: style,
      day: "numeric",
      month: style,
    }).format(new Date(`${pets.today}T00:00:00`));

  let content: ReactNode;
  if (!pet) {
    content = <NoPets />;
  } else if (foodCount === 0) {
    content = <NoFoods pet={pet} />;
  } else {
    content = <TodayFeeds pet={pet} today={pets.today} />;
  }
  // Logging needs something to log, so it waits for a pet and a food.
  const canLog = pet !== undefined && foodCount > 0;

  return (
    <div className="flex flex-col desktop:gap-6">
      <header className="flex items-center justify-between gap-4 px-5 pt-5 pb-3 desktop:p-0">
        <div className="flex flex-col gap-0.5 desktop:gap-1">
          <h1 className="font-display text-display font-semibold desktop:text-[34px] desktop:leading-10">
            {t("nav.today")}
          </h1>
          <span className="text-sm text-muted-foreground desktop:hidden">{date("short")}</span>
          <span className="hidden text-[15px] text-muted-foreground desktop:inline">
            {date("long")}
          </span>
        </div>
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
      </header>
      <div className={`px-5 pt-1 desktop:p-0 ${canLog ? "pb-24" : "pb-5"}`}>{content}</div>
      {canLog && (
        <div className="fixed right-5 bottom-[calc(86px+env(safe-area-inset-bottom))] flex items-center gap-2.5 desktop:right-8 desktop:bottom-8">
          <button
            type="button"
            className={`${button.floatingSecondary} hidden desktop:inline-flex`}
            onClick={weightSheets.openLog}
          >
            <PlusIcon size={18} />
            {t("logWeight.button")}
          </button>
          <button type="button" className={button.floating} onClick={() => setLogging(true)}>
            <PlusIcon size={20} />
            {t("feed.logFeed")}
          </button>
        </div>
      )}
      {weightSheets.ui}
      {pet && <AgePrompt petId={pet.id} petName={pet.name} />}
      {logging && <LogFeedSheet onClose={() => setLogging(false)} />}
    </div>
  );
}
