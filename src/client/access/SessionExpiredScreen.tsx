import { useTranslation } from "react-i18next";
import { LockIcon, RefreshIcon } from "../components/icons.js";
import { button } from "../components/ui/forms/button.js";
import { accessCard, accessPage } from "./layout.js";

export function SessionExpiredScreen() {
  const { t } = useTranslation();

  return (
    <main className={accessPage}>
      <section
        className={`${accessCard} items-center gap-3.5 px-8 pb-[60px] text-center desktop:max-w-[460px] desktop:px-9 desktop:py-11`}
      >
        <span
          aria-hidden="true"
          className="flex size-[72px] items-center justify-center rounded-[18px] bg-accent-soft text-primary-strong"
        >
          <LockIcon size={34} />
        </span>
        <h1 className="mt-2 font-display text-[26px] font-semibold desktop:text-[28px]">
          {t("sessionExpired.title")}
        </h1>
        <p className="max-w-[300px] text-[15px] leading-[22px] text-muted-foreground desktop:max-w-[360px] desktop:text-base desktop:leading-6">
          <span className="desktop:hidden">{t("sessionExpired.bodyPhone")}</span>
          <span className="hidden desktop:inline">{t("sessionExpired.bodyDesktop")}</span>
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className={`${button.outline} mt-1.5 h-12 rounded-full px-6 desktop:border-0 desktop:bg-primary`}
        >
          <RefreshIcon size={18} />
          <span className="desktop:hidden">{t("sessionExpired.tryAgain")}</span>
          <span className="hidden desktop:inline">{t("sessionExpired.reload")}</span>
        </button>
      </section>
    </main>
  );
}
