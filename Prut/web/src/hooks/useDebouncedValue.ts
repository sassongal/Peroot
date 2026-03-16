import { useEffect, useState } from "react";

/**
 * Returns a debounced version of the value that only updates
 * after the specified delay of inactivity.
 *
 * Useful for expensive computations (scoring, regex extraction)
 * that shouldn't run on every keystroke or streaming chunk.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
