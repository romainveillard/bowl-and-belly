import { useState } from "react";
import { List, listRow } from "../components/ui/layout/List.js";
import { useTranslation } from "react-i18next";
import { ChevronRightIcon, LockIcon, PlusIcon } from "../components/icons.js";
import { button } from "../components/ui/forms/button.js";
import { SubPageHeader } from "../components/ui/layout/PageHeader.js";
import { useSnackbar } from "../components/ui/feedback/Snackbar.js";
import { Switch } from "../components/ui/forms/Switch.js";
import { foodTypeLabel, useFoodTypes } from "../stock/foods.js";
import { petTypeLabel, usePetTypes } from "../pets/pets.js";
import { useSetTypeArchived, type TypeKind } from "./types.js";
import { TypeFormSheet, type CustomType } from "./TypeFormSheet.js";
import { useFocusNext } from "../lib/useFocusNext.js";

interface Row {
  id: number;
  label: string;
  note: string;
  archived: boolean;
  /** Set on custom types, which can be edited. */
  custom?: CustomType;
}

function useFoodRows(): Row[] | undefined {
  const { t } = useTranslation();
  const { data: foodTypes } = useFoodTypes();

  return foodTypes?.map((type) => ({
    id: type.id,
    archived: type.archived,
    label: foodTypeLabel(type, t),
    note: t(type.leftoverReturnsToStock ? "types.food.returns" : "types.food.binned"),
    ...(type.name !== null && type.systemKey === null
      ? {
          custom: {
            id: type.id,
            name: type.name,
            leftoverReturnsToStock: type.leftoverReturnsToStock,
          },
        }
      : {}),
  }));
}

function usePetRows(): Row[] | undefined {
  const { t } = useTranslation();
  const { data: petTypes } = usePetTypes();

  return petTypes?.map((type) => ({
    id: type.id,
    archived: type.archived,
    label: petTypeLabel(type, t),
    note: t(type.systemKey ? "types.pet.builtInNote" : "types.pet.customNote"),
    ...(type.name !== null && type.systemKey === null
      ? { custom: { id: type.id, name: type.name } }
      : {}),
  }));
}

function RowLabel({ row }: { row: Row }) {
  return (
    <span className="flex flex-col gap-0.5">
      <span className="text-[15px] font-semibold">{row.label}</span>
      <span className="text-[13px] text-muted-foreground">{row.note}</span>
    </span>
  );
}

const rowClass = `flex min-h-[60px] w-full items-center justify-between gap-3 px-4 py-2 text-left desktop:px-[22px] ${listRow}`;

export function PetTypesScreen() {
  return <TypesScreen kind="pet" allRows={usePetRows()} />;
}

export function FoodTypesScreen() {
  return <TypesScreen kind="food" allRows={useFoodRows()} />;
}

function TypesScreen({ kind, allRows }: { kind: TypeKind; allRows: Row[] | undefined }) {
  const { t } = useTranslation();
  // Undefined: closed; null: adding.
  const [editing, setEditing] = useState<CustomType | null | undefined>();
  const [showArchived, setShowArchived] = useState(false);
  const restore = useSetTypeArchived(kind, "restore");
  const showSnackbar = useSnackbar();
  const focusNext = useFocusNext();

  if (!allRows) {
    return null;
  }
  const rows = allRows.filter((row) => !row.archived);
  const archived = allRows.filter((row) => row.archived);

  const title = t(`types.${kind}.title`);
  const hint = t(`types.${kind}.hint`);

  return (
    <div className="flex flex-col desktop:gap-6">
      <SubPageHeader
        title={title}
        hint={hint}
        phoneLink={{ to: "/settings", label: t("types.backToSettings") }}
        desktopLink={{ to: "/settings", label: t("nav.settings") }}
      />

      <div className="flex flex-col gap-3 px-5 pt-1 pb-6 desktop:max-w-[720px] desktop:gap-4 desktop:p-0">
        <p className="text-sm text-muted-foreground desktop:hidden">{hint}</p>
        <List>
          {rows.map((row) => {
            const { custom } = row;
            return custom ? (
              <button
                key={row.id}
                type="button"
                data-type={row.id}
                className={`${rowClass} cursor-pointer`}
                onClick={() => setEditing(custom)}
              >
                <RowLabel row={row} />
                <span className="flex text-muted-foreground">
                  <ChevronRightIcon size={20} />
                </span>
              </button>
            ) : (
              <div key={row.id} className={rowClass}>
                <RowLabel row={row} />
                <span className="inline-flex items-center gap-1 text-[13px] text-muted-foreground">
                  <LockIcon size={14} />
                  {t("types.builtIn")}
                </span>
              </div>
            );
          })}
          {archived.length > 0 && (
            <div className={rowClass}>
              <span className="text-[15px]">{t("types.showArchived")}</span>
              <Switch
                label={t("types.showArchived")}
                checked={showArchived}
                onCheckedChange={setShowArchived}
              />
            </div>
          )}
          {showArchived &&
            archived.map((row) => (
              <div key={row.id} className={rowClass}>
                <span className="flex flex-col gap-0.5">
                  <span className="text-[15px] font-semibold">{row.label}</span>
                  <span className="text-[13px] text-muted-foreground">
                    {t("types.archivedNote")}
                  </span>
                </span>
                <button
                  type="button"
                  aria-label={t("action.restoreNamed", { name: row.label })}
                  className={`${button.outline} flex-none`}
                  disabled={restore.isPending}
                  onClick={() =>
                    restore.mutate(row.id, {
                      onSuccess: (result) => {
                        if (result === "name_taken") {
                          showSnackbar(t("types.restoreTaken", { name: row.label }));
                        } else {
                          focusNext(() => document.querySelector(`[data-type="${row.id}"]`));
                        }
                      },
                    })
                  }
                >
                  {t("action.restore")}
                </button>
              </div>
            ))}
        </List>
        <button
          type="button"
          className={`${button.outline} self-start`}
          onClick={() => setEditing(null)}
        >
          <PlusIcon size={18} />
          {t(`types.${kind}.add`)}
        </button>
      </div>

      {editing !== undefined && (
        <TypeFormSheet
          kind={kind}
          type={editing ?? undefined}
          otherLabels={rows.filter((row) => row.id !== editing?.id).map((row) => row.label)}
          onClose={() => setEditing(undefined)}
        />
      )}
    </div>
  );
}
