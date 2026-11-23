import { useState } from "react";

/**
 * The validation behaviour every form shares: Save stays enabled; a failed
 * save shows all problems and focuses the first field; after that, each field
 * is checked again as the user leaves it.
 *
 * `problems` is what is wrong right now. `order` lists the fields top to
 * bottom, and each field's input has the id `${idPrefix}-${field}`.
 */
export function useFormErrors<Field extends string, Problem extends string>(
  problems: ReadonlyMap<Field, Problem>,
  order: readonly Field[],
  idPrefix: string,
) {
  const [shown, setShown] = useState<ReadonlyMap<Field, Problem>>(new Map());
  const [attempted, setAttempted] = useState(false);

  return {
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
      setShown(problems);
      setAttempted(true);
      document.getElementById(`${idPrefix}-${firstInvalid}`)?.focus();
      return true;
    },
  };
}
