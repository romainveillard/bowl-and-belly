import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FoodTypeBadge, FoodTypeTile } from "../components/FoodTypeMark.js";
import { SearchIcon } from "../components/icons.js";
import { PetChip } from "../components/PetChip.js";
import { button } from "../components/ui/button.js";
import { ErrorSummary } from "../components/ui/ErrorSummary.js";
import { Field, inputClass } from "../components/ui/Field.js";
import { Segmented } from "../components/ui/Segmented.js";
import { Sheet } from "../components/ui/Sheet.js";
import {
  formatTime,
  useDaySettings,
  useLogFeed,
  useLogForm,
  type LogForm,
  type PickerFood,
} from "../lib/feeds.js";
import { foodTypeLabel, isOutOfStock, portionPlural, stockLeftLabel } from "../lib/foods.js";
import { parsePositive } from "../lib/format.js";
import { useSelectedPet } from "../lib/selectedPet.js";
import { useFormErrors } from "../lib/useFormErrors.js";

const chip =
  "h-9 flex-none cursor-pointer rounded-full border border-border bg-card px-3.5 text-sm font-medium aria-pressed:border-primary-strong aria-pressed:bg-accent-soft aria-pressed:font-semibold";

type Unit = "g" | "portion";
type FieldName = "food" | "amount" | "leftover";
const FIELD_ORDER: FieldName[] = ["leftover", "food", "amount"];

const countsInPortions = (food: PickerFood) =>
  food.stockUnit === "portion" && food.portionG !== null;

