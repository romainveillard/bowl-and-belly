import { useTranslation } from "react-i18next";
import { AlertIcon } from "../icons.js";

/** "2 things to fix before saving: name and current weight." Nothing when the list is empty. */
export function ErrorSummary({ names }: { names: string[] }) {
  const { t, i18n } = useTranslation();

  if (names.length === 0) {
    return null;
  }
  return (
    <div
      role="alert"
      className="mx-5 mb-3.5 flex items-start gap-2.5 rounded-xl bg-danger-soft px-3.5 py-3 text-sm leading-5 text-danger-strong desktop:m-0 desktop:px-4 desktop:py-3.5 desktop:text-[15px] desktop:leading-[22px]"
    >
      <span className="flex-none">
        <AlertIcon size={20} />
      </span>
      <span>
        <strong>{t("form.thingsToFix", { count: names.length })}</strong>{" "}
        {new Intl.ListFormat(i18n.language, { type: "conjunction" }).format(names)}.
      </span>
    </div>
  );
}
