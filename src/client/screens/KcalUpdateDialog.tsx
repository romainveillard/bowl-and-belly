import { AlertDialog } from "radix-ui";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { inputClass } from "../components/ui/forms/Field.js";
import type { KcalBackfill } from "../lib/foods.js";

interface KcalUpdateDialogProps {
  /** "Salmon kibbles changed from 370 to 365 kcal per 100 g." */
  description: string;
  today: string;
  onSave: (backfill: KcalBackfill) => void;
  onCancel: () => void;
}

const action =
  "inline-flex h-[52px] w-full cursor-pointer items-center justify-center rounded-xl text-base font-semibold desktop:h-11 desktop:w-auto desktop:rounded-[10px] desktop:px-[18px] desktop:text-[15px]";

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
    <AlertDialog.Root open onOpenChange={(open) => !open && onCancel()}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-10 bg-[rgba(31,42,68,0.45)]" />
        <AlertDialog.Content className="fixed inset-x-4 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-3.5 rounded-2xl bg-card px-[18px] py-[22px] shadow-[0_12px_32px_rgba(31,42,68,0.25)] desktop:inset-x-auto desktop:top-[140px] desktop:left-1/2 desktop:w-[min(460px,calc(100%-32px))] desktop:-translate-x-1/2 desktop:translate-y-0 desktop:gap-[18px] desktop:p-6 desktop:shadow-[0_20px_48px_rgba(31,42,68,0.3)]">
          <div className="flex flex-col gap-1.5">
            <AlertDialog.Title className="font-display text-title font-semibold desktop:text-2xl">
              {t("kcalUpdate.title")}
            </AlertDialog.Title>
            <AlertDialog.Description className="text-[15px] leading-[22px] text-muted-foreground">
              {description}
            </AlertDialog.Description>
          </div>
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
          <div className="flex flex-col gap-2 desktop:flex-row-reverse desktop:justify-start desktop:gap-2.5">
            <button
              type="button"
              className={`${action} bg-primary`}
              disabled={scope === "since" && day === ""}
              onClick={() => onSave(scope === "since" ? { scope, day } : { scope })}
            >
              {t("kcalUpdate.save")}
            </button>
            <AlertDialog.Cancel className={`${action} border border-border bg-card`}>
              {t("action.cancel")}
            </AlertDialog.Cancel>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
