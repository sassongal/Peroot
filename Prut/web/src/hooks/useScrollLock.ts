import { useEffect } from "react";

/**
 * Locks body scroll while active. Restores on cleanup.
 */
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;

    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = original;
    };
  }, [active]);
}
