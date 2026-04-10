import { useEffect, useRef, useState } from "react";

/**
 * Returns a debounced version of the value that only updates
 * after the specified delay of inactivity.
 *
 * The first render returns the value immediately (no delay),
 * so initial UI state is correct on hydration.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      queueMicrotask(() => setDebounced(value));
      return;
    }
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
