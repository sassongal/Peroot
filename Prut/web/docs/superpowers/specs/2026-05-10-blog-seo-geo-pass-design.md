# Blog SEO/GEO Pass + 8 New Posts — Design

**Date:** 2026-05-10
**Author:** Gal Sasson (with Claude)
**Status:** Approved
**Implementation plan:** `docs/superpowers/plans/2026-05-10-blog-seo-geo-pass.md` (next)

---

## Goal

Repair the 17 broken/incomplete blog posts in `blog_posts`, apply a uniform SEO + GEO (Generative Engine Optimization) upgrade to each, and add 8 new posts on current 2026 prompt-engineering headlines — all in Hebrew, ktiv maleh, business register, casual-conversational tone.

## Non-Goals

- AI-generating fresh hero images (deferred — reuse existing `/public/images/blog/*.svg`).
- Refactoring `src/app/blog/[slug]/page.tsx` (JSON-LD wiring already correct).
- Touching the 30 healthy older posts.
- English translations.
- Adding new categories.

---

## Inventory

47 published posts, 1 draft. Issues identified via Supabase audit on 2026-05-10:

### Repair targets (17)

| Slug | Issue |
|------|-------|
| `how-to-write-good-prompt` | `content` empty, `status='draft'`, `tags` null. Full rewrite. |
| `gemini-vs-claude-hebrew` | Missing thumbnail. |
| `midjourney-vs-dalle-hebrew` | Missing thumbnail. |
| `chatgpt-vs-claude-hebrew-2026` | Missing thumbnail. |
| `prompts-for-cultural-localization-...` | Missing thumbnail. |
| `prompt-engineering-dictionary-glossary` | Missing thumbnail. |
| `ai-resume-cover-letter-prompts` | Missing thumbnail. |
| `chain-of-thought-prompting-guide` | Missing thumbnail. |
| `ai-image-prompts-dalle-flux-ideogram` | Missing thumbnail. |
| `system-prompts-complete-guide` | Missing thumbnail. |
| `ai-prompts-for-teachers-education` | Missing thumbnail. |
| `midjourney-v7-complete-guide-hebrew` | Missing thumbnail. |
| `social-media-marketing-prompts` | Missing thumbnail. |
| `coding-prompts-for-developers` | Missing thumbnail. |
| `ai-prompts-for-small-business-israel` | Missing thumbnail. |
| `ai-music-prompts-suno-udio` | Missing thumbnail. |
| `ai-video-prompts-sora-runway-kling` | Missing thumbnail. |
| `gemini-prompts-complete-guide` | Missing thumbnail. |
| `claude-prompts-hebrew-guide` | Missing thumbnail. |
| `ai-for-freelancers-guide` | `read_time` is `"12"` — should be `"12 דקות קריאה"`. |

(20 distinct rows: 1 fully broken + 18 thumbnail-missing + 1 read_time fix. The 18 thumb-less posts include the 4 newest. Numbering above flattens to 17 unique slugs once `prompts-for-cultural-localization-...` and dictionary/CoT/etc. are reconciled — see migration for the authoritative SQL UPDATE list.)

### Net repair count

After de-dup: **18 UPDATE statements** (the 1 broken post + 17 thumbnail/read_time fixes).

### New posts (8)

| # | Slug | Category | Angle |
|---|------|----------|-------|
| 1 | `gpt-5-vs-claude-opus-4-hebrew-2026` | השוואות | Comparison: speed, accuracy, Hebrew quality, price |
| 2 | `sora-2-video-prompts-guide-hebrew` | תמונות | How-to: Sora 2 cinematic prompt structure |
| 3 | `mcp-model-context-protocol-guide` | פרומפט אנג׳ינירינג | Explainer: what is MCP, why every user should care |
| 4 | `agentic-ai-build-agents-no-code` | מדריכים | Practical: build a research agent with Peroot Agent Builder |
| 5 | `voice-prompting-hebrew-guide` | מדריכים | Hebrew voice prompting + multi-language output (ties to Peroot voice picker) |
| 6 | `long-context-prompts-200k-tokens` | פרומפט אנג׳ינירינג | Practical: chunking, summarizing, citing with 200K windows |
| 7 | `prompt-injection-security-guide` | טעויות נפוצות | Security: jailbreaks, data leakage, defensive prompts for business users |
| 8 | `multimodal-prompts-text-image-voice` | מדריכים | Combine text + image + audio in one prompt (Gemini 2.5 / GPT-5 era) |

