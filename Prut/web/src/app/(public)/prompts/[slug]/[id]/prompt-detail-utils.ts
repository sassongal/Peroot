/**
 * Pure helpers for the single-prompt page. No React, no Supabase, so the
 * page's decisions (which fields to show, what counts as "updated", how the
 * preview is split for highlighting) can be tested in node.
 */
import { VARIABLE_TOKEN_REGEX, extractVariables } from "@/lib/variable-utils";

/**
 * The fields the page asks the reader to fill. The prompt text is the truth:
 * a name that appears in the `variables` column but not in the text could not
 * be substituted, so it would be a dead input. The column is only the
 * fallback for rows whose text carries no recognisable token.
 */
export function resolveVariables(
  promptText: string,
  column: string[] | null | undefined,
): string[] {
  const fromText = extractVariables(promptText);
  if (fromText.length > 0) return fromText;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of column ?? []) {
    const key = typeof raw === "string" ? raw.trim() : "";
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

export type PromptSegment =
  | { kind: "text"; text: string }
  | { kind: "filled"; name: string; value: string }
  | { kind: "empty"; name: string };

/**
 * Split the prompt into plain runs and `{token}` slots so the preview can
 * render filled values inline and leave unfilled slots highlighted. Uses the
 * same regex `substituteVariables` uses, so what the preview shows is exactly
 * what the CTA hands to the home page.
 */
export function splitPromptSegments(
  promptText: string,
  values: Record<string, string | undefined>,
): PromptSegment[] {
  const out: PromptSegment[] = [];
  if (!promptText) return out;
  const re = new RegExp(VARIABLE_TOKEN_REGEX.source, "g");
  let last = 0;
  for (const match of promptText.matchAll(re)) {
    const index = match.index ?? 0;
    if (index > last) out.push({ kind: "text", text: promptText.slice(last, index) });
    const name = match[1].trim();
    const value = values[name];
    if (value && value.trim().length > 0) out.push({ kind: "filled", name, value });
    else out.push({ kind: "empty", name });
    last = index + match[0].length;
  }
  if (last < promptText.length) out.push({ kind: "text", text: promptText.slice(last) });
  return out;
}

export function countFilled(
  variables: string[],
  values: Record<string, string | undefined>,
): number {
  return variables.filter((v) => (values[v] ?? "").trim().length > 0).length;
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * "Updated" is only worth saying when the row was actually edited after it
 * was created. Most rows carry an `updated_at` a few seconds after
 * `created_at` from the import, which is noise.
 */
export function isMeaningfullyUpdated(
  createdAt: string | null | undefined,
  updatedAt: string | null | undefined,
): boolean {
  if (!createdAt || !updatedAt) return false;
  const c = new Date(createdAt).getTime();
  const u = new Date(updatedAt).getTime();
  if (Number.isNaN(c) || Number.isNaN(u)) return false;
  return u - c > ONE_DAY_MS;
}

/** "שדה אחד למילוי" / "שני שדות למילוי" / "5 שדות למילוי". Hebrew counts change the word, not only the digit. */
export function fieldsPhrase(count: number): string {
  if (count === 1) return "שדה אחד למילוי";
  if (count === 2) return "שני שדות למילוי";
  return `${count} שדות למילוי`;
}

/** Status line under the inputs, announced through aria-live as the reader types. */
export function filledPhrase(filled: number, total: number): string {
  if (total === 0) return "";
  if (filled === total) return total === 1 ? "השדה מולא" : "כל השדות מולאו";
  return `מולאו ${filled} מתוך ${total} שדות`;
}

/** Steps for the HowTo structured data: one per field, then the enhance step. */
export function buildHowToSteps(variables: string[]): { name: string; text: string }[] {
  const steps = variables.map((v) => ({
    name: `מלאו את השדה ${v}`,
    text: `הקלידו את הערך של ${v} בשדה המתאים, התצוגה המקדימה של הפרומפט מתעדכנת מיד.`,
  }));
  steps.push({
    name: "שדרגו בפירוט",
    text: "לחצו על מלאו ושדרגו בפירוט, הפרומפט המלא עובר לדף הבית ומשודרג אוטומטית עם מבנה מקצועי והקשר.",
  });
  return steps;
}
