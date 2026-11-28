import { listRow } from "../components/ui/layout/List.js";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { ChevronRightIcon } from "../components/icons.js";
import { button } from "../components/ui/forms/button.js";
import { Select } from "../components/ui/forms/Select.js";
import { TimeZonePicker } from "./TimeZonePicker.js";
import { Card, CardHeading } from "../components/ui/layout/Card.js";
import { SubPageHeader } from "../components/ui/layout/PageHeader.js";
import { Field } from "../components/ui/forms/Field.js";
import { useAuth, useLogOut } from "../access/auth.js";
import { useDemo } from "../lib/instance.js";
import { AboutCard } from "./AboutCard.js";
import { BackupsCard } from "./BackupsCard.js";
import {
  bodyOf,
  useSaveSettings,
  useSettings,
  type Settings,
  type SettingsBody,
} from "./settings.js";
import { parseTime, useTypedSetting } from "./useTypedSetting.js";

const LANGUAGES = [
  { code: "en-GB", label: "English (UK)" },
  { code: "fr", label: "Français" },
] as const;

// i18next-browser-languagedetector reads an explicit choice from this key.
const LANGUAGE_KEY = "i18nextLng";

function TypeLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className={`flex min-h-14 items-center justify-between gap-3 text-base desktop:min-h-[52px] ${listRow}`}
    >
      {label}
      <span className="flex text-muted-foreground">
        <ChevronRightIcon size={20} />
      </span>
    </Link>
  );
}

function SettingsForm({ settings }: { settings: Settings }) {
  const { t, i18n } = useTranslation();
  const save = useSaveSettings();
  const { data: auth } = useAuth();
  const demo = useDemo();
  const logOut = useLogOut();

  const commit = (changes: Partial<SettingsBody>) =>
    save.mutate({ ...bodyOf(settings), ...changes });
  const dayStartsAt = useTypedSetting(settings.dayStartsAt, parseTime, (value) =>
    commit({ dayStartsAt: value }),
  );

  return (
    <div className="flex flex-col gap-3.5 px-5 pt-1 pb-6 desktop:grid desktop:grid-cols-2 desktop:items-start desktop:gap-6 desktop:p-0">
      <div className="flex flex-col gap-3.5 desktop:gap-6">
        <Card>
          <CardHeading title={t("settings.general")} />
          <Select
            id="settings-language"
            label={t("settings.language")}
            value={i18n.resolvedLanguage ?? "en-GB"}
            hint={t("settings.languageHint")}
            options={LANGUAGES.map(({ code, label }) => ({ value: code, label, lang: code }))}
            onChange={(language) => {
              try {
                localStorage.setItem(LANGUAGE_KEY, language);
              } catch {
                // Without storage the choice lasts until the page reloads.
              }
              void i18n.changeLanguage(language);
            }}
          />
          <TimeZonePicker
            id="settings-time-zone"
            value={settings.timeZone}
            disabled={demo}
            hint={demo ? t("demo.fixed") : undefined}
            onChange={(timeZone) => commit({ timeZone })}
          />
          <Field
            id="settings-dayStartsAt"
            type="time"
            label={t("settings.dayStartsAt")}
            value={dayStartsAt.text}
            onChange={dayStartsAt.setText}
            onBlur={dayStartsAt.onBlur}
            disabled={demo}
            hint={t(demo ? "demo.fixed" : "settings.dayStartsAtHint")}
            error={dayStartsAt.invalid ? t("settings.errors.time") : undefined}
          />
        </Card>

        <Card>
          <CardHeading title={t("settings.petsAndFood")} />
          <div>
            <TypeLink to="/settings/pet-types" label={t("types.pet.title")} />
            <TypeLink to="/settings/food-types" label={t("types.food.title")} />
          </div>
        </Card>
      </div>
      <div className="flex flex-col gap-3.5 desktop:gap-6">
        {!demo && <BackupsCard settings={settings} commit={commit} />}
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
        <AboutCard />
      </div>
    </div>
  );
}

export function SettingsScreen() {
  const { t } = useTranslation();
  const { data: settings } = useSettings();

  return (
    <div className="flex flex-col desktop:gap-6">
      <SubPageHeader
        title={t("nav.settings")}
        phoneLink={{ to: "/", label: t("settings.back") }}
        returns
      />
      {settings && <SettingsForm settings={settings} />}
    </div>
  );
}
