# Content Factory — Design Document

**Date:** 2026-03-18
**Status:** Approved
**Goal:** מערכת יצירת תוכן אוטומטית + ידנית שמייצרת פרומפטים ופוסטי בלוג ברמה גבוהה, עם דגש על SEO/GEO לשוק הישראלי.

---

## 1. Overview

### מה נבנה
דף אדמין ייעודי `/admin/content-factory` עם 4 טאבים שמאפשר:
- יצירת פרומפטים (5 בלחיצה) ופוסטי בלוג (1 בלחיצה) — ידנית או אוטומטית
- Cron שבועי שמייצר תוכן אוטומטי
- ניהול מלא: עריכה, מחיקה, אישור, צור מחדש
- דאשבורד ביצועים: פופולריות, עלויות, קטגוריות

### Flow

```
טריגר (כפתור / cron שבועי)
    ↓
ניתוח מה קיים (titles + categories) → זיהוי חורים + trending
    ↓
Competitor analysis — מה מדורג בגוגל ישראל למילות מפתח רלוונטיות
    ↓
AI מייצר תוכן (Claude/Gemini via AI Gateway)
  - עברית חזקה, SEO-optimized, GEO ישראלי
  - בחירת סוג תוכן (מדריך / listicle / השוואה / FAQ)
    ↓
QA: deduplicate, originality check, ניקוד איכות, slug sanitization
    ↓
שמירה כ-DRAFT
    ↓
מופיע באדמין → ממתין לאישור
```

---

## 2. Triggers — טריגרים

| טריגר | תוכן | כמות |
|--------|--------|------|
| כפתור "צור בלוג" באדמין | פוסט בלוג | 1 |
| כפתור "צור פרומפטים" באדמין | פרומפטים לספרייה | 5 |
| Cron שבועי | בלוג 1 + פרומפטים 5 | 6 |
| Generation Preset (שמור מראש) | לפי ההגדרה | לפי ההגדרה |

בכולם — שדה נושא אופציונלי. אם ריק, AI מנתח מה חסר ובוחר לבד.

---

## 3. Content Generation — פרטי יצירה

### Blog Posts
כל פוסט כולל:
- `title` — כותרת SEO-optimized בעברית
- `content` — HTML מלא בסטייל הקיים (H2 headings, פסקאות, רשימות, קוד)
- `excerpt` — תקציר 2-3 משפטים
- `meta_title` + `meta_description` — מותאמים לחיפוש בעברית
- `slug` עברי + אנגלי — auto-translate + עדכון `blog-slug-map.ts`
- `category` + `tags` — מתוך הקיימים ב-DB
- `read_time` — מחושב אוטומטי מאורך התוכן
- `thumbnail_url` — BlogHeroImage הקיים (לפי קטגוריה)
- `status: 'draft'`
- Internal links — קישורים ל-2-3 פרומפטים רלוונטיים מהספרייה

### Blog Templates (סוגי תוכן)
| סוג | תיאור | אורך |
|------|--------|------|
| מדריך מעמיק | How-to מפורט | 2000+ מילים |
| "X פרומפטים ל-Y" | Listicle עם דוגמאות | 1000-1500 מילים |
| השוואה | X vs Y | 1500-2000 מילים |
| FAQ | שאלות ותשובות | 1000-1500 מילים |

ה-AI בוחר סוג לפי הנושא, או שהמשתמש בוחר מ-dropdown.

### Prompts (5 per batch)
כל פרומפט כולל:
- `title` — שם ברור בעברית
- `prompt` — הפרומפט המלא
- `use_case` — תיאור שימוש
- `variables[]` — משתנים שהמשתמש ממלא
- `output_format` — פורמט פלט
- `quality_checks[]` — בדיקות איכות
- `category_id` — מתוך `library_categories` הקיימות
- `capability_mode` — STANDARD/DEEP_RESEARCH/IMAGE_GENERATION/etc.
- `is_active: false` (draft equivalent)
- `source_metadata: { generated_by: 'content-factory', generated_at: timestamp }`

---

## 4. Quality Assurance

### Deduplication
- השוואת title similarity מול כל הפרומפטים/בלוגים הקיימים
- Threshold: אם דמיון > 80% — דוחה ומייצר אחר

### Originality Check
- חיפוש משפטים מרכזיים מהתוכן בגוגל
- אם נמצאה התאמה גבוהה מדי — flagging באדמין

