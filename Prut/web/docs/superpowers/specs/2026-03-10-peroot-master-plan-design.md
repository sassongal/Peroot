# Peroot Master Plan — Design Specification

**Date:** 2026-03-10
**Status:** Approved
**Goal:** Transform Peroot into a production-ready Hebrew prompt enhancement platform with stable credits, synced admin, quality content, and SEO readiness.

**Core Decisions:**
- Guest: 1 free trial, then registration required
- Registered free: 2 prompts/day + 2 bonus credits on registration
- All limits configurable from `site_settings` in Supabase (single source of truth)
- Blog CMS: Supabase-driven with TipTap editor in admin
- Contact email standardized to: `gal@joya-tech.net`

---

## Phase 0: Production Readiness

### 0A: Auth & Credits Overhaul

**Guest flow changes:**
- Change `max_free_prompts` from 3 to 1
- After 1st use, show registration modal (blocking, not hint)
- Server-side enforcement on `/api/enhance`

**Registration credits:**
- Change `default_credits` from 20 to 2
- Grant 2 bonus credits on first login

**Daily limit for registered free users:**
- Add daily usage tracking (DB-level, not localStorage)
- 2 prompts/day, resetting at UTC midnight
- Bonus credits are additional (usable even after daily limit)
- Server-side enforcement on `/api/enhance`

**Single source of truth — all from `site_settings`:**
- `max_guest_prompts: 1`
- `daily_free_limit: 2`
- `registration_bonus: 2`
- No hardcoded values anywhere in the codebase
- Admin can change all values in real-time

### 0B: UI Quick Fixes

1. Rename "מצב יכולת" → "מצב פרומפט" (OnboardingOverlay + anywhere else)
2. Add "Reset" button next to "Enhance" button — clears input textarea
3. Agent Builder → mark as "Coming Soon" with badge/overlay, disable interaction
4. Logo click → ensure links to `/`
5. Add 5-6 more diverse example prompts under "Try an example"

### 0C: Admin Sync & Data Integrity

1. Credits display — admin queries actual DB values, not cached
2. User list — shows all users with correct credit balances + daily usage
3. Prompt engine config — admin engine settings are the ACTIVE config used by gateway. Insert current working system prompts into admin options so they're visible and editable.
4. Site settings — all Phase 0A values editable in admin, immediately effective
5. Activity logs — `api_usage_logs` accurately reflects every enhancement call

### 0D: Bug Fixes

1. Favorites — verify toggle works across library/personal/history views, fix state sync
2. Drag & Drop — test reordering in personal library, fix drop-target and sort_index issues
3. Navigation — all screen transitions work reliably
4. Data consistency — no UI/DB state mismatches

### 0E: Legal, Footer & Contact

1. Standardize email to `gal@joya-tech.net` in: footer, privacy, accessibility, terms, API responses
2. Review and refresh legal page content for accuracy
3. Footer — add links to blog, pricing (if exists), new pages
4. Create `/contact` page if it doesn't exist

### 0F: Basic Technical SEO

1. Dynamic `sitemap.ts` — auto-includes home, blog posts, legal pages, pricing, library categories
2. Canonical URLs on every page
3. Meta tags verified on all pages
4. `SoftwareApplication` schema on homepage
5. Verify robots.txt sitemap URL

---

## Phase 1: Product Improvement & Conversion

### 1A: "What Is This?" Explainer

- Button labeled "מה עושים פה?" on main page
- Modal/slide-in with: what Peroot does, who it's for, benefits, why Peroot, CTA
- Auto-show once for first-time visitors (localStorage flag)
- Matches existing glassmorphism design

### 1B: More Examples

- Expand to 8-10 examples across categories: marketing, email, code docs, social media, academic, image gen, support, creative
- Randomize which 3-4 are shown
- Each shows: label + prompt text
- Click to load into input

### 1C: Prompt Naming Improvements

- AI-generated name piggybacked on enhancement response (no extra API call)
- Show names in all views (history, library, favorites) consistently
- Inline rename in any view
- Search/filter by prompt name

### 1D: Prompt Engine Upgrade ("Godly Engine")

- Audit and document current system prompts
- Improve task-type detection (marketing, code, research, creative)
- Structured output format per task type
- Chain-of-thought reasoning before generating
- Quality self-evaluation checklist
- Mode-specific enhancements (standard, research, image)
- A/B testing capability in admin
- All prompts editable in admin (single source of truth)