/** What the amount starts at for a food: the last amount for this pet, else one portion. */
function defaultAmount(food: PickerFood): { amount: string; unit: Unit } {
  if (countsInPortions(food) && food.portionG) {
    if (food.lastServedG === null) {
      return { amount: "1", unit: "portion" };
    }
    if (food.lastServedG % food.portionG === 0) {
      return { amount: String(food.lastServedG / food.portionG), unit: "portion" };
    }
  }
  return { amount: food.lastServedG === null ? "" : String(food.lastServedG), unit: "g" };
}

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
  const [search, setSearch] = useState("");
  const [typeId, setTypeId] = useState<number | null>(null);
  // Recent foods come first, so the most recent one is chosen for the user.
  const [foodId, setFoodId] = useState<number | null>(
    form.recentCount > 0 ? (form.foods[0]?.id ?? null) : null,
  );
  const [amounts, setAmounts] = useState(() => {
    const first = form.recentCount > 0 ? form.foods[0] : undefined;
    return first ? defaultAmount(first) : { amount: "", unit: "g" };
  });
  const [time, setTime] = useState<string | null>(null);
  const [leftover, setLeftover] = useState("");

  const food = form.foods.find((candidate) => candidate.id === foodId);
  const types = [
    ...new Map(form.foods.map((candidate) => [candidate.type.id, candidate.type])).values(),
  ];
  const wanted = search.trim().toLocaleLowerCase(i18n.language);
  const shown = form.foods.filter(
    (candidate) =>
      (typeId === null || candidate.type.id === typeId) &&
      `${candidate.name} ${candidate.brand ?? ""}`
        .toLocaleLowerCase(i18n.language)
        .includes(wanted),
  );
  const showRecentLabel = form.recentCount > 0 && wanted === "" && typeId === null;

  const value = parsePositive(amounts.amount);
  const inPortions = food !== undefined && countsInPortions(food) && amounts.unit === "portion";
  const servedG =
    value === null
      ? null
      : Math.round(inPortions && food?.portionG ? value * food.portionG : value);
  const previous = form.previous;
  const leftoverG = leftover.trim() === "" ? null : Number(leftover.trim());

  const problems = new Map<FieldName, FieldName>();
  if (!food) {
    problems.set("food", "food");
  }
  if (servedG === null || servedG === 0) {
    problems.set("amount", "amount");
  }
  if (
    previous &&
    leftoverG !== null &&
    !(Number.isInteger(leftoverG) && leftoverG >= 0 && leftoverG <= previous.servedG)
  ) {
    problems.set("leftover", "leftover");
  }
  const errors = useFormErrors(problems, FIELD_ORDER, "log");
  const errorFor = (field: FieldName) =>
    errors.problemOf(field) && t(`logFeed.errors.${field}`, { served: previous?.servedG ?? 0 });

  const choose = (candidate: PickerFood) => {
    setFoodId(candidate.id);
    setAmounts(defaultAmount(candidate));
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
            className={`${button.primaryLarge} desktop:h-11 desktop:w-auto desktop:rounded-[10px] desktop:text-[15px]`}
            disabled={logFeed.isPending}
            onClick={submit}
          >
            {t("logFeed.save")}
          </button>
          <button
            type="button"
            className={`${button.outline} hidden desktop:inline-flex`}
            onClick={onDone}
          >
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
              <span className="truncate text-[13px] text-[#6A4A33]">
                {t("logFeed.leftoverFood", {
                  name: previous.foodName ?? "",
                  served: previous.servedG,
                })}
              </span>
            </label>
            <div className="relative w-24 flex-none desktop:w-[110px]">
              <input
                id="log-leftover"
                inputMode="numeric"
                placeholder="0"
                value={leftover}
                onChange={(event) => setLeftover(event.target.value)}
                onBlur={errors.recheck("leftover")}
                aria-invalid={errorFor("leftover") ? true : undefined}
                aria-describedby={errorFor("leftover") ? "log-leftover-error" : undefined}
                className={`${inputClass} pr-7`}
              />
              <span
                aria-hidden="true"
                className="absolute top-3 right-3 text-[15px] text-muted-foreground"
              >
                g
              </span>
            </div>
          </div>
          {errorFor("leftover") && (
            <span id="log-leftover-error" className="text-[13px] font-medium text-danger">
              {errorFor("leftover")}
            </span>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2.5">
        <label htmlFor="log-food" className="text-sm font-semibold desktop:sr-only">
          {t("logFeed.food")}
        </label>
        <div className="flex flex-col gap-2.5 desktop:flex-row desktop:items-center">
          <div className="relative desktop:flex-1">
            <span aria-hidden="true" className="absolute top-3 left-3 text-muted-foreground">
              <SearchIcon size={20} />
            </span>
            <input
              id="log-food"
              type="search"
              placeholder={t("logFeed.search")}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-invalid={errorFor("food") ? true : undefined}
              aria-describedby={errorFor("food") ? "log-food-error" : undefined}
              className={`${inputClass} pl-10`}
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              aria-pressed={typeId === null}
              className={chip}
              onClick={() => setTypeId(null)}
            >
              {t("stock.all")}
            </button>
            {types.map((type) => (
              <button
                key={type.id}
                type="button"
                aria-pressed={typeId === type.id}
                className={chip}
                onClick={() => setTypeId(type.id)}
              >
                {foodTypeLabel(type, t)}
              </button>
            ))}
          </div>
        </div>
        {errorFor("food") && (
          <span id="log-food-error" className="text-[13px] font-medium text-danger">
            {errorFor("food")}
          </span>
        )}
        {showRecentLabel && (
          <span className="mt-1 text-caption font-medium tracking-[0.6px] text-muted-foreground uppercase desktop:hidden">
            {t("logFeed.recent")}
          </span>
        )}
        {shown.length > 0 && (
          <div className="overflow-hidden rounded-xl inset-ring inset-ring-border">
            {shown.map((candidate) => (
              <button
                key={candidate.id}
                type="button"
                aria-pressed={candidate.id === foodId}
                onClick={() => choose(candidate)}
                className="flex min-h-[60px] w-full cursor-pointer items-center gap-3 border-t border-border px-3 py-2 text-left first:border-t-0 aria-pressed:bg-accent-soft aria-pressed:inset-ring-2 aria-pressed:inset-ring-primary-strong desktop:min-h-14"
              >
                {candidate.photoId === null ? (
                  <FoodTypeTile type={candidate.type} />
                ) : (
                  <img
                    src={`/api/images/${candidate.photoId}`}
                    alt=""
                    className="size-10 flex-none rounded-[10px] object-cover"
                  />
                )}
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-[15px] font-semibold">{candidate.name}</span>
                  {candidate.brand && (
                    <span className="truncate text-[13px] text-muted-foreground">
                      {candidate.brand}
                    </span>
                  )}
                </span>
                <span className="flex flex-none flex-col items-end gap-1">
                  <FoodTypeBadge type={candidate.type} />
                  <span
                    className={`text-[13px] tabular-nums ${isOutOfStock(candidate) ? "font-semibold text-warning" : "text-muted-foreground"}`}
                  >
                    {stockLeftLabel(candidate, i18n)}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

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
                ? t("logFeed.approx", { kcal: Math.round((servedG * food.kcalPerKg) / 1000) })
                : undefined
            }
          />
          {food && countsInPortions(food) && food.portionName && (
            <Segmented
              label={t("logFeed.unit")}
              hideLabel
              value={amounts.unit}
              onChange={(unit) => {
                // Keep the same quantity when switching how it is counted.
                const grams = servedG;
                const next =
                  grams === null || !food.portionG
                    ? ""
                    : unit === "g"
                      ? String(grams)
                      : String(Math.round((grams / food.portionG) * 100) / 100);
                setAmounts({ amount: next, unit });
              }}
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