### Slug Sanitization (חוק ברזל)
```
Input:  "איך--לכתוב   פרומפט™ טוב!"
Output: "איך-לכתוב-פרומפט-טוב"

Input:  "How To Write  --Good-- Prompts!!"
Output: "how-to-write-good-prompts"
```
- מותר רק: `a-z`, `0-9`, `א-ת`, מקף בודד `-`
- Collapse מקפים כפולים למקף בודד
- Trim מקפים בהתחלה/סוף
- הסרת כל תו שאינו במקלדת רגילה

### Draft Expiry
- Draft שלא אושר תוך 30 יום → נמחק אוטומטית
- התרעה באדמין 7 ימים לפני מחיקה

---

## 5. SEO/GEO Strategy

### Competitor-Aware Generation
- לפני יצירת תוכן, ה-AI מקבל הנחיה לכסות נושאים שמדורגים בגוגל ישראל
- מובנה כחלק מה-system prompt, לא כקריאת API חיצונית
- הדגשים: מילות מפתח בעברית, long-tail queries, שאלות "איך" ו"מה"

### Internal Linking
- כל פוסט בלוג → קישורים ל-2-3 פרומפטים רלוונטיים מהספרייה
- כל batch פרומפטים → קישור לפוסט בלוג רלוונטי (אם קיים)
- ה-AI מקבל רשימת פרומפטים/פוסטים קיימים כ-context

### Auto-Translate Slugs
- כל פוסט מקבל slug עברי + אנגלי
- עדכון אוטומטי של `src/lib/blog-slug-map.ts`
- הכל בתוך ה-generation flow — בלי צורך בקוד ידני

### Trending Topics
- ניתוח פרומפטים שמשתמשים כתבו (אנונימי) — זיהוי נושאים חוזרים
- ה-cron השבועי מתעדף קטגוריות עם עלייה בשימוש

---

## 6. Admin UI — `/admin/content-factory`

### טאב 1: יצירה + ממתינים

**אזור יצירה:**
- כרטיס "צור פוסט בלוג": שדה נושא (אופציונלי) + dropdown סוג תוכן + כפתור
- כרטיס "צור 5 פרומפטים": שדה נושא (אופציונלי) + dropdown קטגוריה + כפתור
- Progress bar כשיצירה רצה (streaming status)
- Cron status: פעיל/כבוי, ריצה הבאה

**Presets:**
- שמירת הגדרות חוזרות (נושא + קטגוריה + סוג תוכן)
- הפעלה בלחיצה אחת

**רשימת ממתינים:**
- כל draft עם: badge "AI Generated", תאריך יצירה, סוג תוכן
- פעולות: צפה (preview), אשר, ערוך, מחק, צור מחדש
- כפתור "אשר הכל" — bulk approve
- כפתור "צפה מהיר" — preview מהיר של כל ה-drafts ברצף

### טאב 2: ביצועים

**סטטיסטיקות עליונות:**
- סה"כ פרומפטים בספרייה
- סה"כ פוסטים בבלוג
- ממתינים לאישור
- נוצרו השבוע

**פופולריות (מ-data קיים):**
- Top 10 פרומפטים — לפי `use_count` + `prompt_favorites`
- Top 10 פוסטים — לפי pageviews (Vercel Analytics או counter)
- קטגוריות חמות — עלייה בשימוש

**עלויות:**
- עלות ממוצעת ליצירת פוסט / 5 פרומפטים (tokens)
- עלות חודשית מצטברת
- חיבור ל-`/admin/costs` הקיים

**פרומפטים מתים:**
- תוכן עם 0 שמירות/צפיות אחרי 30 יום

### טאב 3: תוכן מלא (ניהול)

**טבלה אחודה:**
- כל הפרומפטים + כל פוסטי הבלוג בטבלה אחת
- סינון: סוג (פרומפט/בלוג), סטטוס (draft/published/AI-generated), קטגוריה, תאריך
- חיפוש חופשי

**פעולות:**
- עריכה inline (כותרת, קטגוריה, tags, סטטוס)
- עריכה מלאה (פותח editor)
- מחיקה (עם אישור)
- Bulk actions: אשר הכל, מחק נבחרים, שנה קטגוריה

### טאב 4: הגדרות

