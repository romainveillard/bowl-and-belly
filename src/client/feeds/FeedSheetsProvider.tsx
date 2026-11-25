import { createContext, useContext, useState, type ReactNode } from "react";
import { AddLeftoverSheet } from "./AddLeftoverSheet.js";
import { EditFeedSheet } from "./EditFeedSheet.js";
import { FeedActionsSheet } from "./FeedActionsSheet.js";
import { useFeedActions } from "./feedActions.js";
import { useDaySettings, type FeedEntry } from "./feeds.js";

interface FeedSheets {
  /** Opens a feed row's actions, for a feed on the app day `day`. */
  open: (entry: FeedEntry, day: string) => void;
  logAgain: (entry: FeedEntry) => void;
  remove: (entry: FeedEntry) => void;
}

const FeedSheetsContext = createContext<FeedSheets | null>(null);

interface Opened {
  sheet: "actions" | "edit" | "leftover";
  entry: FeedEntry;
  day: string;
}

/** The sheets a feed row opens, for the rows inside: on Today, History and Insights. */
export function FeedSheetsProvider({
  petId,
  today,
  children,
}: {
  petId: number;
  today: string;
  children: ReactNode;
}) {
  const { data: settings } = useDaySettings();
  const timeZone = settings?.timeZone ?? "UTC";
  const actions = useFeedActions(petId);
  const [opened, setOpened] = useState<Opened | null>(null);
  const close = () => setOpened(null);

  let sheet = null;
  if (opened?.sheet === "actions") {
    const { entry } = opened;
    sheet = (
      <FeedActionsSheet
        entry={entry}
        day={opened.day}
        today={today}
        timeZone={timeZone}
        onEdit={() => setOpened({ ...opened, sheet: "edit" })}
        onAddLeftover={() => setOpened({ ...opened, sheet: "leftover" })}
        onLogAgain={() => actions.logAgain(entry)}
        onDelete={() => actions.remove(entry)}
        onClose={close}
      />
    );
  } else if (opened?.sheet === "edit") {
    sheet = (
      <EditFeedSheet
        entry={opened.entry}
        petId={petId}
        day={opened.day}
        today={today}
        timeZone={timeZone}
        onClose={close}
      />
    );
  } else if (opened?.sheet === "leftover") {
    sheet = <AddLeftoverSheet entry={opened.entry} timeZone={timeZone} onClose={close} />;
  }

  return (
    <FeedSheetsContext
      value={{
        open: (entry, day) => setOpened({ sheet: "actions", entry, day }),
        logAgain: actions.logAgain,
        remove: actions.remove,
      }}
    >
      {children}
      {sheet}
    </FeedSheetsContext>
  );
}

export function useFeedSheets(): FeedSheets {
  const sheets = useContext(FeedSheetsContext);
  if (!sheets) {
    throw new Error("useFeedSheets is only for components inside a FeedSheetsProvider");
  }
  return sheets;
}
