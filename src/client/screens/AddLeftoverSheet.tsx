import { useState } from "react";
import { useTranslation } from "react-i18next";
import { kcalIn, leftoverFits } from "../../shared/feeds.js";
import { button } from "../components/ui/button.js";
import { ErrorSummary } from "../components/ui/ErrorSummary.js";
import { Field } from "../components/ui/Field.js";
import { Segmented } from "../components/ui/Segmented.js";
import { Sheet } from "../components/ui/Sheet.js";
import { useAddLeftover, type FeedEntry } from "../lib/feeds.js";
import { formatTime } from "../lib/format.js";
import { useFormErrors } from "../lib/useFormErrors.js";

const ORDER = ["leftover"] as const;

/** What was left in the bowl, found after the feed was logged. */
export function AddLeftoverSheet({
  entry,
  timeZone,
  onClose,
}: {
  entry: FeedEntry;
  timeZone: string;
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation();
  const save = useAddLeftover(entry.id);
  const [leftover, setLeftover] = useState(entry.leftoverG === null ? "" : String(entry.leftoverG));
  // A leftover already recorded keeps its choice; otherwise the food type decides.
  const [fate, setFate] = useState<"back" | "binned">(
    (entry.leftoverG === null ? entry.type.leftoverReturnsToStock : entry.leftoverReturnedToStock)
      ? "back"
      : "binned",
  );

  const leftoverG = Number(leftover.trim());
  const valid = leftover.trim() !== "" && leftoverFits(leftoverG, entry.servedG);
  const problems = new Map(valid ? [] : [["leftover", "leftover"] as const]);
  const errors = useFormErrors(problems, ORDER, "leftover");
  const eatenG = entry.servedG - (valid ? leftoverG : 0);

  const submit = () => {
    if (errors.reject()) {
      return;
    }
    save.mutate({ leftoverG, leftoverReturnedToStock: fate === "back" }, { onSuccess: onClose });
  };

  return (
    <Sheet
      open
      onOpenChange={(open) => !open && onClose()}
      title={t("addLeftover.title")}
      subtitle={t("addLeftover.subtitle", {
        name: entry.food.name,
        time: formatTime(entry.fedAt, timeZone, i18n.language),
        served: entry.servedG,
      })}
      footer={
        <>
          <button
            type="button"
            className={`${button.primaryLarge} desktop:h-11 desktop:w-auto desktop:rounded-[10px] desktop:text-[15px]`}
            disabled={save.isPending}
            onClick={submit}
          >
            {t("addLeftover.save")}
          </button>
          <button
            type="button"
            className={`${button.outline} hidden desktop:inline-flex`}
            onClick={onClose}
          >
            {t("action.cancel")}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4 pt-2">
        <ErrorSummary
          inSheet
          names={errors.shown.map(() => t("addLeftover.errorNames.leftover"))}
        />
        <Field
          id="leftover-leftover"
          label={t("addLeftover.leftOver")}
          inputMode="numeric"
          suffix="g"
          value={leftover}
          onChange={setLeftover}
          onBlur={errors.recheck("leftover")}
          error={
            errors.problemOf("leftover") &&
            t("addLeftover.errors.leftover", { served: entry.servedG })
          }
        />
        <Segmented
          label={t("addLeftover.fate")}
          value={fate}
          onChange={setFate}
          options={[
            { value: "back", label: t("addLeftover.back") },
            { value: "binned", label: t("addLeftover.binned") },
          ]}
        />
        <div className="flex justify-between rounded-[10px] bg-muted px-3.5 py-3 text-sm tabular-nums">
          <span className="text-muted-foreground">{t("addLeftover.eaten")}</span>
          <span className="font-semibold">
            {t("addLeftover.eatenValue", {
              grams: eatenG,
              kcal: Math.round(kcalIn(eatenG, entry.kcalPerKg)),
            })}
          </span>
        </div>
      </div>
    </Sheet>
  );
}
