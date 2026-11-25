import { useTranslation } from "react-i18next";
import { BackIcon, ChevronRightIcon } from "../components/icons.js";
import { Segmented } from "../components/ui/forms/Segmented.js";

export type Period = "day" | "week" | "month";

/** What each period's view gets from the Insights screen. */
export interface PeriodViewProps {
  petId: number;
  today: string;
  onPeriod: (period: Period) => void;
}

export function PeriodBar({
  period,
  onPeriod,
  label,
  previousLabel,
  nextLabel,
  onPrevious,
  onNext,
  atLatest,
}: {
  period: Period;
  onPeriod: (period: Period) => void;
  label: string;
  previousLabel: string;
  nextLabel: string;
  onPrevious: () => void;
  onNext: () => void;
  /** Nothing lies ahead of the current period. */
  atLatest: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-3 desktop:flex-row desktop:flex-wrap desktop:items-center desktop:justify-between desktop:gap-4">
      <div className="desktop:w-80">
        <Segmented
          label={t("insights.period")}
          hideLabel
          value={period}
          onChange={onPeriod}
          options={[
            { value: "day", label: t("insights.day") },
            { value: "week", label: t("insights.week") },
            { value: "month", label: t("insights.month") },
          ]}
        />
      </div>
      <div className="flex items-center justify-between desktop:gap-1">
        <button
          type="button"
          aria-label={previousLabel}
          onClick={onPrevious}
          className="flex size-11 cursor-pointer items-center justify-center rounded-full"
        >
          <BackIcon />
        </button>
        <span aria-live="polite" className="min-w-[120px] text-center text-[15px] font-semibold">
          {label}
        </span>
        <button
          type="button"
          aria-label={nextLabel}
          disabled={atLatest}
          onClick={onNext}
          className="flex size-11 cursor-pointer items-center justify-center rounded-full disabled:cursor-default disabled:text-border"
        >
          <ChevronRightIcon />
        </button>
      </div>
    </div>
  );
}
