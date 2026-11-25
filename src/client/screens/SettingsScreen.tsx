import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import {
  AlertIcon,
  BackIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  DownloadIcon,
} from "../components/icons.js";
import { button } from "../components/ui/button.js";
import { Card, CardHeading } from "../components/ui/Card.js";
import { Field, inputClass } from "../components/ui/Field.js";
import { Segmented } from "../components/ui/Segmented.js";
import { Switch } from "../components/ui/Switch.js";
import { useAuth, useLogOut } from "../lib/auth.js";
import { formatTime, formatWhen } from "../lib/format.js";
import { useDemo } from "../lib/instance.js";
import {
  useBackUpNow,
  useSaveSettings,
  useSettings,
  type Settings,
  type SettingsBody,
} from "../lib/settings.js";

const LANGUAGES = [
  { code: "en-GB", label: "English (UK)" },
  { code: "fr", label: "Français" },
] as const;

// i18next-browser-languagedetector reads an explicit choice from this key.
const LANGUAGE_KEY = "i18nextLng";

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

function Select({
  id,
  label,
  value,
  onChange,
  hint,
  disabled = false,
  children,
}: {
  id: string;
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  hint?: string;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <span className="relative">
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className={`${inputClass} appearance-none pr-11`}
        >
          {children}
        </select>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-3 right-3.5 text-muted-foreground"
        >
          <ChevronDownIcon size={20} />
        </span>
      </span>
      {hint && <span className="text-[13px] text-muted-foreground">{hint}</span>}
    </div>
  );
}

function TypeLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="flex min-h-14 items-center justify-between gap-3 border-t border-border text-base first:border-t-0 desktop:min-h-[52px]"
    >
      {label}
      <span className="flex text-muted-foreground">
        <ChevronRightIcon size={20} />
      </span>
    </Link>
  );
}

function bodyOf(settings: Settings): SettingsBody {
  return {
    timeZone: settings.timeZone,
    dayStartsAt: settings.dayStartsAt,
    backupEnabled: settings.backupEnabled,
    backupFrequency: settings.backupFrequency,
    backupWeekday: settings.backupWeekday,
    backupTime: settings.backupTime,
    backupKeep: settings.backupKeep,
  };
}

function timeZones(current: string): string[] {
  const zones = Intl.supportedValuesOf("timeZone");
  return zones.includes(current) ? zones : [current, ...zones];
}

