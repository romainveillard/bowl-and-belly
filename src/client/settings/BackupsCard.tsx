import { useState } from "react";
import { useTranslation } from "react-i18next";
import { DownloadIcon } from "../components/icons.js";
import { Notice } from "../components/ui/feedback/Notice.js";
import { button } from "../components/ui/forms/button.js";
import { Field } from "../components/ui/forms/Field.js";
import { Segmented } from "../components/ui/forms/Segmented.js";
import { Select } from "../components/ui/forms/Select.js";
import { SwitchRow } from "../components/ui/forms/SwitchRow.js";
import { Card, CardHeading } from "../components/ui/layout/Card.js";
import { formatTime, formatWhen } from "../lib/format.js";
import { useBackUpNow, type Settings, type SettingsBody } from "./settings.js";
import { parseTime, useTypedSetting } from "./useTypedSetting.js";

const parseKeep = (text: string) => {
  const keep = /^\d+$/.test(text.trim()) ? Number(text) : null;
  return keep !== null && keep >= 1 && keep <= 999 ? keep : null;
};

/** Scheduled backups, the last failure if any, and a download of the database. */
export function BackupsCard({
  settings,
  commit,
}: {
  settings: Settings;
  commit: (changes: Partial<SettingsBody>) => void;
}) {
  const { t, i18n } = useTranslation();
  const backUpNow = useBackUpNow();
  const [openedAt] = useState(() => new Date());
  const time = useTypedSetting(settings.backupTime, parseTime, (backupTime) =>
    commit({ backupTime }),
  );
  const keep = useTypedSetting(settings.backupKeep, parseKeep, (backupKeep) =>
    commit({ backupKeep }),
  );
  const when = (iso: string, future: boolean) =>
    formatWhen(
      iso,
      { now: openedAt, timeZone: settings.timeZone, future, locale: i18n.language },
      t,
    );

  const weekdays = Array.from({ length: 7 }, (_, index) => ({
    value: index + 1,
    // 1 January 2024 was a Monday.
    label: new Intl.DateTimeFormat(i18n.language, { weekday: "long", timeZone: "UTC" }).format(
      Date.UTC(2024, 0, index + 1),
    ),
  }));

  let note: string | undefined;
  if (settings.backupError === null) {
    if (!settings.backupEnabled) {
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
      value={keep.text}
      onChange={keep.setText}
      onBlur={keep.onBlur}
      error={keep.invalid ? t("settings.errors.keep") : undefined}
    />
  );

  const downloadButton = (
    <a href="/api/backups/download" download className={`${button.outline} self-start`}>
      <DownloadIcon size={18} />
      {t("settings.backups.download")}
    </a>
  );

  const failedAt = settings.backupFailedAt && new Date(settings.backupFailedAt);

  return (
    <Card>
      <CardHeading title={t("settings.backups.title")} hint={note} />
      {settings.backupError !== null && failedAt && (
        <Notice tone="danger" role="alert">
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
          {settings.backupEnabled && ` ${t("settings.backups.retry")}`}
        </Notice>
      )}
      <SwitchRow
        label={t("settings.backups.scheduled")}
        hint={t("settings.backups.scheduledHint")}
        checked={settings.backupEnabled}
        onCheckedChange={(backupEnabled) => commit({ backupEnabled })}
      />
      {settings.backupEnabled && (
        <>
          <Segmented
            label={t("settings.backups.frequency")}
            value={settings.backupFrequency}
            onChange={(backupFrequency) =>
              commit({
                backupFrequency,
                // Sunday, unless a day was chosen before.
                backupWeekday: settings.backupWeekday ?? 7,
              })
            }
            options={[
              { value: "daily", label: t("settings.backups.daily") },
              { value: "weekly", label: t("settings.backups.weekly") },
            ]}
          />
          <div className="grid grid-cols-2 items-start gap-3 desktop:gap-4">
            {settings.backupFrequency === "weekly" && (
              <Select
                id="settings-weekday"
                label={t("settings.backups.day")}
                value={String(settings.backupWeekday ?? 7)}
                options={weekdays.map((day) => ({ value: String(day.value), label: day.label }))}
                onChange={(day) => commit({ backupWeekday: Number(day) })}
              />
            )}
            <Field
              id="settings-backupTime"
              type="time"
              label={t("settings.backups.time")}
              value={time.text}
              onChange={time.setText}
              onBlur={time.onBlur}
              error={time.invalid ? t("settings.errors.time") : undefined}
            />
            {settings.backupFrequency === "daily" && keepField}
          </div>
          {settings.backupFrequency === "weekly" && keepField}
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
}
