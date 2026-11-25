import { useState } from "react";
import { useTranslation } from "react-i18next";
import { kcalIn, leftoverFits } from "../../shared/feeds.js";
import { FoodPicker } from "../components/FoodPicker.js";
import { PetChip } from "../components/PetChip.js";
import { button } from "../components/ui/forms/button.js";
import { ErrorSummary } from "../components/ui/forms/ErrorSummary.js";
import { Field, FieldError, Input, inputClass } from "../components/ui/forms/Field.js";
import { Segmented } from "../components/ui/forms/Segmented.js";
import { Sheet } from "../components/ui/overlays/Sheet.js";
import {
  useDaySettings,
  useLogFeed,
  useLogForm,
  type LogForm,
  type PickerFood,
} from "../lib/feeds.js";
import { formatTime } from "../lib/format.js";
import { portionPlural } from "../lib/foods.js";
import {
  amountIn,
  countsInPortions,
  servedGrams,
  startingAmount,
  type AmountUnit,
} from "../lib/logFeed.js";
import { useSelectedPet } from "../lib/selectedPet.js";
import { useFormErrors } from "../lib/useFormErrors.js";

type FieldName = "food" | "amount" | "leftover";
const FIELD_ORDER: FieldName[] = ["leftover", "food", "amount"];

function LogFeedForm({
  petId,
  form,
  timeZone,
  onDone,
}: {
  petId: number;
  form: LogForm;
  timeZone: string;
  onDone: () => void;
}) {
  const { t, i18n } = useTranslation();
  const logFeed = useLogFeed();
  const [openedAt] = useState(() => new Date());
  // Recent foods come first, so the most recent one is chosen for the user.
  const [foodId, setFoodId] = useState<number | null>(
    form.recentCount > 0 ? (form.foods[0]?.id ?? null) : null,
  );
  const [amounts, setAmounts] = useState<{ amount: string; unit: AmountUnit }>(() => {
    const first = form.recentCount > 0 ? form.foods[0] : undefined;
    return first ? startingAmount(first) : { amount: "", unit: "g" };
  });
  const [time, setTime] = useState<string | null>(null);
  const [leftover, setLeftover] = useState("");

  const food = form.foods.find((candidate) => candidate.id === foodId);

  const inPortions = food !== undefined && countsInPortions(food) && amounts.unit === "portion";
  const servedG = food ? servedGrams(amounts.amount, amounts.unit, food) : null;
  const previous = form.previous;
  const leftoverG = leftover.trim() === "" ? null : Number(leftover.trim());

  const problems = new Map<FieldName, FieldName>();
  if (!food) {
    problems.set("food", "food");
  }
  if (servedG === null || servedG === 0) {
    problems.set("amount", "amount");
  }
  if (previous && leftoverG !== null && !leftoverFits(leftoverG, previous.servedG)) {
    problems.set("leftover", "leftover");
  }
  const errors = useFormErrors(problems, FIELD_ORDER, "log");
  const errorFor = (field: FieldName) =>
    errors.problemOf(field) && t(`logFeed.errors.${field}`, { served: previous?.servedG ?? 0 });

  const choose = (candidate: PickerFood) => {
    setFoodId(candidate.id);
    setAmounts(startingAmount(candidate));
  };

  const submit = () => {
    if (errors.reject() || !food || servedG === null) {
      return;
    }
    logFeed.mutate(
      {
        petId,
        foodId: food.id,
        servedG,
        time,
        previousLeftover:
          previous && leftoverG !== null ? { entryId: previous.id, leftoverG } : null,
      },
      { onSuccess: onDone },
    );
  };

  return (
    <Sheet
      open
      tall
      onOpenChange={(open) => !open && onDone()}
      title={t("logFeed.title")}
      headerExtra={<PetChip />}
      footer={
        <>
          <button
            type="button"
            className={button.sheetPrimary}
            disabled={logFeed.isPending}
            onClick={submit}
          >
            {t("logFeed.save")}
          </button>
          <button type="button" className={button.sheetCancel} onClick={onDone}>
            {t("action.cancel")}
          </button>
        </>
      }
    >
      <ErrorSummary
        inSheet
        names={errors.shown.map((problem) => t(`logFeed.errorNames.${problem}`))}
      />

      {previous && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2.5 rounded-xl bg-accent-soft p-3 desktop:gap-3 desktop:px-3.5">
            <label htmlFor="log-leftover" className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-sm font-semibold">
                {t("logFeed.leftoverQuestion", {
                  time: formatTime(previous.fedAt, timeZone, i18n.language),
                })}
              </span>
              <span className="truncate text-[13px] text-accent-foreground">
                {t("logFeed.leftoverFood", {
                  name: previous.foodName ?? "",
                  served: previous.servedG,
                })}
              </span>
            </label>
            <Input
              id="log-leftover"
              inputMode="numeric"
              placeholder="0"
              suffix="g"
              boxClassName="w-24 flex-none desktop:w-[110px]"
              value={leftover}
              onChange={(event) => setLeftover(event.target.value)}
              onBlur={errors.recheck("leftover")}
              aria-invalid={errorFor("leftover") ? true : undefined}
              aria-describedby={errorFor("leftover") ? "log-leftover-error" : undefined}
            />
          </div>
          {errorFor("leftover") && (
            <FieldError id="log-leftover-error">{errorFor("leftover")}</FieldError>
          )}
        </div>
      )}

      <FoodPicker
        inputId="log-food"
        foods={form.foods}
        recentCount={form.recentCount}
        chosenId={foodId}
        onChoose={choose}
        error={errorFor("food")}
      />

      <div className="grid grid-cols-[1fr_120px] items-start gap-3">
        <div className="flex flex-col gap-2">
          <Field
            id="log-amount"
            label={t("logFeed.amount")}
            inputMode="decimal"
            suffix={
              inPortions && food?.portionName
                ? portionPlural(food.portionName, i18n).toLowerCase()
                : "g"
            }
            error={errorFor("amount")}
            onBlur={errors.recheck("amount")}
            value={amounts.amount}
            onChange={(amount) => setAmounts((current) => ({ ...current, amount }))}
            hint={
              servedG !== null && food
                ? t("logFeed.approx", { kcal: Math.round(kcalIn(servedG, food.kcalPerKg)) })
                : undefined
            }
          />
          {food && countsInPortions(food) && food.portionName && (
            <Segmented
              label={t("logFeed.unit")}
              hideLabel
              value={amounts.unit}
              onChange={(unit) =>
                setAmounts({ amount: amountIn(servedG, unit, food.portionG), unit })
              }
              options={[
                { value: "g", label: t("logFeed.grams") },
                { value: "portion", label: portionPlural(food.portionName, i18n) },
              ]}
            />
          )}
        </div>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          {t("logFeed.time")}
          <input
            type="time"
            value={time ?? formatTime(openedAt, timeZone, "en-GB")}
            onChange={(event) => setTime(event.target.value || null)}
            className={`${inputClass} font-normal`}
          />
        </label>
      </div>
    </Sheet>
  );
}

/** Opened from Log feed. Changing the pet in its header changes the selected pet everywhere. */
export function LogFeedSheet({ onClose }: { onClose: () => void }) {
  const { pet } = useSelectedPet();
  const { data: form } = useLogForm(pet?.id);
  const { data: settings } = useDaySettings();

  if (!pet || !form || !settings) {
    return null;
  }
  return (
    <LogFeedForm
      key={pet.id}
      petId={pet.id}
      form={form}
      timeZone={settings.timeZone}
      onDone={onClose}
    />
  );
}