### 1E: Deep Research Engine Upgrade

- Better citation and source structure
- Organized output: summary, findings, sources, methodology
- Quality signals: confidence level, source count, depth indicator

### 1F: Image Generator Improvements

- Clean JSON output
- Style support: photography, illustration, 3D, digital art
- Parameter suggestions: aspect ratio, style, mood, lighting
- Formatted for DALL-E/Midjourney/Flux

---

## Phase 2: Content & SEO

### 2A: Blog CMS

**Database — `blog_posts` table:**
- `id`, `slug`, `title`, `content` (rich HTML/markdown)
- `meta_title`, `meta_description`, `excerpt`
- `thumbnail_url`, `category`, `tags[]`
- `status` (draft/published), `published_at`, `author`
- `read_time`, `created_at`, `updated_at`

**Admin editor:**
- TipTap rich text editor
- Image upload to Supabase Storage
- SEO fields panel
- Preview mode
- Publish/unpublish toggle
- List view with search/filter

**Frontend:**
- `/blog` — card list with thumbnails
- `/blog/[slug]` — dynamic post from DB
- Good typography and reading experience
- Related posts, CTA back to app

**Migration:** Move existing hardcoded post to DB.

### 2B: First 5 Blog Articles

1. "How to write a perfect prompt — the complete guide"
2. "Prompt engineering for marketers — 10 templates"
3. "AI for content creation — better results in Hebrew"
4. "ChatGPT vs Gemini vs Claude — which AI for what"
5. "5 mistakes with AI prompts and how to fix them"

Each: 1500-2500 words, proper headings, internal links, meta optimized, Article schema.

### 2C: Schema Markup

- Homepage: `SoftwareApplication`
- Blog posts: `Article`
- How-to content: `HowTo`
- FAQ sections: `FAQ`
- All JSON-LD in `<head>`

### 2D: Open Graph Images

- Auto-generated via `next/og` (`ImageResponse`)
- Template: brand colors + title + logo
- Per-page for blog posts
- Default fallback image

### 2E: Internal Linking

- Blog → library categories, examples, main app
- Library → related blog posts
- Main app CTA → blog
- Footer → blog, library, examples
- Breadcrumbs on blog and library

### 2F: Google Search Console

- Domain verification
- Sitemap submission
- Indexing monitoring
- Manual setup step (documented)

---

## Phase 3: Advanced Features (Future — Not Scheduled)

| ID | Feature | Description | Complexity |
|----|---------|-------------|------------|
| 3A | Quality Comparison | Side-by-side "your prompt" vs "Peroot version" with score | Medium |
| 3B | User Prompt Uploads | Public/private submissions with moderation queue | High |
| 3C | Export | PDF, Notion, Google Docs export | Medium |
| 3D | Email Drip Campaign | Day 2, Day 7 emails via Resend | Medium |
| 3E | Write Like Me | Learn user style, generate content in their voice | High |
| 3F | English Support | Full i18n | High |
| 3G | Developer API | REST API with keys, rate limits, billing | High |
| 3H | Chrome Extension | Enhance prompts from any webpage | Medium |

---

## Parallelization Strategy

**Phase 0 — can run in parallel:**
- 0B (UI fixes) + 0E (legal/footer) + 0F (SEO) — independent, no shared state
- 0A (auth/credits) — run independently, most complex
- 0C (admin sync) — after 0A settles (depends on new settings)
- 0D (bug fixes) — after 0A (favorites/D&D may be affected)

**Phase 1 — can run in parallel:**
- 1A + 1B — independent UI additions
- 1C — independent (prompt naming)
- 1D + 1E + 1F — prompt engine work, sequential recommended

**Phase 2 — sequential:**
- 2A first (CMS needed for articles)
- 2B after 2A
- 2C-2F can parallelize after 2A

---

## Architecture Notes

- **Framework:** Next.js 16 with App Router, React 19, TypeScript
- **Database:** Supabase (PostgreSQL + Storage + Auth)
- **AI:** Vercel AI SDK with multi-model fallback (Gemini, DeepSeek, Llama, Groq)
- **Payments:** Lemon Squeezy
- **Deployment:** Vercel
- **Styling:** TailwindCSS + Radix UI
- **Analytics:** PostHog + Sentry
- **Rate Limiting:** Upstash Redis
