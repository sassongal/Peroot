# Teachers Content Strategy — Design Doc

**Date:** 2026-03-20
**Goal:** Make Peroot the #1 AI prompt platform for Israeli educators

## Strategy

- **Target:** All educators (K-12, early childhood, academia, tutors)
- **Approach:** SEO-first → social amplification → authority
- **Organization:** By action (not by subject) — cross-cuts all teachers
- **Scope Phase 1:** Landing page + 68 prompts + 5 blog posts

## Content Architecture

### 1. Landing Page: `/teachers`
- Standalone page (not in main nav — accessed via SEO, footer, blog links)
- Hero + 9 action cards + live before/after demo + recent blog posts + CTA
- SEO target: "פרומפטים למורים", "AI למורים", "בינה מלאכותית לחינוך"

### 2. New Category: `teachers` (🎓)
- Separate from existing `education` (which covers students/academia)
- Slug: `/prompts/teachers`
- 68 prompts organized by 9 action groups

### 3. Prompt Actions (68 total)
| Action | Count | Examples |
|--------|-------|---------|
| בניית מבחנים ומבדקים | 10 | מבחן רב-ברירה, מתכונת בגרות, בנק שאלות |
| תכנון שיעורים | 10 | שיעור 45 דק, שיעור חווייתי, שיעור עם AI |
| יצירת דפי עבודה | 8 | תרגול עצמאי, מדורג, קריאת הבנה |
| משוב ודו"חות | 8 | משוב מילולי, חוות דעת לתעודה, המלצה |
| חומרי הוראה | 8 | סיכום נושא, מצגת, משחק לימודי |
| דיפרנציאציה | 6 | התאמה ללקויות למידה, העשרה, עולים חדשים |
| תקשורת עם הורים | 6 | מכתב תחילת שנה, עדכון התנהגות, אירוע |
| ניהול כיתה | 6 | אמנת כיתה, תגמולים, שבירת קרח |
| הערכה ורובריקות | 6 | רובריקה לעבודה, מחוון כתיבה, הערכה חלופית |

### 4. Search Feature
- Free-text search on `/prompts` page
- API: `/api/library/search?q=...`
- PostgreSQL ILIKE on title + use_case + prompt fields
- Displays results in existing prompt card layout

### 5. Integration Points
- Prompts → `public_library_prompts` table (existing)
- Category → `library_categories` table (existing)
- Sitemap → auto-included via existing `sitemap.ts` logic
- Blog → `blog_posts` table (existing)
- `/teachers` page → manual addition to sitemap with priority 0.9

## Variables System
Common variables across teacher prompts:
- `{נושא}` — Topic (e.g., "שברים פשוטים")
- `{כיתה}` — Grade (e.g., "ד׳", "י׳")
- `{מקצוע}` — Subject (e.g., "מתמטיקה")
- `{מספר_שאלות}` — Number of questions
- `{רמת_קושי}` — Difficulty level
- `{שם_תלמיד}` — Student name
- `{זמן}` — Duration

## Implementation Order
1. SQL migration: new category + 68 prompts
2. Update `category-slugs.ts` + Hebrew slug map
3. Add `/teachers` to sitemap
4. Add search API + UI
5. Create `/teachers` landing page
6. Write 5 blog posts (phase 2)
