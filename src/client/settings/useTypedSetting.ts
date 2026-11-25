import { useState } from "react";

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** A "HH:MM" time, or null. */
export const parseTime = (text: string) => (TIME.test(text) ? text : null);

/**
 * A setting typed into a field: it saves when the field is left, if valid and
 * changed, and is marked invalid until it is valid again.
 */
export function useTypedSetting<Value>(
  initial: string,
  parse: (text: string) => Value | null,
  saved: Value,
  save: (value: Value) => void,
) {
  const [text, setText] = useState(initial);
  const [invalid, setInvalid] = useState(false);

  return {
    text,
    setText,
    invalid,
    onBlur: () => {
      const value = parse(text);
      setInvalid(value === null);
      if (value !== null && value !== saved) {
        save(value);
      }
    },
  };
}
