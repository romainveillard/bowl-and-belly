import { AlertDialog } from "radix-ui";
import { useTranslation } from "react-i18next";
import { useSnackbar } from "../components/ui/feedback/Snackbar.js";
import { Dialog, dialogButton } from "../components/ui/overlays/Dialog.js";
import { formatReadingKg } from "../lib/format.js";
import { useSetTarget } from "./pets.js";
import { useAnswerAgePrompt, type TargetPrompt } from "./weights.js";

/**
 * "Update daily target?" after a weigh-in or on reaching an age step. The
 * target only changes if the user says so, and then from today.
 */
export function TargetPromptDialog({
  petId,
  petName,
  prompt,
  onClose,
}: {
  petId: number;
  petName: string;
  prompt: TargetPrompt;
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation();
  const setTarget = useSetTarget(petId);
  const answerAge = useAnswerAgePrompt(petId);
  const showSnackbar = useSnackbar();
  const kg = (weightG: number) => formatReadingKg(weightG, i18n.language);

  let description: string;
  if (prompt.reason === "age") {
    description = t(prompt.months === 4 ? "targetPrompt.age4" : "targetPrompt.age12", {
      name: petName,
    });
  } else if (prompt.previousWeightG === null) {
    description = t("targetPrompt.weightNoPrevious", {
      name: petName,
      weight: kg(prompt.weightG ?? 0),
    });
  } else {
    description = t("targetPrompt.weight", {
      name: petName,
      weight: kg(prompt.weightG ?? 0),
      previous: kg(prompt.previousWeightG),
    });
  }

  const answer = (update: boolean) => {
    const done = () => {
      if (update) {
        showSnackbar(t("target.changed", { kcal: prompt.suggestedKcal }));
      }
      onClose();
    };
    if (prompt.reason === "age") {
      answerAge.mutate({ months: prompt.months, update }, { onSuccess: done });
    } else if (update) {
      setTarget.mutate(null, { onSuccess: done });
    } else {
      done();
    }
  };

  const answering = setTarget.isPending || answerAge.isPending;

  return (
    <Dialog
      open
      title={t("targetPrompt.title")}
      description={description}
      actions={
        <>
          <button
            type="button"
            className={dialogButton.primary}
            disabled={answering}
            onClick={() => answer(true)}
          >
            {t("targetPrompt.update", { kcal: prompt.suggestedKcal })}
          </button>
          {/* Radix focuses the Cancel part when the dialog opens: keeping the target is the safe default. */}
          <AlertDialog.Cancel asChild>
            <button
              type="button"
              className={dialogButton.secondary}
              disabled={answering}
              onClick={() => answer(false)}
            >
              {t("targetPrompt.keep", { kcal: prompt.currentKcal })}
            </button>
          </AlertDialog.Cancel>
        </>
      }
    >
      <div className="flex gap-2.5">
        <div className="flex flex-1 flex-col gap-0.5 rounded-[10px] bg-muted p-3">
          <span className="text-caption text-muted-foreground">{t("targetPrompt.current")}</span>
          <span className="flex items-baseline gap-1">
            <span className="font-display text-2xl font-semibold tabular-nums">
              {prompt.currentKcal}
            </span>
            <span className="text-[13px] text-muted-foreground">{t("common.kcal")}</span>
          </span>
        </div>
        <div className="flex flex-1 flex-col gap-0.5 rounded-[10px] bg-accent-soft p-3">
          <span className="text-caption text-accent-foreground">{t("targetPrompt.suggested")}</span>
          <span className="flex items-baseline gap-1">
            <span className="font-display text-2xl font-semibold tabular-nums">
              {prompt.suggestedKcal}
            </span>
            <span className="text-[13px] text-muted-foreground">{t("common.kcal")}</span>
          </span>
        </div>
      </div>
      <span className="text-[13px] text-muted-foreground">{t("targetPrompt.applies")}</span>
    </Dialog>
  );
}
