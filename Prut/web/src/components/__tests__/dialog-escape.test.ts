/**
 * Every dialog can be dismissed from the keyboard.
 *
 * Five overlays with `role="dialog"` had no Escape handler. Two of them also
 * trapped focus, which is the worst combination: a keyboard user is moved into
 * the dialog and then has no way out, because the only exit was clicking a
 * backdrop that has no tab stop.
 *
 * Escape now comes from one of two places, `useFocusTrap(active, onEscape)`
 * for dialogs that trap focus and `useEscapeKey` for those that do not, so
 * this checks that each dialog uses one of them.
 */
import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

/**
 * The consent banner is deliberately exempt: it asks a question that must be
 * answered, and dismissing it with Escape would record no choice at all.
 */
const EXEMPT = new Set(["src/components/ui/CookieConsent.tsx"]);

function dialogFiles(): string[] {
  const out = execFileSync("grep", ["-rl", 'role="dialog"', "--include=*.tsx", "src"], {
    encoding: "utf8",
  });
  return out.split("\n").filter(Boolean);
}

describe("dialogs", () => {
  it("all close on Escape", () => {
    const offenders = dialogFiles().filter((file) => {
      if (EXEMPT.has(file)) return false;
      const src = readFileSync(file, "utf8");
      if (src.includes("useEscapeKey(")) return false;
      // useFocusTrap with a second argument is the trap-plus-Escape form.
      if (/useFocusTrap<[^>]*>\([^)]*,[^)]*\)/.test(src)) return false;
      if (/useFocusTrap\([^)]*,[^)]*\)/.test(src)) return false;
      return !src.includes('"Escape"') && !src.includes("'Escape'");
    });

    expect(offenders).toEqual([]);
  });
});
