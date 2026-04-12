/**
 * Handoff channel between "use this prompt" buttons on non-home routes
 * (e.g. /prompts/[slug], /templates) and the home page's prompt input.
 *
 * The home page reads this on mount via HomeClient and dispatches it into
 * the workflow reducer (same path as clicking "השתמש" from inside the
 * library modal). Using sessionStorage instead of a URL param keeps the
 * URL clean and lets us hand off arbitrarily long prompts without
 * hitting query-string length limits.
 *
 * The payload mirrors the minimum shape of `LibraryPrompt` that
 * `handleUsePrompt` needs — enough for both template and regular flows.
 */

const KEY = "peroot_pending_prompt";

interface PendingPrompt {
  id?: string;
  title?: string;
  prompt: string;
  category?: string;
  is_template?: boolean;
  source?: string; // analytics hint: "templates" | "prompts-library" | ...
}

export function setPendingPrompt(p: PendingPrompt) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* storage full / disabled — silently noop, user will just land on home */
  }
}

export function consumePendingPrompt(): PendingPrompt | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    sessionStorage.removeItem(KEY);
    const parsed = JSON.parse(raw) as PendingPrompt;
    if (!parsed || typeof parsed.prompt !== "string" || !parsed.prompt.trim()) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