---

## SEO + GEO Playbook (applied to all 26 affected posts: 18 repairs + 8 new)

### Metadata

- **`meta_title`** — ≤60 chars, primary keyword in first 30 chars, ends with ` | Peroot`.
- **`meta_description`** — 140–155 chars, includes primary keyword + value verb (איך, מדריך, מתי) + soft CTA.
- **`excerpt`** — 110–145 chars, shown on `/blog` index card; lead with the benefit.
- **`tags`** — 4–6 tags, lowercase Hebrew, semantic (not branded).

### Content structure (for new posts and the rewrite of `how-to-write-good-prompt`)

Length: **12,000–15,000 chars** (matches the March 17–21 batch which is the strongest cohort).

Required HTML blocks, in this order:

1. **Lede (`<p>`)** — 2–3 sentences. First sentence is a definitional answer (GEO: LLMs extract this for citations).
2. **TL;DR box (`<aside>` or styled `<p>`)** — 3 bullets summarizing the post.
3. **`<h2>` overview** — 200–300 words.
4. **3–5 `<h2>` body sections** — each with 1–3 `<h3>` sub-sections, short paragraphs (2–3 sentences), bulleted/numbered lists where natural.
5. **`<h2>איך לעשות זאת — צעד אחר צעד</h2>`** — numbered `<h3>` steps. This block is what `howToSchema` extracts in `[slug]/page.tsx`. Required for every how-to post (5/8 new posts), optional for comparison posts.
6. **`<h2>שאלות נפוצות</h2>`** with 4–6 `<h3>` Q&A pairs. This block feeds `faqSchema`. Required for ALL 26 posts.
7. **`<h2>סיכום</h2>`** — 100–200 words.
8. **CTA paragraph** — single sentence linking to `/library?category=<category-slug>` or `/?capability_mode=<mode>`.

### Internal linking

- **≥3 internal links** per post: at minimum, 2 to related blog posts (same category) + 1 to `/library?category=<slug>` or `/`.
- Hebrew anchor text — never "click here". Prefer the target post's primary keyword as anchor.

### GEO (Generative Engine Optimization) rules

LLM crawlers (ChatGPT, Perplexity, Claude search) extract structured, definitional content. To be cited:

- **First sentence is a definition** — pattern: `<X> הוא/היא <Y> שמשמש/ת ל-<Z>.`
- **Headings are questions where natural** — `<h2>מה זה MCP?</h2>` outranks `<h2>מבוא ל-MCP</h2>` in AI overviews.
- **Lists with explicit nouns** — instead of "יש כמה יתרונות", write "ארבעה יתרונות עיקריים:" then numbered list.
- **Concrete numbers/dates** — "מ-2026", "200,000 טוקנים", "פי 3 מהר יותר" — citable claims.
- **Source attribution** — when citing a model name/version, link to the official source if available; LLMs prefer cited content.

### Schema markup (already wired in `[slug]/page.tsx`)

The page emits five JSON-LD blocks via `JsonLd` component:

- `articleSchema` — always.
- `breadcrumbSchema` — always.
- `faqSchema` — fires when content has FAQ structure (we now guarantee this).
- `howToSchema` — fires when content has HowTo structure (we add to 5/8 new + applicable repairs).
- `speakablePageSchema` — for voice-search.

No code changes needed. Just structured content.

### Hebrew style (per `hebrew-content-writer` skill)

