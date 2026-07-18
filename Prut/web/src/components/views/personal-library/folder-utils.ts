import type { PersonalPrompt } from "@/lib/types";

/**
 * Resolve the folder the library is actually showing.
 *
 * `history` is a local-only virtual folder, so it wins outright. Otherwise the
 * server-side `activeFolder` from `useLibrary` is authoritative when defined
 * (`null` there means "all"); when it is `undefined` (context not paginating)
 * we fall back to the local folder state. Pure — extracted from
 * PersonalLibraryView.
 */
export function resolveEffectiveFolder(
  activeLocalFolder: string,
  ctxActiveFolder: string | null | undefined,
): string {
  if (activeLocalFolder === "history") return "history";
  if (ctxActiveFolder !== undefined) return ctxActiveFolder === null ? "all" : ctxActiveFolder;
  return activeLocalFolder;
}

/**
 * The de-duplicated list of real folders: the default category, the user's
 * declared categories, and any category that appears on a loaded prompt.
 */
export function buildPersonalCategories(
  personalCategories: string[],
  items: PersonalPrompt[],
  defaultCategory: string,
): string[] {
  return Array.from(
    new Set([
      defaultCategory,
      ...personalCategories,
      ...(items.map((p) => p.personal_category).filter(Boolean) as string[]),
    ]),
  );
}

/**
 * Locally-derived counts for the virtual folders and each real category, used as
 * a fallback when the server does not supply `folderCounts`.
 */
export function buildLocalFolderCounts(
  items: PersonalPrompt[],
  favoriteIds: Set<string>,
  categories: string[],
  historyLength: number,
  defaultCategory: string,
): Record<string, number> {
  const counts: Record<string, number> = {
    all: items.length,
    favorites: items.filter((p) => favoriteIds.has(p.id)).length,
    pinned: items.filter((p) => p.is_pinned).length,
    templates: items.filter((p) => p.is_template === true).length,
    history: historyLength,
  };
  categories.forEach((cat) => {
    counts[cat] = items.filter((p) => (p.personal_category || defaultCategory) === cat).length;
  });
  return counts;
}

/**
 * Merge the authoritative (server or local) counts with the always-local history
 * count. History is client-only, so its count always comes from the local list
 * regardless of which base was chosen.
 */
export function mergeFolderCounts(
  ctxFolderCounts: Record<string, number> | undefined,
  localFolderCounts: Record<string, number>,
  historyLength: number,
): Record<string, number> {
  const base = ctxFolderCounts ?? localFolderCounts;
  return { ...base, history: historyLength };
}
