import { AlertDialog } from "radix-ui";
import { useTranslation } from "react-i18next";
import { useSnackbar } from "../components/ui/feedback/Snackbar.js";
import { formatReadingKg } from "../lib/format.js";
import { useSetTarget } from "../lib/pets.js";
import { useAnswerAgePrompt, type TargetPrompt } from "../lib/weights.js";

const action =
  "inline-flex h-[52px] w-full cursor-pointer items-center justify-center rounded-xl text-base font-semibold desktop:h-11 desktop:w-auto desktop:rounded-[10px] desktop:px-[18px] desktop:text-[15px]";

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

  return (
    <AlertDialog.Root open>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-10 bg-[rgba(31,42,68,0.45)]" />
        <AlertDialog.Content className="fixed inset-x-5 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-4 rounded-2xl bg-card p-[22px] shadow-[0_12px_32px_rgba(31,42,68,0.25)] desktop:inset-x-auto desktop:top-[140px] desktop:left-1/2 desktop:w-[min(460px,calc(100%-32px))] desktop:-translate-x-1/2 desktop:translate-y-0 desktop:gap-[18px] desktop:p-6 desktop:shadow-[0_20px_48px_rgba(31,42,68,0.3)]">
          <div className="flex flex-col gap-1.5">
            <AlertDialog.Title className="font-display text-title font-semibold desktop:text-2xl">
              {t("targetPrompt.title")}
            </AlertDialog.Title>
            <AlertDialog.Description className="text-[15px] leading-[22px] text-muted-foreground">
              {description}
            </AlertDialog.Description>
          </div>
          <div className="flex gap-2.5">
            <div className="flex flex-1 flex-col gap-0.5 rounded-[10px] bg-muted p-3">
              <span className="text-caption text-muted-foreground">
                {t("targetPrompt.current")}
              </span>
              <span className="flex items-baseline gap-1">
                <span className="font-display text-2xl font-semibold tabular-nums">
                  {prompt.currentKcal}
                </span>
                <span className="text-[13px] text-muted-foreground">{t("feed.kcal")}</span>
              </span>
            </div>
            <div className="flex flex-1 flex-col gap-0.5 rounded-[10px] bg-accent-soft p-3">
              <span className="text-caption text-[#6A4A33]">{t("targetPrompt.suggested")}</span>
              <span className="flex items-baseline gap-1">
                <span className="font-display text-2xl font-semibold tabular-nums">
                  {prompt.suggestedKcal}
                </span>
                <span className="text-[13px] text-muted-foreground">{t("feed.kcal")}</span>
              </span>
            </div>
          </div>
          <span className="text-[13px] text-muted-foreground">{t("targetPrompt.applies")}</span>
          <div className="flex flex-col gap-2 desktop:flex-row-reverse desktop:justify-start desktop:gap-2.5">
            <button
              type="button"
              className={`${action} bg-primary`}
              disabled={setTarget.isPending || answerAge.isPending}
              onClick={() => answer(true)}
            >
              {t("targetPrompt.update", { kcal: prompt.suggestedKcal })}
            </button>
            <button
              type="button"
              className={`${action} border border-border bg-card`}
              disabled={setTarget.isPending || answerAge.isPending}
              onClick={() => answer(false)}
            >
              {t("targetPrompt.keep", { kcal: prompt.currentKcal })}
            </button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
