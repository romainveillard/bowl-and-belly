import { useState } from "react";
import { useTranslation } from "react-i18next";
import { kcalIn, leftoverFits } from "../../shared/feeds.js";
import { FoodPicker } from "../components/FoodPicker.js";
import { FoodRow } from "../components/FoodRow.js";
import { button } from "../components/ui/forms/button.js";
import { ErrorSummary } from "../components/ui/forms/ErrorSummary.js";
import { Field } from "../components/ui/forms/Field.js";
import { Sheet } from "../components/ui/overlays/Sheet.js";
import { useEditFeed, useLogForm, type FeedEntry, type PickerFood } from "../lib/feeds.js";
import { formatDateInput, formatDay, formatTime, parsePositive } from "../lib/format.js";
import { useFormErrors } from "../lib/useFormErrors.js";

type FieldName = "served" | "leftover" | "when";
const ORDER: FieldName[] = ["served", "leftover", "when"];

interface EditFeedSheetProps {
  entry: FeedEntry;
  petId: number;
  day: string;
  today: string;
  timeZone: string;
  onClose: () => void;
}

/** Food, amounts, date and time of a feed already logged. Stock moves by the difference. */
export function EditFeedSheet({ entry, petId, day, today, timeZone, onClose }: EditFeedSheetProps) {
  const { t, i18n } = useTranslation();
  const { data: form } = useLogForm(petId);
  const edit = useEditFeed(entry.id);
  const [openedAt] = useState(() => new Date());
  const [newFood, setNewFood] = useState<PickerFood | null>(null);
  const [changing, setChanging] = useState(false);
  const [served, setServed] = useState(String(entry.servedG));
  const [leftover, setLeftover] = useState(entry.leftoverG === null ? "" : String(entry.leftoverG));
  // The entry keeps its own date unless the user changes it.
  const [date, setDate] = useState(formatDateInput(entry.fedAt, timeZone));
  const [time, setTime] = useState(formatTime(entry.fedAt, timeZone, "en-GB"));

  const shownFood = newFood ?? { ...entry.food, type: entry.type };
  // The snapshot stays with the food it was taken from.
  const kcalPerKg = newFood ? newFood.kcalPerKg : entry.kcalPerKg;
  const servedValue = parsePositive(served);
  const servedG = servedValue === null ? null : Math.round(servedValue);
  const leftoverG = leftover.trim() === "" ? null : Number(leftover.trim());
  const now = `${formatDateInput(openedAt, timeZone)}T${formatTime(openedAt, timeZone, "en-GB")}`;

  const problems = new Map<FieldName, FieldName>();
  if (servedG === null || servedG === 0) {
    problems.set("served", "served");
  }
  if (leftoverG !== null && (servedG === null || !leftoverFits(leftoverG, servedG))) {
    problems.set("leftover", "leftover");
  }
  if (date === "" || time === "" || `${date}T${time}` > now) {
    problems.set("when", "when");
  }
  const errors = useFormErrors(problems, ORDER, "edit");
  const errorFor = (field: FieldName) => errors.problemOf(field) && t(`editFeed.errors.${field}`);

  const submit = () => {
    if (errors.reject() || servedG === null) {
      return;
    }
    // A new leftover, or a new food, takes the food type's default for putting it back.
    const returned =
      newFood || entry.leftoverG === null
        ? shownFood.type.leftoverReturnsToStock
        : entry.leftoverReturnedToStock;
    edit.mutate(
      {
        foodId: shownFood.id,
        servedG,
        leftoverG,
        leftoverReturnedToStock: returned,
        date,
        time,
      },
      { onSuccess: onClose },
    );
  };

  return (
    <Sheet
      open
      tall={changing}
      onOpenChange={(open) => !open && onClose()}
      title={t("editFeed.title")}
      subtitle={t("editFeed.subtitle", {
        day: day === today ? t("feed.today") : formatDay(day, today, i18n.language),
        time: formatTime(entry.fedAt, timeZone, i18n.language),
        kcal: entry.kcal,
      })}
      footer={
        <>
          <button
            type="button"
            className={button.sheetPrimary}
            disabled={edit.isPending}
            onClick={submit}
          >
            {t("editFeed.save")}
          </button>
          <button type="button" className={button.sheetCancel} onClick={onClose}>
            {t("action.cancel")}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4 pt-2">
        <ErrorSummary
          inSheet
          names={errors.shown.map((problem) => t(`editFeed.errorNames.${problem}`))}
        />
        {changing && form ? (
          <FoodPicker
            inputId="edit-food"
            foods={form.foods}
            recentCount={form.recentCount}
            chosenId={shownFood.id}
            onChoose={(food) => {
              setNewFood(food.id === entry.food.id ? null : food);
              setChanging(false);
            }}
          />
        ) : (
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold">{t("editFeed.food")}</span>
            <div className="flex min-h-[60px] items-center gap-3 rounded-xl bg-accent-soft py-2 pr-2 pl-3 inset-ring-2 inset-ring-primary-strong">
              <FoodRow
                food={shownFood}
                onAccent
                trailing={
                  <button
                    type="button"
                    className={`${button.outline} h-10 flex-none px-3.5 text-sm`}
                    onClick={() => setChanging(true)}
                  >
                    {t("editFeed.change")}
                  </button>
                }
              />
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 items-start gap-3">
          <Field
            id={errors.idOf("served")}
            label={t("editFeed.served")}
            inputMode="numeric"
            suffix="g"
            value={served}
            onChange={setServed}
            onBlur={errors.recheck("served")}
            error={errorFor("served")}
            hint={
              servedG === null
                ? undefined
                : t("logFeed.approx", { kcal: Math.round(kcalIn(servedG, kcalPerKg)) })
            }
          />
          <Field
            id={errors.idOf("leftover")}
            label={t("editFeed.leftOver")}
            inputMode="numeric"
            placeholder="0"
            suffix="g"
            value={leftover}
            onChange={setLeftover}
            onBlur={errors.recheck("leftover")}
            error={errorFor("leftover")}
          />
        </div>
        <div className="grid grid-cols-2 items-start gap-3">
          <Field
            id={errors.idOf("when")}
            label={t("editFeed.date")}
            type="date"
            value={date}
            onChange={setDate}
            onBlur={errors.recheck("when")}
            error={errorFor("when")}
          />
          <Field
            label={t("editFeed.time")}
            type="time"
            value={time}
            onChange={setTime}
            onBlur={errors.recheck("when")}
          />
        </div>
      </div>
    </Sheet>
  );
}
