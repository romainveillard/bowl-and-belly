import { useLayoutEffect, useRef, useState, type ReactNode, type Ref, type RefObject } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { BackIcon, CloseIcon, SettingsIcon } from "../../icons.js";
import { usePageTitle } from "../../../lib/usePageTitle.js";
import { button } from "../forms/button.js";

/** A tab's title, which also titles the browser tab. */
function PageTitle({
  children,
  textRef,
}: {
  children: string;
  /** The text alone, whose width is the title's however wide the header. */
  textRef: Ref<HTMLSpanElement>;
}) {
  usePageTitle(children);
  return (
    <h1 className="font-display text-display font-semibold desktop:text-[34px] desktop:leading-10">
      <span ref={textRef} className="inline-block whitespace-nowrap">
        {children}
      </span>
    </h1>
  );
}

interface PageHeaderProps {
  title: string;
  /** Under the title, such as the date on Today. */
  subtitle?: ReactNode;
  /** On the right, such as the pet chip. */
  extra?: ReactNode;
  /** The space below on a phone, where the page's content needs it. */
  spaceBelow?: boolean;
}

// The gaps from the title to the extra and from the extra to the gear: 16px
// in all, as gap-x-2 plus the extra's ml-2, then gap-x-2.
const TITLE_GAP = 16;
const GEAR_GAP = 8;

/**
 * Whether the title, the extra and the gear fit side by side. Flex-wrap can't
 * say: it would take the gear to the second row with the chip, so the widths
 * are added up instead, from sizes that don't depend on the layout chosen.
 */
function useFitsOneRow({
  header,
  title,
  extra,
  gear,
}: {
  header: RefObject<HTMLElement | null>;
  title: RefObject<HTMLSpanElement | null>;
  extra: RefObject<HTMLDivElement | null>;
  gear: RefObject<HTMLAnchorElement | null>;
}): boolean {
  const [oneRow, setOneRow] = useState(true);

  useLayoutEffect(() => {
    const box = header.current;
    const parts = [title.current, extra.current, gear.current];
    // Nothing beside the title but the gear always fits.
    if (!box || parts.some((part) => !part)) {
      return undefined;
    }
    const check = () => {
      const style = getComputedStyle(box);
      const available =
        box.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      const [titleWidth = 0, extraWidth = 0, gearWidth = 0] = parts.map(
        (part) => part?.offsetWidth ?? 0,
      );
      setOneRow(titleWidth + TITLE_GAP + extraWidth + GEAR_GAP + gearWidth <= available);
    };
    check();
    // The title's width changes once the bundled font loads, the chip's with the pet.
    const observer = new ResizeObserver(check);
    for (const element of [box, ...parts]) {
      if (element) {
        observer.observe(element);
      }
    }
    return () => observer.disconnect();
  }, [header, title, extra, gear]);

  return oneRow;
}

/**
 * A tab's header: its title, with the pet chip or other actions beside it,
 * and on a phone the way to Settings, which desktop has in the sidebar. When
 * they don't all fit on a row, the title and gear keep the first and the chip
 * moves to the second, on the right, beside the subtitle if there is one.
 */
export function PageHeader({ title, subtitle, extra, spaceBelow = true }: PageHeaderProps) {
  const { t } = useTranslation();
  const header = useRef<HTMLElement>(null);
  const titleText = useRef<HTMLSpanElement>(null);
  const extraBox = useRef<HTMLDivElement>(null);
  const gear = useRef<HTMLAnchorElement>(null);
  const fits = useFitsOneRow({ header, title: titleText, extra: extraBox, gear });
  const oneRow = fits || !extra;

  return (
    <header
      ref={header}
      className={`grid items-center gap-x-2 gap-y-0.5 px-5 pt-5 desktop:gap-y-1 desktop:p-0 ${oneRow ? "grid-cols-[minmax(0,1fr)_auto_auto]" : "grid-cols-[minmax(0,1fr)_auto]"} ${spaceBelow ? "pb-3" : ""}`}
    >
      <div className="col-start-1 row-start-1">
        <PageTitle textRef={titleText}>{title}</PageTitle>
      </div>
      {subtitle && <div className="col-start-1 row-start-2">{subtitle}</div>}
      {extra && (
        <div
          ref={extraBox}
          className={
            oneRow
              ? `col-start-2 row-start-1 ml-2 ${subtitle ? "row-span-2" : ""}`
              : "col-span-2 col-start-1 row-start-2 justify-self-end"
          }
        >
          {extra}
        </div>
      )}
      <Link
        ref={gear}
        to="/settings"
        aria-label={t("nav.settings")}
        className={`${button.icon} row-start-1 bg-card inset-ring inset-ring-border desktop:hidden ${oneRow ? `col-start-3 ${subtitle ? "row-span-2" : ""}` : "col-start-2"}`}
      >
        <SettingsIcon />
      </Link>
    </header>
  );
}

interface SubPageHeaderProps {
  title: string;
  /** Under the title on desktop; a phone shows it in the page itself. */
  hint?: string;
  /** The icon button on a phone: back to a list, or `close` for a form. */
  phoneLink: { to: string; label: string; close?: boolean };
  /** The labelled link above the title on desktop; none where the sidebar leads back. */
  desktopLink?: { to: string; label: string };
}

/** The header of a page reached from a tab, such as a form or an archive. */
export function SubPageHeader({ title, hint, phoneLink, desktopLink }: SubPageHeaderProps) {
  usePageTitle(title);
  return (
    <>
      <header className="flex items-center gap-2 px-3 pt-3.5 pb-2.5 desktop:hidden">
        <Link to={phoneLink.to} aria-label={phoneLink.label} className={button.icon}>
          {phoneLink.close ? <CloseIcon /> : <BackIcon />}
        </Link>
        <h1
          className={`font-display font-semibold ${phoneLink.close ? "text-title" : "text-[26px]"}`}
        >
          {title}
        </h1>
      </header>
      <header className="hidden flex-col gap-1 desktop:flex">
        {desktopLink && (
          <Link
            to={desktopLink.to}
            className="hit-area inline-flex items-center gap-1 self-start text-sm font-semibold"
          >
            <BackIcon size={16} />
            {desktopLink.label}
          </Link>
        )}
        <h1 className="font-display text-[34px] leading-10 font-semibold tracking-[-0.5px]">
          {title}
        </h1>
        {hint && <span className="text-[15px] text-muted-foreground">{hint}</span>}
      </header>
    </>
  );
}
