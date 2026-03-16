# Personal Library Redesign — Performance + UX Overhaul

## Problem
- 900+ prompts load at once (no pagination) → slow, janky
- Flat category structure — no folders/hierarchy
- Chains take too much space
- Editing/organizing prompts is cumbersome
- Mobile UX is poor

## Solution

### 1. Server-Side Pagination
- Supabase RPC `get_library_page(user_id, page, size, sort, query, folder, capability)`
- Returns `{items, totalCount, folderCounts}` in single query
- 15 items per page (configurable)
- Search, sort, filter all server-side

### 2. Virtual Folder System
- Path notation in `personal_category`: `"שיווק/אימייל"` = subfolder
- Sidebar folder tree with collapse/expand
- Virtual folders: Favorites, Pinned, Recent
- Right-click context menu on folders
- Mobile: sheet/drawer for folder navigation

### 3. Compact Cards + Expandable Chains
- Collapsed: single row ~48px (title + badges + quick actions)
- Expanded: full prompt, tags, edit actions
- Chains: accordion rows, expand on click
- Quick actions on hover (copy, use, delete)

### 4. Sort, Search, Filter
- Server-side full-text search (debounced 300ms)
- Sort dropdown: Recent, Most Used, A-Z, Last Used, Best Rated
- Filter chips: capability mode, source type
- Bulk edit mode with floating action bar

### 5. Inline Editing
- Double-click title to edit inline
- Context menu (right-click / "...")
- Mobile: swipe left=delete, right=copy
- Keyboard shortcuts for power users

## Architecture

### Database
- No schema changes — folders via `/` separator in `personal_category`
- New RPC for paginated + filtered queries

### State Management
- useLibrary: paginated state {items, total, page, loading}
- LibraryContext: add folder tree, active folder, pagination
- Mutations remain optimistic but refresh current page after

### Components
- PersonalLibraryView: sidebar + paginated list
- FolderSidebar: tree navigation
- PromptCard: compact/expanded modes
- ChainsSection: collapsible accordion
