import { useEffect, useRef } from "react";

/**
 * Traps focus within a container element while active, and returns focus to
 * whatever had it when the dialog closes.
 *
 * Pass `onEscape` to also close on the Escape key. It lives here rather than in
 * each dialog because the two behaviours are the same contract: a dialog that
 * traps focus and cannot be dismissed from the keyboard is a trap in the
 * literal sense. Five dialogs had the trap and no Escape.
 *
 * Returns a ref to attach to the container.
 */
export function useFocusTrap<T extends HTMLElement = HTMLDivElement>(
  active: boolean,
  onEscape?: () => void,
) {
  const containerRef = useRef<T>(null);
  // Kept in a ref so a caller passing an inline arrow does not re-bind the
  // listener on every render. Re-binding would also re-run the effect below,
  // which moves focus back to the first element each time it runs.
  const escapeRef = useRef(onEscape);
  useEffect(() => {
    escapeRef.current = onEscape;
  }, [onEscape]);

  useEffect(() => {
    if (!active || !containerRef.current) return;

    const container = containerRef.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    // Focus the first focusable element
    const focusableSelector =
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const focusFirst = () => {
      const first = container.querySelector<HTMLElement>(focusableSelector);
      first?.focus();
    };

    focusFirst();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && escapeRef.current) {
        e.stopPropagation();
        escapeRef.current();
        return;
      }
      if (e.key !== "Tab") return;

      const focusable = Array.from(container.querySelectorAll<HTMLElement>(focusableSelector));
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [active]);

  return containerRef;
}
