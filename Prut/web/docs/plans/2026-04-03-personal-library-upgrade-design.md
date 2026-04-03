# Personal Library Upgrade — Design Document

**Date:** 2026-04-03  
**Status:** Approved  

## Summary

Five upgrades to the personal library, prioritized by impact. Phases 1–2 already exist in the codebase; Phase 3 has a basic implementation that needs enhancement; Phases 4–5 are new.

## Phase 1: Quick Use Panel ✅ ALREADY EXISTS

- `InputSection.tsx:244` — horizontal strip of recent personal prompts on the main page
- Sorted by `last_used_at`, limited to 5
- Click loads prompt into input area

## Phase 2: Template Variables UI ✅ ALREADY EXISTS

- `VariableFiller.tsx` — fill-in form for `{variable}` placeholders
- Supports presets (save/load variable sets)
- Template badge on PromptCard (`is_template` field)
- Auto-detection via regex `{variableName}`

## Phase 3: Fuzzy Duplicate Detection (UPGRADE)

**Current:** Exact-match on prompt text (`eq('prompt', prompt.prompt.trim())`)

**Upgrade:** Jaccard word-overlap similarity with configurable threshold.

**Implementation:**
- New utility: `src/lib/prompt-similarity.ts`
  - `findSimilarPrompts(newText, existingPrompts, threshold = 0.6)` 
  - Normalizes text, tokenizes into words, computes Jaccard index
- For authenticated users: fetch recent prompts from same category + general, compare client-side
- For guests: compare against `allLocalItems` already in memory
- Warning toast with "שמור בכל זאת" / "הצג קיים" / "בטל" options
- Replaces the current exact-match check

## Phase 4: AI Auto-Categorization (NEW)

**Trigger:** After saving a prompt with default category "כללי"

**API:** `POST /api/personal-library/suggest-category`
- Input: `{ promptText, existingCategories }`
- Uses Gemini Flash for speed/cost (~0.1¢/call)
- Returns: `{ suggestedCategory, suggestedTags, isNewCategory }`

**UX:**
- Fire-and-forget after successful save
- Toast: "הצעה: להעביר ל-**{category}** ולתייג **{tags}**?"
- "אשר" → move + tag, "✕" → dismiss
- Skip if user already picked a non-default category

## Phase 5: pg_trgm Smart Search (NEW)

**Migration:**
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_personal_lib_title_trgm ON personal_library USING GIN (title gin_trgm_ops);
CREATE INDEX idx_personal_lib_prompt_trgm ON personal_library USING GIN (prompt gin_trgm_ops);
```

**RPC function:** `search_personal_library_fuzzy(p_user_id, p_query, p_limit)`
- Uses `similarity()` + `%` operator with 0.2 threshold
- Falls back to `ilike` if trigram returns 0 results
- Returns results ranked by relevance score

**Integration:**
- Update `fetchPage()` in `useLibrary.ts` to call RPC when `searchQuery` is present
- Guest search enhanced with client-side trigram approximation (word overlap)
- No UI changes — search just gets smarter

## Architecture Notes

- All changes are additive — no breaking changes to existing APIs
- Duplicate detection runs before save (blocking)
- Auto-categorization runs after save (non-blocking)
- pg_trgm is a Postgres extension, needs to be enabled via migration
