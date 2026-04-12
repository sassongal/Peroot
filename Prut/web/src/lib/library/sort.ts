import { PersonalPrompt } from '@/lib/types';

export interface GuestFilterState {
  activeFolder: string | null;
  searchQuery: string;
  capabilityFilter: string | null;
}

export interface SortState {
  sortBy: string;
}

/**
 * Pure function — applies guest-side folder/search/capability filters and sort
 * to a flat array of PersonalPrompt objects. No React, no side effects.
 */
export function applyGuestFiltersAndSort(
  prompts: PersonalPrompt[],
  filters: GuestFilterState,
  sort: SortState,
): PersonalPrompt[] {
  let filtered = [...prompts];

  // Handle virtual folders
  if (filters.activeFolder === 'pinned') {
    filtered = filtered.filter(p => p.is_pinned);
  } else if (filters.activeFolder === 'templates') {
    filtered = filtered.filter(p => p.is_template === true);
  } else if (filters.activeFolder === 'favorites') {
    // Guest favorites are handled externally (localStorage Set in the view component)
    // This is a no-op: filtering happens in the view
  } else if (filters.activeFolder && filters.activeFolder !== 'all') {
    filtered = filtered.filter(p => p.personal_category === filters.activeFolder);
  }
  // null / "all" → no folder filter

  if (filters.capabilityFilter) {
    filtered = filtered.filter(p => p.capability_mode === filters.capabilityFilter);
  }

  if (filters.searchQuery) {
    const q = filters.searchQuery.toLowerCase();
    filtered = filtered.filter(p =>
      p.title.toLowerCase().includes(q) ||
      p.prompt.toLowerCase().includes(q) ||
      (p.use_case ?? '').toLowerCase().includes(q)
    );
  }

  switch (sort.sortBy) {
    case 'title':
      filtered.sort((a, b) => a.title.localeCompare(b.title));
      break;
    case 'usage':
      filtered.sort((a, b) => (b.use_count ?? 0) - (a.use_count ?? 0));
      break;
    case 'custom':
      filtered.sort((a, b) => (a.sort_index ?? 0) - (b.sort_index ?? 0));
      break;
    case 'last_used':
      filtered.sort((a, b) => {
        const aT = typeof a.last_used_at === 'number'
          ? a.last_used_at
          : (a.last_used_at ? new Date(a.last_used_at).getTime() : 0);
        const bT = typeof b.last_used_at === 'number'
          ? b.last_used_at
          : (b.last_used_at ? new Date(b.last_used_at).getTime() : 0);
        return bT - aT;
      });
      break;
    case 'performance':
    case 'recent':
    default:
      filtered.sort((a, b) => {
        const aT = typeof a.updated_at === 'number' ? a.updated_at : new Date(a.updated_at).getTime();
        const bT = typeof b.updated_at === 'number' ? b.updated_at : new Date(b.updated_at).getTime();
        return bT - aT;
      });
      break;
  }

  // Pinned items always float to top
  filtered.sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0));

  return filtered;
}
