import { useState } from "react";
import { useTranslation } from "react-i18next";
import { kcalIn, leftoverFits } from "../../shared/feeds.js";
import { FoodPicker } from "./FoodPicker.js";
import { LeftoverPrompt } from "./LeftoverPrompt.js";
import { PetChip } from "../pets/PetChip.js";
import { ErrorSummary } from "../components/ui/forms/ErrorSummary.js";
import { Field, inputClass } from "../components/ui/forms/Field.js";
import { Segmented } from "../components/ui/forms/Segmented.js";
import { Sheet } from "../components/ui/overlays/Sheet.js";
import { SheetActions } from "../components/ui/overlays/SheetActions.js";
import { useLogFeed, useLogForm, type LogForm, type PickerFood } from "./feeds.js";
import { formatTime } from "../lib/format.js";
import { portionPlural, portionUnit } from "../stock/foods.js";
import {
  amountIn,
  countsInPortions,
  servedGrams,
  startingAmount,
  type AmountUnit,
} from "./logFeed.js";
import { useSelectedPet } from "../pets/selectedPet.js";
import { useFormErrors } from "../lib/useFormErrors.js";
import { useSettings } from "../settings/settings.js";

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
        <SheetActions
          saveLabel={t("logFeed.save")}
          pending={logFeed.isPending}
          onSave={submit}
          onCancel={onDone}
        />
      }
    >
      <ErrorSummary
        inSheet
        names={errors.shown.map((problem) => t(`logFeed.errorNames.${problem}`))}
      />

      {previous && (
        <LeftoverPrompt
          id={errors.idOf("leftover")}
          previous={previous}
          timeZone={timeZone}
          value={leftover}
          onChange={setLeftover}
          onBlur={errors.recheck("leftover")}
          error={errorFor("leftover")}
        />
      )}

      <FoodPicker
        inputId={errors.idOf("food")}
        foods={form.foods}
        recentCount={form.recentCount}
        chosenId={foodId}
        onChoose={choose}
        error={errorFor("food")}
      />

      <div className="grid grid-cols-[1fr_120px] items-start gap-3">
        <div className="flex flex-col gap-2">
          <Field
            id={errors.idOf("amount")}
            label={t("logFeed.amount")}
            inputMode="decimal"
            suffix={
              inPortions && food?.portionName ? portionUnit(food.portionName, i18n) : t("common.g")
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
                setAmounts({ amount: amountIn(servedG, unit, food.portionG, i18n.language), unit })
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
  const { data: settings } = useSettings();

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
