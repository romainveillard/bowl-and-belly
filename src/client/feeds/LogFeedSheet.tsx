import { useImperativeHandle, useRef, useState, type Ref } from "react";
import { useTranslation } from "react-i18next";
import { kcalIn, leftoverFits } from "../../shared/feeds.js";
import { FoodPicker } from "./FoodPicker.js";
import { LeftoverPrompt } from "./LeftoverPrompt.js";
import { PetChip, PetOptions } from "../pets/PetChip.js";
import { ErrorSummary } from "../components/ui/forms/ErrorSummary.js";
import { Field, inputClass } from "../components/ui/forms/Field.js";
import { Segmented } from "../components/ui/forms/Segmented.js";
import { Sheet } from "../components/ui/overlays/Sheet.js";
import { SheetActions } from "../components/ui/overlays/SheetActions.js";
import { useLogFeed, useLogForm, type LogBody, type LogForm, type PickerFood } from "./feeds.js";
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
import { useFocusNext } from "../lib/useFocusNext.js";
import { useFormErrors } from "../lib/useFormErrors.js";
import { useSettings } from "../settings/settings.js";

type FieldName = "food" | "amount" | "leftover";
const FIELD_ORDER: FieldName[] = ["leftover", "food", "amount"];

/** The form for one pet, inside the sheet, which saves it through `ref`. */
function LogFeedFields({
  ref,
  petId,
  form,
  timeZone,
  onLog,
}: {
  ref: Ref<{ submit: () => void }>;
  petId: number;
  form: LogForm;
  timeZone: string;
  onLog: (body: LogBody) => void;
}) {
  const { t, i18n } = useTranslation();
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
    onLog({
      petId,
      foodId: food.id,
      servedG,
      time,
      previousLeftover: previous && leftoverG !== null ? { entryId: previous.id, leftoverG } : null,
    });
  };
  useImperativeHandle(ref, () => ({ submit }));

  return (
    <>
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
      <div className="grid grid-cols-[1fr_120px] items-start gap-3">
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
    </>
  );
}

/**
 * Opened from Log feed. Changing the pet in its header changes the selected
 * pet everywhere. On a phone the pet list takes the sheet's place rather than
 * opening a sheet of its own on top, and the form waits underneath, so Back
 * returns to it as it was; another pet gets a form of its own.
 */
export function LogFeedSheet({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const { pet } = useSelectedPet();
  const { data: form } = useLogForm(pet?.id);
  const { data: settings } = useSettings();
  const logFeed = useLogFeed();
  const fields = useRef<{ submit: () => void }>(null);
  const [switching, setSwitching] = useState(false);
  const focusNext = useFocusNext();

  if (!pet || !settings) {
    return null;
  }
  const backToForm = () => {
    setSwitching(false);
    focusNext(() => document.querySelector<HTMLElement>("[role=dialog] [data-pet-chip]"));
  };

  return (
    <Sheet
      open
      tall
      flush={switching}
      onOpenChange={(open) => !open && onClose()}
      title={t(switching ? "petChip.switchTitle" : "logFeed.title")}
      onBack={switching ? backToForm : undefined}
      headerExtra={
        !switching && (
          <PetChip
            onSwitch={() => {
              setSwitching(true);
              focusNext(() =>
                document.querySelector<HTMLElement>("[role=dialog] [aria-current=true]"),
              );
            }}
          />
        )
      }
      footer={
        !switching &&
        form && (
          <SheetActions
            saveLabel={t("logFeed.save")}
            pending={logFeed.isPending}
            onSave={() => fields.current?.submit()}
            onCancel={onClose}
          />
        )
      }
    >
      {switching && (
        <div className="flex flex-col gap-2 px-3">
          <PetOptions onChosen={backToForm} />
        </div>
      )}
      {form && (
        <div hidden={switching} className="contents">
          <LogFeedFields
            key={pet.id}
            ref={fields}
            petId={pet.id}
            form={form}
            timeZone={settings.timeZone}
            onLog={(body) => logFeed.mutate(body, { onSuccess: onClose })}
          />
        </div>
      )}
    </Sheet>
  );
}