- **Cron:** פעיל/כבוי, תדירות (שבועי), יום ושעה
- **איזון קטגוריות:** כמה פרומפטים בכל קטגוריה + target (bar chart)
- **Content Calendar:** תוכנית חודשית — נושאים מתוכננים (editable)
- **AI config:** מודל, טון, רמת פירוט, max tokens
- **Generation Presets:** רשימה + יצירה/עריכה/מחיקה
- **Draft Expiry:** ימים עד מחיקה אוטומטית (ברירת מחדל: 30)

---

## 7. Technical Architecture

### New API Routes

```
POST /api/admin/content-factory/generate-blog
  Input: { topic?: string, template?: 'guide'|'listicle'|'comparison'|'faq' }
  Output: { id, title, status: 'draft' }

POST /api/admin/content-factory/generate-prompts
  Input: { topic?: string, category?: string }
  Output: { ids: string[], count: number }

POST /api/admin/content-factory/regenerate
  Input: { id, type: 'blog'|'prompt' }
  Output: { id, title, status: 'draft' }

GET  /api/admin/content-factory/stats
  Output: { totalPrompts, totalBlogs, pendingDrafts, createdThisWeek, topPrompts, topBlogs, categoryBalance, costs }

POST /api/admin/content-factory/bulk-approve
  Input: { ids: string[], type: 'blog'|'prompt' }

GET  /api/admin/content-factory/pending
  Output: { drafts: Array<BlogDraft | PromptDraft> }

POST /api/admin/content-factory/presets
  CRUD for generation presets

GET  /api/cron/content-factory
  Cron handler — weekly generation
  Secured with CRON_SECRET
```

### Database Changes

```sql
-- Generation history tracking
CREATE TABLE content_generation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('blog', 'prompt')),
  trigger text NOT NULL CHECK (trigger IN ('manual', 'cron', 'preset')),
  topic text,
  template text,
  result_ids uuid[],
  status text NOT NULL CHECK (status IN ('pending', 'generating', 'completed', 'failed')),
  cost_tokens integer DEFAULT 0,
  cost_usd numeric(10,6) DEFAULT 0,
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- Generation presets
CREATE TABLE content_factory_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('blog', 'prompt')),
  config jsonb NOT NULL DEFAULT '{}',
  -- config: { topic, category, template, tone }
  created_at timestamptz DEFAULT now()
);

-- Add source tracking to existing tables
ALTER TABLE public_library_prompts
  ADD COLUMN IF NOT EXISTS source_metadata jsonb DEFAULT '{}';
  -- { generated_by: 'content-factory', generated_at: timestamp, generation_id: uuid }

ALTER TABLE blog_posts
  ADD COLUMN IF NOT EXISTS source_metadata jsonb DEFAULT '{}';
```

### Cron Configuration (vercel.json)

```json
{
  "crons": [{
    "path": "/api/cron/content-factory",
    "schedule": "0 9 * * 1"
  }]
}
```
רץ כל יום שני ב-09:00 UTC.

### AI Generation Strategy

System prompt לכל יצירה כולל:
1. Context: רשימת קטגוריות קיימות, כותרות קיימות (dedup), trending topics
2. SEO instructions: מילות מפתח בעברית, long-tail, internal linking opportunities
3. GEO instructions: שוק ישראלי, עברית טבעית, דוגמאות מקומיות
4. Competitor awareness: כיסוי נושאים שמדורגים בגוגל ישראל
5. Quality bar: ניסוח ברמה מקצועית, לא גנרי, ערך אמיתי

---

## 8. Implementation Phases

### Phase 1 — Foundation (MVP)
- DB tables (content_generation_log, presets)
- API routes: generate-blog, generate-prompts, pending, stats
- Admin UI: טאב 1 (יצירה + ממתינים) — כפתורים, progress, approve/edit/delete
- Slug sanitization
- Auto-translate slugs + blog-slug-map.ts update
- Deduplication

### Phase 2 — Intelligence
- Blog templates (4 סוגים)
- Competitor-aware generation (SEO strategy in prompts)
- Internal linking (AI gets existing content as context)
- Originality check
- Trending topics analysis
- Regenerate feature

### Phase 3 — Dashboard
- טאב 2: ביצועים (popularity, costs, dead content)
- טאב 3: תוכן מלא (unified table, bulk actions)
- טאב 4: הגדרות (cron, calendar, presets, category balance)
- Bulk approve workflow
- Draft expiry (30 days)

### Phase 4 — Automation
- Cron שבועי
- Generation presets
- Content calendar
- Cost tracking integration
