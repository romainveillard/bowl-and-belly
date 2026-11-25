import { useTranslation } from "react-i18next";

/** "–" where there is no figure yet, read out as words rather than "en dash". */
export function NoValue() {
  const { t } = useTranslation();
  return (
    <>
      <span aria-hidden="true">–</span>
      <span className="sr-only">{t("common.noValue")}</span>
    </>
  );
}

/** "/ 260 kcal" after what was eaten, read out as "of 260 kcal" rather than "slash". */
export function OfTarget({ target }: { target: number }) {
  const { t } = useTranslation();
  return (
    <>
      <span aria-hidden="true">{t("common.ofTarget", { target })}</span>
      <span className="sr-only">{t("common.ofTargetSpoken", { target })}</span>
    </>
  );
}