function SettingsForm({ settings }: { settings: Settings }) {
  const { t, i18n } = useTranslation();
  const save = useSaveSettings();
  const backUpNow = useBackUpNow();
  const { data: auth } = useAuth();
  const demo = useDemo();
  const logOut = useLogOut();
  const [saved, setSaved] = useState(() => bodyOf(settings));
  const [dayStartsAt, setDayStartsAt] = useState(settings.dayStartsAt);
  const [backupTime, setBackupTime] = useState(settings.backupTime);
  const [keep, setKeep] = useState(String(settings.backupKeep));
  const [invalid, setInvalid] = useState<ReadonlySet<"dayStartsAt" | "backupTime" | "keep">>(
    new Set(),
  );
  const [openedAt] = useState(() => new Date());
  const when = (iso: string, future: boolean) =>
    formatWhen(
      iso,
      { now: openedAt, timeZone: settings.timeZone, future, locale: i18n.language },
      t,
    );

  const commit = (changes: Partial<SettingsBody>) => {
    const next = { ...saved, ...changes };
    setSaved(next);
    save.mutate(next);
  };

  /** Saves a typed field when it is left, or marks it invalid. */
  const commitTyped =
    (
      field: "dayStartsAt" | "backupTime" | "keep",
      value: SettingsBody[keyof SettingsBody] | null,
    ) =>
    () => {
      setInvalid((current) => {
        const next = new Set(current);
        if (value === null) {
          next.add(field);
        } else {
          next.delete(field);
        }
        return next;
      });
      const key = field === "keep" ? "backupKeep" : field;
      if (value !== null && value !== saved[key]) {
        commit({ [key]: value });
      }
    };
  const keepValue = /^\d+$/.test(keep.trim()) ? Number(keep) : null;

  const weekdays = Array.from({ length: 7 }, (_, index) => ({
    value: index + 1,
    // 1 January 2024 was a Monday.
    label: new Intl.DateTimeFormat(i18n.language, { weekday: "long", timeZone: "UTC" }).format(
      Date.UTC(2024, 0, index + 1),
    ),
  }));

  let note: string | undefined;
  if (settings.backupError === null) {
    if (!saved.backupEnabled) {
      note = t("settings.backups.off");
    } else if (settings.lastBackupAt) {
      note = t("settings.backups.last", { when: when(settings.lastBackupAt, false) });
    } else if (settings.nextBackupAt) {
      note = t("settings.backups.first", { when: when(settings.nextBackupAt, true) });
    }
  }

  // Beside the time for daily backups; on its own row once the day takes that place.
  const keepField = (
    <Field
      id="settings-keep"
      label={t("settings.backups.keep")}
      inputMode="numeric"
      value={keep}
      onChange={setKeep}
      onBlur={commitTyped(
        "keep",
        keepValue !== null && keepValue >= 1 && keepValue <= 999 ? keepValue : null,
      )}
      error={invalid.has("keep") ? t("settings.errors.keep") : undefined}
    />
  );

  const downloadButton = (
    <a href="/api/backups/download" download className={`${button.outline} self-start`}>
      <DownloadIcon size={18} />
      {t("settings.backups.download")}
    </a>
  );

  const general = (
    <Card>
      <CardHeading title={t("settings.general")} />
      <Select
        id="settings-language"
        label={t("settings.language")}
        value={i18n.resolvedLanguage ?? "en-GB"}
        hint={t("settings.languageHint")}
        onChange={(language) => {
          try {
            localStorage.setItem(LANGUAGE_KEY, language);
          } catch {
            // Without storage the choice lasts until the page reloads.
          }
          void i18n.changeLanguage(language);
        }}
      >
        {LANGUAGES.map((language) => (
          <option key={language.code} value={language.code} lang={language.code}>
            {language.label}
          </option>
        ))}
      </Select>
      <Select
        id="settings-time-zone"
        label={t("settings.timeZone")}
        value={saved.timeZone}
        disabled={demo}
        {...(demo ? { hint: t("demo.fixed") } : {})}
        onChange={(timeZone) => commit({ timeZone })}
      >
        {timeZones(saved.timeZone).map((zone) => (
          <option key={zone} value={zone}>
            {zone}
          </option>
        ))}
      </Select>
      <Field
        id="settings-dayStartsAt"
        type="time"
        label={t("settings.dayStartsAt")}
        value={dayStartsAt}
        onChange={setDayStartsAt}
        onBlur={commitTyped("dayStartsAt", TIME.test(dayStartsAt) ? dayStartsAt : null)}
        disabled={demo}
        hint={t(demo ? "demo.fixed" : "settings.dayStartsAtHint")}
        error={invalid.has("dayStartsAt") ? t("settings.errors.time") : undefined}
      />
    </Card>
  );

  const petsAndFood = (
    <Card>
      <CardHeading title={t("settings.petsAndFood")} />
      <div>
        <TypeLink to="/settings/pet-types" label={t("types.pet.title")} />
        <TypeLink to="/settings/food-types" label={t("types.food.title")} />
      </div>
    </Card>
  );

  const failedAt = settings.backupFailedAt && new Date(settings.backupFailedAt);
  const backups = (
    <Card>
      <CardHeading title={t("settings.backups.title")} hint={note} />
      {settings.backupError !== null && failedAt && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-[10px] bg-danger-soft px-3.5 py-3 text-sm leading-5 text-danger-strong"
        >
          <span className="flex-none">
            <AlertIcon size={18} />
          </span>
          <span>
            <strong>{t("settings.backups.failed")}</strong>{" "}
            {t("settings.backups.failedDetail", {
              date: new Intl.DateTimeFormat(i18n.language, {
                day: "numeric",
                month: "short",
                timeZone: settings.timeZone,
              }).format(failedAt),
              time: formatTime(failedAt, settings.timeZone, i18n.language),
              reason: t(`settings.backups.errors.${settings.backupError}`),
            })}
            {saved.backupEnabled && ` ${t("settings.backups.retry")}`}
          </span>
        </div>
      )}
      <div className="flex items-center justify-between gap-3">
        <span className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold">{t("settings.backups.scheduled")}</span>
          <span className="text-[13px] text-muted-foreground">
            {t("settings.backups.scheduledHint")}
          </span>
        </span>
        <Switch
          label={t("settings.backups.scheduled")}
          checked={saved.backupEnabled}
          onCheckedChange={(backupEnabled) => commit({ backupEnabled })}
        />
      </div>
      {saved.backupEnabled && (
        <>
          <Segmented
            label={t("settings.backups.frequency")}
            value={saved.backupFrequency}
            onChange={(backupFrequency) =>
              commit({
                backupFrequency,
                // Sunday, unless a day was chosen before.
                backupWeekday: saved.backupWeekday ?? 7,
              })
            }
            options={[
              { value: "daily", label: t("settings.backups.daily") },
              { value: "weekly", label: t("settings.backups.weekly") },
            ]}
          />
          <div className="grid grid-cols-2 items-start gap-3 desktop:gap-4">
            {saved.backupFrequency === "weekly" && (
              <Select
                id="settings-weekday"
                label={t("settings.backups.day")}
                value={saved.backupWeekday ?? 7}
                onChange={(day) => commit({ backupWeekday: Number(day) })}
              >
                {weekdays.map((day) => (
                  <option key={day.value} value={day.value}>
                    {day.label}
                  </option>
                ))}
              </Select>
            )}
            <Field
              id="settings-backupTime"
              type="time"
              label={t("settings.backups.time")}
              value={backupTime}
              onChange={setBackupTime}
              onBlur={commitTyped("backupTime", TIME.test(backupTime) ? backupTime : null)}
              error={invalid.has("backupTime") ? t("settings.errors.time") : undefined}
            />
            {saved.backupFrequency === "daily" && keepField}
          </div>
          {saved.backupFrequency === "weekly" && keepField}
        </>
      )}
      {settings.backupError === null ? (
        downloadButton
      ) : (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={button.outline}
            disabled={backUpNow.isPending}
            onClick={() => backUpNow.mutate()}
          >
            {t("settings.backups.backUpNow")}
          </button>
          {downloadButton}
        </div>
      )}
    </Card>
  );

  return (
    <div className="flex flex-col gap-3.5 px-5 pt-1 pb-6 desktop:grid desktop:grid-cols-2 desktop:items-start desktop:gap-6 desktop:p-0">
      <div className="flex flex-col gap-3.5 desktop:gap-6">
        {general}
        {petsAndFood}
      </div>
      <div className="flex flex-col gap-3.5 desktop:gap-6">
        {!demo && backups}
        {!demo && auth?.passwordRequired && (
          <Card>
            <CardHeading title={t("settings.access.title")} hint={t("settings.access.hint")} />
            <button
              type="button"
              className={`${button.outline} self-start`}
              disabled={logOut.isPending}
              onClick={() => logOut.mutate()}
            >
              {t("settings.access.logOut")}
            </button>
          </Card>
        )}
      </div>
      <span className="self-center text-[13px] text-muted-foreground desktop:hidden">
        {t("settings.version", { version: APP_VERSION })}
      </span>
    </div>
  );
}

export function SettingsScreen() {
  const { t } = useTranslation();
  const { data: settings } = useSettings();

  return (
    <div className="flex flex-col desktop:gap-6">
      <header className="flex items-center gap-2 px-3 pt-3.5 pb-2.5 desktop:hidden">
        <Link to="/" aria-label={t("settings.back")} className={button.icon}>
          <BackIcon />
        </Link>
        <h1 className="font-display text-[26px] font-semibold">{t("nav.settings")}</h1>
      </header>
      <header className="hidden desktop:block">
        <h1 className="font-display text-[34px] leading-10 font-semibold tracking-[-0.5px]">
          {t("nav.settings")}
        </h1>
      </header>
      {settings && <SettingsForm settings={settings} />}
    </div>
  );
}
