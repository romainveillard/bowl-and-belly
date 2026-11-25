import { useTranslation } from "react-i18next";
import { NavLink } from "react-router";
import {
  HistoryIcon,
  InsightsIcon,
  LogoMark,
  PetsIcon,
  SettingsIcon,
  StockIcon,
  TodayIcon,
} from "./icons.js";

const tabs = [
  { to: "/", label: "nav.today", Icon: TodayIcon },
  { to: "/history", label: "nav.history", Icon: HistoryIcon },
  { to: "/insights", label: "nav.insights", Icon: InsightsIcon },
  { to: "/stock", label: "nav.stock", Icon: StockIcon },
  { to: "/pets", label: "nav.pets", Icon: PetsIcon },
] as const;

/** Phone layout: the five tabs along the bottom. */
export function BottomNav() {
  const { t } = useTranslation();

  return (
    <nav
      aria-label={t("nav.label")}
      className="sticky bottom-0 flex border-t border-border bg-card pb-[env(safe-area-inset-bottom)] desktop:hidden"
    >
      {tabs.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          className="group flex flex-1 flex-col items-center gap-1 pt-2 pb-2.5 text-caption font-medium text-muted-foreground aria-[current=page]:font-semibold aria-[current=page]:text-foreground"
        >
          <span className="flex h-[30px] w-14 items-center justify-center rounded-full group-aria-[current=page]:bg-accent-soft">
            <Icon />
          </span>
          {t(label)}
        </NavLink>
      ))}
    </nav>
  );
}

const sideLink =
  "flex h-11 items-center gap-3 rounded-[10px] px-3 text-[15px] font-medium text-muted-foreground aria-[current=page]:bg-accent-soft aria-[current=page]:font-semibold aria-[current=page]:text-foreground";

/** Desktop layout: the same tabs down the side, with Settings at the foot. */
export function Sidebar() {
  const { t } = useTranslation();

  return (
    <aside className="sticky top-0 hidden h-dvh flex-col gap-1.5 border-r border-border bg-card px-4 pt-6 pb-3 desktop:flex">
      <div className="flex items-center gap-2.5 px-2 pb-5">
        <LogoMark />
        <span className="font-display text-[20px] font-semibold tracking-[-0.3px]">
          Bowl <span className="text-wordmark-accent">&amp;</span> Belly
        </span>
      </div>
      <nav aria-label={t("nav.label")} className="flex flex-1 flex-col gap-1">
        {tabs.map(({ to, label, Icon }) => (
          <NavLink key={to} to={to} className={sideLink}>
            <Icon size={20} />
            {t(label)}
          </NavLink>
        ))}
      </nav>
      <NavLink to="/settings" className={sideLink}>
        <SettingsIcon size={20} />
        {t("nav.settings")}
      </NavLink>
      <span className="px-3 pt-0.5 text-center text-caption text-muted-foreground">
        {t("nav.version", { version: APP_VERSION })}
      </span>
    </aside>
  );
}
