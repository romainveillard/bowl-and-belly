import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ChevronRightIcon, CodeIcon, FlagIcon, HeartIcon, StockIcon } from "../components/icons.js";
import { Card, CardHeading } from "../components/ui/layout/Card.js";
import { listRow } from "../components/ui/layout/List.js";
import { links } from "../links.js";

const row = `flex min-h-[52px] items-center justify-between gap-3 ${listRow}`;

function Label({
  icon,
  iconColour = "text-muted-foreground",
  children,
}: {
  icon: ReactNode;
  /** The Ko-fi row's icon takes the row's colour. */
  iconColour?: string | undefined;
  children: ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-3 text-[15px]">
      <span className={`flex ${iconColour}`}>{icon}</span>
      {children}
    </span>
  );
}

function ExternalRow({
  href,
  icon,
  label,
  support = false,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  support?: boolean;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      className={`${row} ${support ? "font-semibold text-support" : ""}`}
    >
      <Label icon={icon} iconColour={support ? "" : undefined}>
        {label}
      </Label>
      <span className="flex text-muted-foreground">
        <ChevronRightIcon size={18} />
      </span>
    </a>
  );
}

export function AboutCard() {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeading title={t("about.title")} hint={t("about.hint")} />
      <div>
        <div className={row}>
          <Label icon={<StockIcon size={20} />}>{t("about.version")}</Label>
          <span className="text-sm text-muted-foreground tabular-nums">{APP_VERSION}</span>
        </div>
        {links.repository && (
          <ExternalRow
            href={links.repository}
            icon={<CodeIcon size={20} />}
            label={t("about.source")}
          />
        )}
        {links.issues && (
          <ExternalRow
            href={links.issues}
            icon={<FlagIcon size={20} />}
            label={t("about.report")}
          />
        )}
        {links.support && (
          <ExternalRow
            href={links.support}
            icon={<HeartIcon size={20} />}
            label={t("about.support")}
            support
          />
        )}
      </div>
    </Card>
  );
}
