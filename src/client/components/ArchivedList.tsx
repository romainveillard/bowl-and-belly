import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { button } from "./ui/forms/button.js";
import { List, listRow } from "./ui/layout/List.js";

interface ArchivedItem {
  id: number;
  name: string;
  /** The tile or avatar that starts the row. */
  leading: ReactNode;
  /** "Wet · archived 3 Nov". */
  detail: string;
}

interface ArchivedListProps {
  /** Shown above the list on a phone; desktop has it in the header. */
  hint: string;
  items: ArchivedItem[];
  restoring: boolean;
  onRestore: (id: number) => void;
}

/** An archive page's list, each item with Restore. */
export function ArchivedList({ hint, items, restoring, onRestore }: ArchivedListProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-3 px-5 pt-1 desktop:p-0">
      <p className="text-sm text-muted-foreground desktop:hidden">{hint}</p>
      <List className="desktop:max-w-[720px]">
        {items.map((item) => (
          <div
            key={item.id}
            className={`flex min-h-[68px] items-center gap-3 py-2.5 pr-3 pl-4 desktop:min-h-[72px] desktop:gap-3.5 desktop:px-[22px] desktop:py-3 ${listRow}`}
          >
            {item.leading}
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-base font-semibold">{item.name}</span>
              <span className="text-[13px] text-muted-foreground">{item.detail}</span>
            </span>
            <button
              type="button"
              aria-label={t("pets.restoreNamed", { name: item.name })}
              className={`${button.outline} flex-none`}
              disabled={restoring}
              onClick={() => onRestore(item.id)}
            >
              {t("pets.restore")}
            </button>
          </div>
        ))}
      </List>
    </div>
  );
}
