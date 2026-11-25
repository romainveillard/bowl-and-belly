import { useTranslation } from "react-i18next";
import { formatTime } from "../lib/format.js";
import { FieldError, Input } from "../components/ui/forms/Field.js";

interface LeftoverPromptProps {
  id: string;
  /** The pet's previous feed, whose leftover is asked for. */
  previous: { fedAt: string; foodName: string | null; servedG: number };
  timeZone: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  error?: string | undefined;
}

/** "Left over from 14:30?", asked on the log form; empty means nothing was left. */
export function LeftoverPrompt({
  id,
  previous,
  timeZone,
  value,
  onChange,
  onBlur,
  error,
}: LeftoverPromptProps) {
  const { t, i18n } = useTranslation();
  const errorId = `${id}-error`;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2.5 rounded-xl bg-accent-soft p-3 desktop:gap-3 desktop:px-3.5">
        <label htmlFor={id} className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-sm font-semibold">
            {t("logFeed.leftoverQuestion", {
              time: formatTime(previous.fedAt, timeZone, i18n.language),
            })}
          </span>
          <span className="truncate text-[13px] text-accent-foreground">
            {t("logFeed.leftoverFood", { name: previous.foodName ?? "", served: previous.servedG })}
          </span>
        </label>
        <Input
          id={id}
          inputMode="numeric"
          placeholder="0"
          suffix={t("common.g")}
          boxClassName="w-24 flex-none desktop:w-[110px]"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
        />
      </div>
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </div>
  );
}
