import type { DocumentType } from "./types";
import { DOCUMENT_CAPABILITY, type ExpertRole } from "./capability";

export type { ExpertRole } from "./capability";

/** Derived from the capability table — one role per DocumentType. */
export const DOCUMENT_TYPE_TO_ROLE: Record<string, ExpertRole> = Object.fromEntries(
  (Object.keys(DOCUMENT_CAPABILITY) as DocumentType[]).map((t) => [t, DOCUMENT_CAPABILITY[t].role]),
);

/** Types with a non-null priority, ordered by it (the historical PRIORITY array). */
const PRIORITY: DocumentType[] = (Object.keys(DOCUMENT_CAPABILITY) as DocumentType[])
  .filter((t) => DOCUMENT_CAPABILITY[t].priority !== null)
  .sort((a, b) => DOCUMENT_CAPABILITY[a].priority! - DOCUMENT_CAPABILITY[b].priority!);

export function resolveRole(documentTypes: string[]): ExpertRole {
  for (const type of PRIORITY) {
    if (documentTypes.includes(type)) return DOCUMENT_CAPABILITY[type].role;
  }
  return DOCUMENT_CAPABILITY["generic"].role;
}

export function renderRoleBlock(documentTypes: string[]): string {
  if (documentTypes.length === 0) return "";
  const role = resolveRole(documentTypes);
  const typeLabel = PRIORITY.find((t) => documentTypes.includes(t)) ?? "generic";
  return [
    '━━━ התאמת מומחה ע"ב קונטקסט ━━━',
    `המשתמש סיפק קונטקסט מסוג "${typeLabel}". בעת יצירת הפרומפט:`,
    `- אמץ נקודת מבט של: ${role.role}`,
    `- טון: ${role.tone}`,
    `- התמקד ב: ${role.focusAreas.join(" · ")}`,
    "━━━",
  ].join("\n");
}
