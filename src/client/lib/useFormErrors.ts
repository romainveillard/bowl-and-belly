import { useState } from "react";
import { flushSync } from "react-dom";

/** What a checked field's input takes from its form, for a card that holds the field. */
export interface CheckedField {
  id: string;
  error: string | undefined;
  onBlur: () => void;
}

/**
 * The validation behaviour every form shares: Save stays enabled; a failed
 * save shows all problems and focuses the first field; after that, each field
 * is checked again as the user leaves it.
 *
 * `problems` is what is wrong right now. `order` lists the fields top to
 * bottom, and each field's input takes its id from `idOf`, which is how the
 * first one is found to focus.
 */
export function useFormErrors<Field extends string, Problem extends string>(
  problems: ReadonlyMap<Field, Problem>,
  order: readonly Field[],
  idPrefix: string,
) {
  const [shown, setShown] = useState<ReadonlyMap<Field, Problem>>(new Map());
  const [attempted, setAttempted] = useState(false);
  const idOf = (field: Field) => `${idPrefix}-${field}`;

  return {
    /** The id for the field's input. */
    idOf,
    /** The problems on display, top to bottom. */
    shown: order.flatMap((field) => shown.get(field) ?? []),
    problemOf: (field: Field) => shown.get(field),
    recheck: (field: Field) => () => {
      if (!attempted) {
        return;
      }
      setShown((current) => {
        const next = new Map(current);
        const problem = problems.get(field);
        if (problem) {
          next.set(field, problem);
        } else {
          next.delete(field);
        }
        return next;
      });
    },
    /** Call on Save. True means the form has problems, now shown, and must not be sent. */
    reject: () => {
      const firstInvalid = order.find((field) => problems.has(field));
      if (!firstInvalid) {
        return false;
      }
      // Committed before focus moves, so the field is already marked invalid and
      // described by its error when a screen reader announces it.
      flushSync(() => {
        setShown(problems);
        setAttempted(true);
      });
      document.getElementById(idOf(firstInvalid))?.focus();
      return true;
    },
  };
}
