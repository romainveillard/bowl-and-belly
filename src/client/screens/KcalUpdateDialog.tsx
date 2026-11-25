import { AlertDialog } from "radix-ui";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { inputClass } from "../components/ui/forms/Field.js";
import { Dialog, dialogButton } from "../components/ui/overlays/Dialog.js";
import type { KcalBackfill } from "../lib/foods.js";

interface KcalUpdateDialogProps {
  /** "Salmon kibbles changed from 370 to 365 kcal per 100 g." */
  description: string;
  today: string;
  onSave: (backfill: KcalBackfill) => void;
  onCancel: () => void;
}

/** Asked when a food's kcal changes: which past feeds should take the new value. */
export function KcalUpdateDialog({ description, today, onSave, onCancel }: KcalUpdateDialogProps) {
  const { t } = useTranslation();
  const [scope, setScope] = useState<KcalBackfill["scope"]>("since");
  const [day, setDay] = useState(today);
  const options = [
    { value: "all", label: t("kcalUpdate.all"), hint: t("kcalUpdate.allHint") },
    { value: "since", label: t("kcalUpdate.since"), hint: t("kcalUpdate.sinceHint") },
    { value: "none", label: t("kcalUpdate.none"), hint: t("kcalUpdate.noneHint") },
  ] as const;

  return (
    <Dialog
      open
      onOpenChange={(open) => !open && onCancel()}
      title={t("kcalUpdate.title")}
      description={description}
      actions={
        <>
          <button
            type="button"
            className={dialogButton.primary}
            disabled={scope === "since" && day === ""}
            onClick={() => onSave(scope === "since" ? { scope, day } : { scope })}
          >
            {t("kcalUpdate.save")}
          </button>
          <AlertDialog.Cancel className={dialogButton.secondary}>
            {t("action.cancel")}
          </AlertDialog.Cancel>
        </>
      }
    >
      <fieldset className="flex flex-col gap-2">
        <legend className="sr-only">{t("kcalUpdate.legend")}</legend>
        {options.map((option) => (
          <div
            key={option.value}
            className={`flex flex-col gap-2.5 rounded-xl px-3.5 py-3 ${scope === option.value ? "bg-accent-soft inset-ring-2 inset-ring-primary-strong" : "bg-card inset-ring inset-ring-border"}`}
          >
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="radio"
                name="kcal-scope"
                checked={scope === option.value}
                onChange={() => setScope(option.value)}
                className="mt-0.5 size-5 flex-none accent-primary-strong"
              />
              <span className="flex flex-col gap-0.5">
                <span className="text-[15px] font-semibold">{option.label}</span>
                <span className="text-[13px] text-muted-foreground">{option.hint}</span>
              </span>
            </label>
            {option.value === "since" && scope === "since" && (
              <div className="pl-8">
                <label htmlFor="kcal-since" className="sr-only">
                  {t("kcalUpdate.sinceLabel")}
                </label>
                <input
                  id="kcal-since"
                  type="date"
                  max={today}
                  value={day}
                  onChange={(event) => setDay(event.target.value)}
                  className={inputClass}
                />
              </div>
            )}
          </div>
        ))}
      </fieldset>
    </Dialog>
  );
}
