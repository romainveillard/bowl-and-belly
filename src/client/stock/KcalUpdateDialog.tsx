import { AlertDialog } from "radix-ui";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ErrorSummary } from "../components/ui/forms/ErrorSummary.js";
import { FieldError, Input } from "../components/ui/forms/Field.js";
import { Dialog, dialogButton } from "../components/ui/overlays/Dialog.js";
import { useFormErrors } from "../lib/useFormErrors.js";
import type { KcalBackfill } from "./foods.js";

const ORDER = ["day"] as const;

interface KcalUpdateDialogProps {
  /** "Salmon kibbles changed from 370 to 365 kcal per 100 g." */
  description: string;
  today: string;
  /** While the save is on its way, so a second tap doesn't send it again. */
  pending: boolean;
  onSave: (backfill: KcalBackfill) => void;
  onCancel: () => void;
}

/** Asked when a food's kcal changes: which past feeds should take the new value. */
export function KcalUpdateDialog({
  description,
  today,
  pending,
  onSave,
  onCancel,
}: KcalUpdateDialogProps) {
  const { t } = useTranslation();
  const [scope, setScope] = useState<KcalBackfill["scope"]>("since");
  const [day, setDay] = useState(today);
  // The picker stops at today, but a typed date can still be later.
  const dayValid = scope !== "since" || (day !== "" && day <= today);
  const errors = useFormErrors(new Map(dayValid ? [] : [["day", "day"] as const]), ORDER, "kcal");
  const dayError = errors.problemOf("day") && t("kcalUpdate.errors.day");
  const dayId = errors.idOf("day");
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
            disabled={pending}
            onClick={() => {
              if (!errors.reject()) {
                onSave(scope === "since" ? { scope, day } : { scope });
              }
            }}
          >
            {t("kcalUpdate.save")}
          </button>
          <AlertDialog.Cancel className={dialogButton.secondary}>
            {t("action.cancel")}
          </AlertDialog.Cancel>
        </>
      }
    >
      <ErrorSummary inSheet names={errors.shown.map(() => t("kcalUpdate.errorNames.day"))} />
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
                <label htmlFor={dayId} className="sr-only">
                  {t("kcalUpdate.sinceLabel")}
                </label>
                <Input
                  id={dayId}
                  type="date"
                  max={today}
                  value={day}
                  onChange={(event) => setDay(event.target.value)}
                  onBlur={errors.recheck("day")}
                  aria-invalid={dayError ? true : undefined}
                  aria-describedby={dayError ? `${dayId}-error` : undefined}
                />
                {dayError && <FieldError id={`${dayId}-error`}>{dayError}</FieldError>}
              </div>
            )}
          </div>
        ))}
      </fieldset>
    </Dialog>
  );
}
