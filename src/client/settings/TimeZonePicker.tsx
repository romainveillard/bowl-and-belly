import { Popover } from "radix-ui";
import { useId, useMemo, useState, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { CheckIcon } from "../components/icons.js";
import { SearchInput } from "../components/ui/forms/Field.js";
import {
  SelectChevron,
  selectPanel,
  selectRow,
  selectTrigger,
} from "../components/ui/forms/Select.js";
import { Sheet } from "../components/ui/overlays/Sheet.js";
import { useIsDesktop } from "../lib/useIsDesktop.js";
import { allZones, matchZones, suggestedZones, zoneOffset } from "./timeZones.js";

const deviceZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

/**
 * The search and the zones under it. Focus stays in the search, with the
 * highlighted zone announced through aria-activedescendant, as a combobox.
 */
function ZoneSearch({ value, onChoose }: { value: string; onChoose: (zone: string) => void }) {
  const { t, i18n } = useTranslation();
  const listId = useId();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<{ index: number; byKeyboard: boolean } | null>(null);
  const device = deviceZone();
  const all = useMemo(() => allZones(value), [value]);
  // The list mounts each time it opens, so offsets are as of the opening, and
  // worked out once rather than for every row at every keystroke.
  const [openedAt] = useState(() => new Date());
  const offsets = useMemo(
    () => new Map(all.map((zone) => [zone, zoneOffset(zone, openedAt, i18n.language)])),
    [all, openedAt, i18n.language],
  );

  const searching = query.trim() !== "";
  const sections = searching
    ? [{ heading: null, zones: matchZones(all, query) }]
    : [
        { heading: t("settings.timeZoneSuggested"), zones: suggestedZones(device, value) },
        { heading: t("settings.timeZoneAll"), zones: all },
      ];
  // A zone can be in both sections, so rows are told apart by their place.
  const rows = sections.flatMap((section, sectionIndex) =>
    section.zones.map((zone) => ({ zone, id: `${listId}-${sectionIndex}-${zone}` })),
  );
  const activeRow = active === null ? undefined : rows[active.index];

  const move = (event: KeyboardEvent<HTMLInputElement>) => {
    const step = { ArrowDown: 1, ArrowUp: -1 }[event.key];
    if (step !== undefined && rows.length > 0) {
      event.preventDefault();
      const index = active === null ? (step > 0 ? 0 : rows.length - 1) : active.index + step;
      const next = (index + rows.length) % rows.length;
      setActive({ index: next, byKeyboard: true });
      document.getElementById(rows[next]?.id ?? "")?.scrollIntoView({ block: "nearest" });
    } else if (event.key === "Enter" && activeRow) {
      event.preventDefault();
      onChoose(activeRow.zone);
    }
  };

  let rowIndex = -1;
  return (
    <div className="flex min-h-0 flex-col gap-3">
      <SearchInput
        role="combobox"
        aria-label={t("settings.timeZoneSearch")}
        aria-expanded="true"
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={activeRow?.id}
        placeholder={t("settings.timeZoneSearch")}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setActive(null);
        }}
        onKeyDown={move}
      />
      <div
        id={listId}
        role="listbox"
        aria-label={t("settings.timeZone")}
        className="flex min-h-0 flex-col gap-0.5 overflow-y-auto"
      >
        {sections.map((section, sectionIndex) => (
          <div
            key={section.heading ?? "results"}
            role="group"
            aria-label={section.heading ?? undefined}
            className="flex flex-col gap-0.5"
          >
            <span
              aria-hidden="true"
              className="px-3 pt-2 pb-1 text-caption font-medium tracking-[0.6px] text-muted-foreground uppercase"
            >
              {section.heading ?? t("settings.timeZoneResults", { count: section.zones.length })}
            </span>
            {section.zones.map((zone) => {
              rowIndex += 1;
              const index = rowIndex;
              const selected = zone === value;
              const isActive = active?.index === index;
              const offset = offsets.get(zone) ?? "";
              return (
                <div
                  key={`${sectionIndex}-${zone}`}
                  id={rows[index]?.id}
                  role="option"
                  aria-selected={selected}
                  // Out of the tab order: the search keeps focus and leads through the rows.
                  tabIndex={-1}
                  onPointerMove={() => {
                    if (!isActive) {
                      setActive({ index, byKeyboard: false });
                    }
                  }}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => onChoose(zone)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onChoose(zone);
                    }
                  }}
                  className={`${selectRow} ${selected ? "bg-accent-soft font-semibold" : isActive ? "bg-muted" : ""} ${isActive && active.byKeyboard ? "outline-2 outline-offset-[-2px] outline-primary-strong" : ""}`}
                >
                  <span aria-hidden="true" className="flex w-[18px] flex-none text-primary-strong">
                    {selected && <CheckIcon size={18} />}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{zone}</span>
                  <span className="flex-none text-[13px] font-normal text-muted-foreground tabular-nums">
                    {sectionIndex === 0 && !searching && zone === device
                      ? t("settings.timeZoneDevice", { offset })
                      : offset}
                  </span>
                </div>
              );
            })}
          </div>
        ))}
        {searching && rows.length === 0 && (
          <span className="px-3 py-2 text-[15px] text-muted-foreground">
            {t("settings.timeZoneNoMatch")}
          </span>
        )}
      </div>
      {searching && (
        <span className="text-[13px] text-muted-foreground">{t("settings.timeZoneClearHint")}</span>
      )}
    </div>
  );
}

