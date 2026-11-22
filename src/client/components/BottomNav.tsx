import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router";
import { HistoryIcon, InsightsIcon, PetsIcon, StockIcon, TodayIcon } from "./icons.js";

const tabs = [
  { to: "/", label: "nav.today", icon: <TodayIcon /> },
  { to: "/history", label: "nav.history", icon: <HistoryIcon /> },
  { to: "/insights", label: "nav.insights", icon: <InsightsIcon /> },
  { to: "/stock", label: "nav.stock", icon: <StockIcon /> },
  { to: "/pets", label: "nav.pets", icon: <PetsIcon /> },
] as const satisfies { to: string; label: string; icon: ReactNode }[];

export function BottomNav() {
  const { t } = useTranslation();

  return (
    <nav
      aria-label={t("nav.label")}
      className="sticky bottom-0 flex border-t border-border bg-card pb-[env(safe-area-inset-bottom)]"
    >
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className="group flex flex-1 flex-col items-center gap-1 pt-2 pb-2.5 text-caption font-medium text-muted-foreground aria-[current=page]:font-semibold aria-[current=page]:text-foreground"
        >
          <span className="flex h-[30px] w-14 items-center justify-center rounded-full group-aria-[current=page]:bg-accent-soft">
            {tab.icon}
          </span>
          {t(tab.label)}
        </NavLink>
      ))}
    </nav>
  );
}
