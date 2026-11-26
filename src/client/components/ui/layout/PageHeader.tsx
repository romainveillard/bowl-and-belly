import type { ReactNode } from "react";
import { Link } from "react-router";
import { BackIcon, CloseIcon } from "../../icons.js";
import { usePageTitle } from "../../../lib/usePageTitle.js";
import { button } from "../forms/button.js";

/** A tab's title, which also titles the browser tab. */
function PageTitle({ children }: { children: string }) {
  usePageTitle(children);
  return (
    <h1 className="font-display text-display font-semibold desktop:text-[34px] desktop:leading-10">
      {children}
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

/**
 * A tab's header: its title, with the pet chip or other actions beside it, on
 * one row at every width. The title keeps its size; the pet chip's name gives
 * way to it, down to an ellipsis.
 */
export function PageHeader({ title, subtitle, extra, spaceBelow = true }: PageHeaderProps) {
  return (
    <header
      className={`flex items-center justify-between gap-2 px-5 pt-5 desktop:gap-4 desktop:p-0 ${spaceBelow ? "pb-3" : ""}`}
    >
      <div className="flex flex-none flex-col gap-0.5 desktop:gap-1">
        <PageTitle>{title}</PageTitle>
        {subtitle}
      </div>
      {extra}
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
