import { useTranslation } from "react-i18next";

const REPOSITORY = "https://github.com/romainveillard/bowl-and-belly";

/** A strip across the top on a phone; a box above the content on desktop. */
export function DemoBanner() {
  const { t } = useTranslation();

  return (
    <p className="flex flex-none flex-wrap items-center justify-center gap-x-2.5 gap-y-1 bg-wet px-4 py-2.5 text-center text-[13px] font-semibold text-wet-foreground desktop:mb-6 desktop:justify-start desktop:gap-x-3 desktop:rounded-xl desktop:px-[18px] desktop:py-3 desktop:text-left desktop:text-sm">
      <span>{t("demo.banner")}</span>
      <a href={REPOSITORY} className="text-wet-foreground underline">
        {t("demo.link")}
      </a>
    </p>
  );
}
