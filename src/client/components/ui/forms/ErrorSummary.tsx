import { useTranslation } from "react-i18next";
import { Notice } from "../feedback/Notice.js";

/** "2 things to fix before saving: name and current weight." Nothing when the list is empty. */
export function ErrorSummary({ names, inSheet = false }: { names: string[]; inSheet?: boolean }) {
  const { t, i18n } = useTranslation();

  if (names.length === 0) {
    return null;
  }
  return (
    <Notice tone="danger" role="alert" className={inSheet ? "" : "mx-5 mb-3.5 desktop:m-0"}>
      <strong>{t("form.thingsToFix", { count: names.length })}</strong>{" "}
      {new Intl.ListFormat(i18n.language, { type: "conjunction" }).format(names)}.
    </Notice>
  );
}