- **Register:** business, casual-conversational. Not formal/literary.
- **Spelling:** ktiv maleh throughout (תוכנה not תכנה, שירות not שרות).
- **Gender:** Option C (gender-neutral rewording). Use `יש ל-` / `ניתן ל-` / `כדאי ל-` instead of masculine `אתה צריך`. Smash slash notation only when neutral phrasing is awkward.
- **Et:** required before definite direct objects.
- **Smichut:** `ha-` only on second noun.
- **Punctuation:** geresh (׳) for abbreviations, gershayim (״) for acronyms — UTF-8, not ASCII.
- **No literal translations of English idioms** — use native Hebrew expressions.
- **Paragraphs:** 2–3 sentences each (Hebrew text appears denser).

---

## Thumbnail mapping

All 18 thumbnail-missing posts get assigned an existing SVG from `/public/images/blog/`:

| Category (`blog_posts.category`) | Thumbnail file |
|---|---|
| שיווק | `marketing.svg` |
| תמונות | `images.svg` |
| קוד ופיתוח | `code.svg` |
| חינוך | `education.svg` |
| מדריכים | `guides.svg` |
| פרילנסרים | `freelancers.svg` |
| טעויות נפוצות | `mistakes.svg` |
| השוואות | `comparisons.svg` |
| סקירות | `reviews.svg` |
| פרומפט אנג׳ינירינג | `prompt-engineering.svg` |
| עסקים | `business.svg` |
| תוכן | `content.svg` |

URL form stored in DB: `/images/blog/<filename>` (no domain prefix — Next.js `<Image>` resolves it).

---

## Architecture

Single source of truth: **one Supabase migration** at `supabase/migrations/20260510000000_blog_seo_geo_pass.sql`.

### Why one migration

- Repairs and inserts both touch only `blog_posts`.
- Atomic — either all succeed or rollback together.
- Idempotent — `UPDATE` on `slug` is safe to re-run; `INSERT … ON CONFLICT (slug) DO NOTHING` is safe.
- No code changes required to `[slug]/page.tsx`, `BlogTOC`, or `SafeHtml` — they all consume the existing schema.

### Migration structure

```sql
BEGIN;

-- Section 1: Repair the broken post (full content + metadata)
UPDATE blog_posts SET content = '...', status = 'published', tags = ARRAY[...], ... WHERE slug = 'how-to-write-good-prompt';

-- Section 2: Assign thumbnails to the 17 thumb-less posts
UPDATE blog_posts SET thumbnail_url = '/images/blog/comparisons.svg' WHERE slug = 'gemini-vs-claude-hebrew';
-- ... (16 more)

-- Section 3: Fix read_time typo
UPDATE blog_posts SET read_time = '12 דקות קריאה' WHERE slug = 'ai-for-freelancers-guide';

-- Section 4: Insert 8 new posts
INSERT INTO blog_posts (slug, title, content, excerpt, meta_title, meta_description, thumbnail_url, category, tags, status, author, read_time, published_at)
VALUES (...) ON CONFLICT (slug) DO NOTHING;

COMMIT;
```

### Content authoring approach

Content for the 9 long-form bodies (1 rewrite + 8 new) lives **inline in the migration as `$content$ ... $content$` dollar-quoted strings** to avoid escaping hell with Hebrew quotes, apostrophes, and embedded HTML.

Content is hand-authored, not LLM-generated at deploy time — quality must be verifiable before commit.

---

## Data Flow

```
Author writes Hebrew HTML content (in plan execution phase)
   ↓
Single migration file: 20260510000000_blog_seo_geo_pass.sql
   ↓
Supabase apply_migration → blog_posts table updated/inserted
   ↓
ISR (revalidate=3600) refreshes /blog index + /blog/[slug] within 1h
   ↓
Live site shows: 47 + 8 = 55 posts, all with thumbnails, all with SEO/GEO
   ↓
JSON-LD auto-emitted by [slug]/page.tsx for crawlers
```

---

## Error Handling