/**
 * The time zone setting: a field that opens a searchable list, in a sheet on
 * a phone and under the field on desktop. There are hundreds of zones, too
 * many to scroll through in a plain select.
 */
export function TimeZonePicker({
  id,
  value,
  onChange,
  disabled = false,
  hint,
}: {
  id: string;
  value: string;
  onChange: (zone: string) => void;
  disabled?: boolean;
  hint?: string | undefined;
}) {
  const { t } = useTranslation();
  const isDesktop = useIsDesktop();
  const [open, setOpen] = useState(false);
  const choose = (zone: string) => {
    setOpen(false);
    if (zone !== value) {
      onChange(zone);
    }
  };

  const trigger = (
    <button
      type="button"
      id={id}
      disabled={disabled}
      // Read as "Time zone, Europe/London": the label alone would leave the zone out.
      aria-labelledby={`${id}-label ${id}-value`}
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-describedby={hint ? `${id}-hint` : undefined}
      data-state={open ? "open" : "closed"}
      onClick={isDesktop ? undefined : () => setOpen(true)}
      className={selectTrigger}
    >
      <span id={`${id}-value`} className="truncate">
        {value}
      </span>
      <SelectChevron />
    </button>
  );

  return (
    <div className="flex flex-col gap-1.5">
      <label id={`${id}-label`} htmlFor={id} className="text-sm font-semibold">
        {t("settings.timeZone")}
      </label>
      {isDesktop ? (
        <Popover.Root open={open} onOpenChange={setOpen}>
          <Popover.Trigger asChild>{trigger}</Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              align="start"
              sideOffset={6}
              className={`dialog-motion z-30 flex max-h-[min(420px,var(--radix-popover-content-available-height))] w-(--radix-popover-trigger-width) origin-(--radix-popover-content-transform-origin) flex-col ${selectPanel}`}
            >
              <ZoneSearch value={value} onChoose={choose} />
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      ) : (
        <>
          {trigger}
          <Sheet
            open={open}
            onOpenChange={setOpen}
            tall
            title={t("settings.timeZone")}
            subtitle={t("settings.timeZoneCurrently", { zone: value })}
          >
            <ZoneSearch value={value} onChoose={choose} />
          </Sheet>
        </>
      )}
      {hint && (
        <span id={`${id}-hint`} className="text-[13px] text-muted-foreground">
          {hint}
        </span>
      )}
    </div>
  );
}
