import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { BowlIcon, CheckIcon, LogoMark, PlusIcon, SettingsIcon } from "../components/icons.js";
import { PetAvatar } from "../components/PetAvatar.js";
import { button } from "../components/ui/button.js";
import { useFoodCount, usePets, type PetSummary } from "../lib/pets.js";

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

function NoFoods({ pet }: { pet: PetSummary }) {
  const { t } = useTranslation();

  return (
    <div className="grid gap-4 desktop:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] desktop:items-start desktop:gap-6">
      <section
        aria-label={t("today.caloriesLabel")}
        className={`${card} flex flex-col gap-3 rounded-xl p-[18px] desktop:gap-4 desktop:rounded-[14px] desktop:p-[22px]`}
      >
        <h2 className="hidden text-base font-semibold desktop:block">{t("today.caloriesToday")}</h2>
        <span className="flex items-baseline gap-2 tabular-nums">
          <span className="font-display text-4xl leading-10 font-semibold desktop:text-[44px] desktop:leading-[48px]">
            0
          </span>
          <span className="text-base text-muted-foreground desktop:text-heading">
            {pet.targetKcal === null
              ? t("pets.kcal")
              : t("pets.ofTarget", { target: pet.targetKcal })}
          </span>
        </span>
        {pet.targetKcal !== null && (
          <span
            role="img"
            aria-label={t("pets.progress", { percent: 0 })}
            className="block h-2.5 rounded-full bg-muted desktop:h-3"
          />
        )}
        <span className="text-[13px] text-muted-foreground desktop:text-sm">
          {t("today.noFeeds")}
        </span>
      </section>
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

  if (!pets || foodCount === undefined) {
    return null;
  }

  const [pet] = pets.pets;
  const date = (style: "short" | "long") =>
    new Intl.DateTimeFormat(i18n.language, {
      weekday: style,
      day: "numeric",
      month: style,
    }).format(new Date(`${pets.today}T00:00:00`));

  let content: ReactNode = null;
  if (!pet) {
    content = <NoPets />;
  } else if (foodCount === 0) {
    content = <NoFoods pet={pet} />;
  }

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
          {pet && (
            <span
              className={`${card} inline-flex h-11 flex-none items-center gap-1.5 rounded-full pr-3 pl-1.5 text-sm font-semibold desktop:text-[15px]`}
            >
              <PetAvatar photoId={pet.photoId} size={32} />
              {pet.name}
            </span>
          )}
          <Link
            to="/settings"
            aria-label={t("today.settings")}
            className={`${button.icon} ${card} desktop:hidden`}
          >
            <SettingsIcon />
          </Link>
        </div>
      </header>
      <div className="px-5 pt-1 pb-5 desktop:p-0">{content}</div>
    </div>
  );
}