| Failure | Behavior |
|---|---|
| Migration fails mid-run | `BEGIN`/`COMMIT` ensures rollback, no partial state |
| Re-running migration | `UPDATE` is naturally idempotent on `slug` PK; `INSERT ... ON CONFLICT DO NOTHING` is safe |
| Thumbnail file missing on disk | Next.js `<Image>` falls back per its config; not a DB problem |
| Hebrew content has unescaped chars | Dollar-quoting (`$content$...$content$`) bypasses all escaping |
| Schema validation fails (FAQ/HowTo) | Schema only fires when content matches; missing block = no rich snippet but page still renders |

---

## Testing

### Pre-deploy (local/staging)

1. Apply migration to a staging DB.
2. `SELECT slug, status, char_length(content) FROM blog_posts WHERE updated_at > NOW() - INTERVAL '5 minutes';` — confirm 26 rows touched.
3. Spot-check 3 posts: `SELECT content FROM blog_posts WHERE slug IN (...)` — verify HTML structure includes FAQ block + HowTo block (where applicable).

### Post-deploy

1. Load `https://www.peroot.space/blog` — confirm all 55 cards render with thumbnails.
2. Load 3 random new-post slugs — confirm:
   - `<h2>שאלות נפוצות</h2>` block renders.
   - `<h2>איך לעשות זאת — צעד אחר צעד</h2>` block renders (where applicable).
   - 3+ internal links present.
   - View Source: `<script type="application/ld+json">` × 5 (Article + Breadcrumb + FAQPage + HowTo + Speakable).
3. Lighthouse SEO ≥95 on 2 spot-checks.
4. Google Rich Results Test on 1 sample post — FAQ + HowTo schema both validate.
5. Open `/blog/how-to-write-good-prompt` (formerly broken) — confirm now renders with full content.

### Acceptance criteria

- [ ] All 47 + 8 = 55 posts visible at `/blog`.
- [ ] Zero posts missing `thumbnail_url`.
- [ ] Zero posts with `status='draft'`.
- [ ] `how-to-write-good-prompt` has `char_length(content) > 5000`.
- [ ] Each of the 8 new slugs returns 200 and renders.
- [ ] Each of the 8 new posts has a `faqSchema` JSON-LD block in HTML source.
- [ ] Each of the 5 how-to new posts has a `howToSchema` JSON-LD block in HTML source.
- [ ] `ai-for-freelancers-guide` shows `12 דקות קריאה` in card metadata.

---

## File Structure

| Path | Action | Purpose |
|---|---|---|
| `supabase/migrations/20260510000000_blog_seo_geo_pass.sql` | Create | Single atomic migration: 18 UPDATEs + 8 INSERTs |
| `docs/superpowers/specs/2026-05-10-blog-seo-geo-pass-design.md` | Create | This document |
| `docs/superpowers/plans/2026-05-10-blog-seo-geo-pass.md` | Create (next step) | Implementation plan with content drafts |

No source-code changes.

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Hebrew content contains characters that break SQL parsing | Dollar-quoted strings (`$content$...$content$`) bypass all SQL escaping |
| ISR cache holds stale `/blog` index for up to 1h | Acceptable; can manually trigger via `revalidatePath('/blog')` if urgent |
| LLM-citation goal subjective — "GEO score" not measurable directly | Use proxy metrics: schema validity, structured headings, definitional ledes |
| Migration size large (~150KB+ of Hebrew content) | Postgres handles fine; one-time cost |
| Thumbnail SVGs all category-themed (not unique per post) | Acceptable for this iteration; deferred to a future visual-refresh spec |

---

## Out-of-Scope (explicit deferrals)

- Per-post unique AI-generated hero images.
- Translation of any post to English.
- Refactor of `src/app/blog/[slug]/page.tsx`.
- Touching the 30 healthy older posts that already have thumbnails.
- A `blog_posts_revisions` history table.
- Newsletter blast announcing the new posts.

---

## Open Questions

None. All questions resolved during brainstorming.
