import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { BackIcon, ChevronRightIcon, LockIcon, PlusIcon } from "../components/icons.js";
import { button } from "../components/ui/button.js";
import { foodTypeLabel, useFoodTypes } from "../lib/foods.js";
import { petTypeLabel } from "../lib/format.js";
import { usePetTypes } from "../lib/pets.js";
import type { TypeKind } from "../lib/types.js";
import { TypeFormSheet, type CustomType } from "./TypeFormSheet.js";

interface Row {
  id: number;
  label: string;
  note: string;
  /** Set on custom types, which can be edited. */
  custom?: CustomType;
}

function useRows(kind: TypeKind): Row[] | undefined {
  const { t } = useTranslation();
  const { data: foodTypes } = useFoodTypes();
  const { data: petTypes } = usePetTypes();

  if (kind === "food") {
    return foodTypes
      ?.filter((type) => !type.archived)
      .map((type) => ({
        id: type.id,
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
  return petTypes
    ?.filter((type) => !type.archived)
    .map((type) => ({
      id: type.id,
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

const rowClass =
  "flex min-h-[60px] w-full items-center justify-between gap-3 border-t border-border px-4 py-2 text-left first:border-t-0 desktop:px-[22px]";

export function TypesScreen({ kind }: { kind: TypeKind }) {
  const { t } = useTranslation();
  const rows = useRows(kind);
  // Undefined: closed; null: adding.
  const [editing, setEditing] = useState<CustomType | null | undefined>();

  if (!rows) {
    return null;
  }

  const title = t(`types.${kind}.title`);
  const hint = t(`types.${kind}.hint`);

  return (
    <div className="flex flex-col desktop:gap-6">
      <header className="flex items-center gap-2 px-3 pt-3.5 pb-2.5 desktop:hidden">
        <Link to="/settings" aria-label={t("types.backToSettings")} className={button.icon}>
          <BackIcon />
        </Link>
        <h1 className="font-display text-[26px] font-semibold">{title}</h1>
      </header>
      <header className="hidden flex-col gap-1 desktop:flex">
        <Link to="/settings" className="inline-flex items-center gap-1 text-sm font-semibold">
          <BackIcon size={16} />
          {t("nav.settings")}
        </Link>
        <h1 className="font-display text-[34px] leading-10 font-semibold tracking-[-0.5px]">
          {title}
        </h1>
        <span className="text-[15px] text-muted-foreground">{hint}</span>
      </header>

      <div className="flex flex-col gap-3 px-5 pt-1 pb-6 desktop:max-w-[720px] desktop:gap-4 desktop:p-0">
        <p className="text-sm text-muted-foreground desktop:hidden">{hint}</p>
        <div className="overflow-hidden rounded-xl bg-card inset-ring inset-ring-border desktop:rounded-[14px]">
          {rows.map((row) => {
            const { custom } = row;
            return custom ? (
              <button
                key={row.id}
                type="button"
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
        </div>
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
