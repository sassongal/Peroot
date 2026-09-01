import { logger } from "@/lib/logger";

/**
 * Copy text to the clipboard. Never throws; returns whether it worked.
 *
 * `navigator.clipboard.writeText` rejects more often than it looks: a
 * non-secure context, a denied permission, a document that is not focused, and
 * Safari's requirement that the write happen inside the user gesture all
 * produce a rejected promise rather than a thrown error you would notice in
 * review.
 *
 * Eight call sites did not handle that. The worst were the ones that did not
 * even await it and then showed a success toast unconditionally, so a failed
 * copy told the user it had succeeded and they pasted stale clipboard content.
 * The main result copy in HomeClient was unguarded too: a rejection there
 * skipped the copied state, the usage signal and the analytics event, and
 * surfaced as an unhandled rejection.
 *
 * The fallback path (a hidden textarea plus `execCommand`) is deprecated but
 * still the only thing that works in several of the cases above, so it stays
 * as a second attempt rather than a replacement.
 */
export async function copyText(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      logger.warn("[clipboard] writeText failed, trying fallback", e);
    }
  }

  if (typeof document === "undefined") return false;

  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    // Keep it out of view without `display:none`, which makes it unselectable.
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "-1000px";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch (e) {
    logger.warn("[clipboard] fallback copy failed", e);
    return false;
  }
}
