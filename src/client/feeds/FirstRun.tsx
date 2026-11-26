import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { EmptyMessage } from "../components/EmptyState.js";
import { BowlIcon, CheckIcon, LogoMark, PlusIcon } from "../components/icons.js";
import { button } from "../components/ui/forms/button.js";
import { Card } from "../components/ui/layout/Card.js";
import type { PetSummary } from "../pets/pets.js";
import { CaloriesCard } from "./CaloriesCard.js";

const twoColumns =
  "grid gap-4 desktop:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] desktop:items-start desktop:gap-6";

function GettingStarted({ petAdded }: { petAdded: boolean }) {
  const { t } = useTranslation();
  const steps: { label: string; state: string; to?: string; hint?: string }[] = [
    { label: t("today.stepPet"), state: petAdded ? "done" : "current" },
    { label: t("today.stepFood"), state: petAdded ? "current" : "next" },
    // Open at any point, so it never becomes the current step or holds the others up.
    {
      label: t("today.stepSettings"),
      state: "next",
      to: "/settings",
      hint: t("today.stepSettingsHint"),
    },
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
              className={`flex size-7 flex-none items-center justify-center rounded-full text-sm font-semibold ${step.state === "current" ? "bg-primary" : "text-muted-foreground inset-ring-[1.5px] inset-ring-outline"}`}
            >
              {index + 1}
            </span>
          )}
          {step.to ? (
            <span className="flex flex-col gap-0.5">
              <Link to={step.to} className="text-[15px] underline underline-offset-2">
                {step.label}
              </Link>
              <span className="text-[13px] text-muted-foreground">{step.hint}</span>
            </span>
          ) : (
            <span
              className={`text-[15px] ${step.state === "current" ? "font-semibold" : "text-muted-foreground"}`}
            >
              {step.state === "done" && <span className="sr-only">{t("today.stepDone")} </span>}
              {step.label}
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}

function NoPets() {
  const { t } = useTranslation();

  return (
    <div className={twoColumns}>
      <EmptyMessage
        size="large"
        picture={
          <>
            <span className="desktop:hidden">
              <LogoMark width={110} />
            </span>
            <span className="hidden desktop:block">
              <LogoMark width={140} />
            </span>
          </>
        }
        title={t("today.welcomeTitle")}
        body={t("today.welcomeBody")}
        action={{ label: t("today.addFirstPet"), to: "/pets/new" }}
      />
      <Card>
        <h2 className="text-caption font-medium tracking-[0.6px] text-muted-foreground uppercase desktop:text-base desktop:font-semibold desktop:tracking-normal desktop:text-foreground desktop:normal-case">
          {t("today.gettingStarted")}
        </h2>
        <GettingStarted petAdded={false} />
      </Card>
    </div>
  );
}

function NoFoods({ pet }: { pet: PetSummary }) {
  const { t } = useTranslation();

  return (
    <div className={twoColumns}>
      <CaloriesCard eatenKcal={0} targetKcal={pet.targetKcal} byType={[]} />
      <Card>
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
      </Card>
    </div>
  );
}

/** Today before there is anything to log: no pet yet, or a pet but no food. */
export function FirstRun({ pet }: { pet: PetSummary | undefined }) {
  return pet ? <NoFoods pet={pet} /> : <NoPets />;
}
