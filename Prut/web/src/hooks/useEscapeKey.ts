import { useEffect, useRef } from "react";

/**
 * Close on Escape, for overlays that do not trap focus.
 *
 * A dismissible overlay with no keyboard exit strands anyone not using a
 * mouse: the backdrop click is the only way out, and a backdrop is not
 * reachable by keyboard. Dialogs that DO trap focus get this from
 * `useFocusTrap(active, onEscape)` instead, so there is one behaviour and two
 * entry points rather than a copy in every component.
 */
export function useEscapeKey(active: boolean, onEscape: () => void) {
  // A ref so an inline arrow does not re-bind the listener every render.
  const ref = useRef(onEscape);
  useEffect(() => {
    ref.current = onEscape;
  }, [onEscape]);

  useEffect(() => {
    if (!active) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") ref.current();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [active]);
}
