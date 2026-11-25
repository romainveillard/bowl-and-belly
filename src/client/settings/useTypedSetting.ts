import { useState } from "react";

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** A "HH:MM" time, or null. */
export const parseTime = (text: string) => (TIME.test(text) ? text : null);

/**
 * A setting typed into a field: it saves when the field is left, if valid and
 * changed, and is marked invalid until it is valid again. The text follows the
 * stored value whenever that changes, such as a save rolled back or made on
 * another device; only half-typed text is kept here.
 */
export function useTypedSetting<Value extends string | number>(
  stored: Value,
  parse: (text: string) => Value | null,
  save: (value: Value) => void,
) {
  const [text, setText] = useState(String(stored));
  const [invalid, setInvalid] = useState(false);
  const [shown, setShown] = useState(stored);

  if (stored !== shown) {
    setShown(stored);
    setText(String(stored));
    setInvalid(false);
  }

  return {
    text,
    setText,
    invalid,
    onBlur: () => {
      const value = parse(text);
      setInvalid(value === null);
      if (value !== null && value !== stored) {
        save(value);
      }
    },
  };
}
