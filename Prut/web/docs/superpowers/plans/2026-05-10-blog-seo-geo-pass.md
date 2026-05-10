# Blog SEO/GEO Pass + 8 New Posts — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repair 18 broken/incomplete blog posts and add 8 new long-form Hebrew posts on 2026 prompt-engineering headlines via a single atomic Supabase migration.

**Architecture:** Hand-author 9 long-form Hebrew HTML bodies (1 rewrite + 8 new) into individual `.html` files under `supabase/migrations/blog-content-2026-05-10/`. A compile script reads them and emits a single `20260510000000_blog_seo_geo_pass.sql` migration with dollar-quoted (`$content$...$content$`) inserts/updates plus 17 thumbnail UPDATEs and 1 read_time UPDATE. Apply migration via Supabase MCP. ISR (`revalidate=3600`) propagates within an hour; `revalidatePath('/blog')` for instant refresh.

**Tech Stack:** Supabase Postgres, Next.js 16 App Router, Hebrew ktiv maleh content, JSON-LD schema (FAQ/HowTo/Article/Breadcrumb/Speakable already wired in `src/app/blog/[slug]/page.tsx`).

**Spec:** `docs/superpowers/specs/2026-05-10-blog-seo-geo-pass-design.md`

---

## File Structure

| Path | Action | Purpose |
|---|---|---|
| `supabase/migrations/blog-content-2026-05-10/how-to-write-good-prompt.html` | Create | Rewrite of broken post body |
| `supabase/migrations/blog-content-2026-05-10/gpt-5-vs-claude-opus-4-hebrew-2026.html` | Create | New post 1 body |
| `supabase/migrations/blog-content-2026-05-10/sora-2-video-prompts-guide-hebrew.html` | Create | New post 2 body |
| `supabase/migrations/blog-content-2026-05-10/mcp-model-context-protocol-guide.html` | Create | New post 3 body |
| `supabase/migrations/blog-content-2026-05-10/agentic-ai-build-agents-no-code.html` | Create | New post 4 body |
| `supabase/migrations/blog-content-2026-05-10/voice-prompting-hebrew-guide.html` | Create | New post 5 body |
| `supabase/migrations/blog-content-2026-05-10/long-context-prompts-200k-tokens.html` | Create | New post 6 body |
| `supabase/migrations/blog-content-2026-05-10/prompt-injection-security-guide.html` | Create | New post 7 body |
| `supabase/migrations/blog-content-2026-05-10/multimodal-prompts-text-image-voice.html` | Create | New post 8 body |
| `supabase/migrations/blog-content-2026-05-10/metadata.json` | Create | Per-slug `{title, excerpt, meta_title, meta_description, tags, category, thumbnail_url, read_time, author}` |
| `scripts/compile-blog-migration.mjs` | Create | Reads HTML bodies + metadata.json, emits the SQL migration with dollar-quoted strings |
| `supabase/migrations/20260510000000_blog_seo_geo_pass.sql` | Create (generated) | Final atomic migration: 18 UPDATEs + 9 INSERT-or-UPDATE for content posts |

Content lives outside the SQL file because:
1. ~120 KB of Hebrew HTML is unreadable inside SQL.
2. Authoring `.html` files in an editor lets us check structure (FAQ/HowTo presence) easily.
3. Re-running compile is idempotent.

---

## Hebrew Style Requirements (apply to ALL 9 content files)

Per `hebrew-content-writer` skill — these are non-negotiable:

- **Register:** business, casual-conversational. Not formal/literary.
- **Spelling:** ktiv maleh (תוכנה not תכנה, שירות not שרות, מוצר not מצר).
- **Gender:** Option C — `יש ל-` / `ניתן ל-` / `כדאי ל-`. Avoid `אתה צריך`.
- **Et:** required before definite direct objects (`ראיתי את הסרט`, not `ראיתי הסרט`).
- **Smichut:** `ha-` only on second noun (`בית הספר`, not `הבית הספר`).
- **Punctuation:** geresh (׳) for abbreviations, gershayim (״) for acronyms — UTF-8 chars.
- **Paragraphs:** 2–3 sentences each.
- **Length:** 12,000–15,000 characters per post.

## Required HTML structure (every content file)

```html
<p class="lede">[2–3 sentences. First sentence is a definitional answer for GEO.]</p>

<aside class="tldr">
  <strong>בקצרה:</strong>
  <ul>
    <li>[bullet 1]</li>
    <li>[bullet 2]</li>
    <li>[bullet 3]</li>
  </ul>
</aside>

<h2>סקירה כללית</h2>
<p>[200–300 words]</p>

<h2>[body section 1 — question form when natural]</h2>
<h3>[sub]</h3><p>[2–3 sentences]</p>
<h3>[sub]</h3><p>[2–3 sentences]</p>

<h2>[body section 2]</h2>
<!-- 3–5 body sections total, each with 1–3 h3 -->

<h2>איך לעשות זאת — צעד אחר צעד</h2>
<!-- REQUIRED for how-to posts (5/8 new + how-to-write-good-prompt). Optional for comparisons. -->
<ol>
  <li><h3>[step 1]</h3><p>[explanation]</p></li>
  <li><h3>[step 2]</h3><p>[explanation]</p></li>
  <!-- 4–7 steps -->
</ol>

<h2>שאלות נפוצות</h2>
<!-- REQUIRED for ALL posts -->
<h3>[Q1]</h3><p>[A1]</p>
<h3>[Q2]</h3><p>[A2]</p>
<!-- 4–6 Q&A pairs -->

<h2>סיכום</h2>
<p>[100–200 words]</p>

<p class="cta">
  <a href="/library?category=...">[CTA copy]</a>
</p>
```

## Internal linking rule

Each post must contain **≥3 internal links** in body prose:
- 2 to related blog posts (prefer same category) — anchor text = target post's primary keyword
- 1 to `/library?category=<slug>` or `/?capability_mode=<MODE>`

---

## Task 1: Create content directory

**Files:**
- Create: `supabase/migrations/blog-content-2026-05-10/.gitkeep`

- [ ] **Step 1: Create directory**

```bash
mkdir -p supabase/migrations/blog-content-2026-05-10
touch supabase/migrations/blog-content-2026-05-10/.gitkeep
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/blog-content-2026-05-10/.gitkeep
git commit -m "chore(blog): scaffold blog content directory for SEO/GEO pass"
```

---

## Task 2: Author metadata.json

**Files:**
- Create: `supabase/migrations/blog-content-2026-05-10/metadata.json`

Single source of truth for the per-slug DB columns. The compile script reads this.

- [ ] **Step 1: Write metadata.json**

```json
{
  "how-to-write-good-prompt": {
    "title": "איך לכתוב פרומפט טוב — המדריך המלא ל-2026",
    "excerpt": "מדריך מעשי לכתיבת פרומפטים שמייצרים תוצאות מדויקות. כללים, דוגמאות, ושגיאות נפוצות שכדאי להכיר.",
    "meta_title": "איך לכתוב פרומפט טוב | מדריך 2026 | Peroot",
    "meta_description": "מדריך מלא לכתיבת פרומפטים אפקטיביים בעברית. עקרונות, תבניות, ודוגמאות מעשיות שיביאו תוצאות טובות יותר מ-ChatGPT, Claude ו-Gemini.",
    "tags": ["פרומפט אנג׳ינירינג", "מדריך", "טכניקות", "מתחילים"],
    "category": "מדריכים",
    "thumbnail_url": "/images/blog/guides.svg",
    "read_time": "10 דקות קריאה",
    "author": "צוות Peroot",
    "published_at": "2026-03-15T08:00:00Z"
  },
  "gpt-5-vs-claude-opus-4-hebrew-2026": {
    "title": "GPT-5 מול Claude Opus 4 — השוואה מלאה לעברית 2026",
    "excerpt": "השוואה מעשית בין שני המודלים המובילים: דיוק, מהירות, איכות עברית, ומחיר. למי כדאי לבחור מה.",
    "meta_title": "GPT-5 מול Claude Opus 4 בעברית | השוואה 2026 | Peroot",
    "meta_description": "השוואה מקיפה בין GPT-5 ל-Claude Opus 4 לעברית: יכולות שיחה, איכות תרגום, מחיר, ומהירות. מה לבחור ב-2026.",
    "tags": ["השוואות", "gpt-5", "claude", "מודלים"],
    "category": "השוואות",
    "thumbnail_url": "/images/blog/comparisons.svg",
    "read_time": "12 דקות קריאה",
    "author": "צוות Peroot",
    "published_at": "2026-05-10T08:00:00Z"
  },
  "sora-2-video-prompts-guide-hebrew": {
    "title": "Sora 2 — מדריך מלא לפרומפטים לווידאו ב-2026",
    "excerpt": "איך לבנות פרומפט מקצועי ל-Sora 2: מבנה קולנועי, תאורה, תנועה, וטעויות שכדאי להימנע מהן.",
    "meta_title": "Sora 2 פרומפטים לווידאו | מדריך עברית 2026 | Peroot",
    "meta_description": "מדריך מקיף לכתיבת פרומפטים ל-Sora 2: מבנה קולנועי, פירוט סצנה, תנועת מצלמה, ודוגמאות עובדות. הופכים רעיון לסרטון בעברית.",
    "tags": ["sora", "וידאו", "פרומפטים", "מדריך"],
    "category": "תמונות",
    "thumbnail_url": "/images/blog/images.svg",
    "read_time": "11 דקות קריאה",
    "author": "צוות Peroot",
    "published_at": "2026-05-10T09:00:00Z"
  },
  "mcp-model-context-protocol-guide": {
    "title": "MCP — מהו Model Context Protocol ולמה זה חשוב לכל משתמש",
    "excerpt": "הסבר פשוט על MCP — הפרוטוקול שמחבר מודלים של AI לכלים חיצוניים. למה כל משתמש מתקדם צריך להבין אותו.",
    "meta_title": "MCP Model Context Protocol | מדריך מלא | Peroot",
    "meta_description": "מהו Model Context Protocol, איך הוא עובד, ולמה הוא משנה את הדרך שבה משתמשים ב-AI. דוגמאות לשימושים מעשיים בעברית.",
    "tags": ["mcp", "פרומפט אנג׳ינירינג", "כלים", "אינטגרציה"],
    "category": "פרומפט אנג׳ינירינג",
    "thumbnail_url": "/images/blog/prompt-engineering.svg",
    "read_time": "9 דקות קריאה",
    "author": "צוות Peroot",
    "published_at": "2026-05-10T10:00:00Z"
  },
  "agentic-ai-build-agents-no-code": {
    "title": "סוכני AI ללא קוד — בונים סוכן מחקר עם Peroot Agent Builder",
    "excerpt": "מדריך מעשי לבניית סוכן AI שמבצע משימות מורכבות עבורך — בלי לכתוב שורת קוד.",
    "meta_title": "בונים סוכני AI ללא קוד | Peroot Agent Builder",
    "meta_description": "מדריך צעד אחר צעד לבניית סוכן מחקר עם Peroot Agent Builder. הגדרת מטרה, כלים, וגבולות — והכל ללא קוד.",
    "tags": ["סוכנים", "מדריך", "agent-builder", "אוטומציה"],
    "category": "מדריכים",
    "thumbnail_url": "/images/blog/guides.svg",
    "read_time": "13 דקות קריאה",
    "author": "צוות Peroot",
    "published_at": "2026-05-10T11:00:00Z"
  },
  "voice-prompting-hebrew-guide": {
    "title": "פרומפטים בקול בעברית — המדריך המלא לדיבור עם AI",
    "excerpt": "איך משתמשים בהקלטה קולית לפרומפטים, איך בוחרים שפת פלט, ואילו שגיאות הגייה האלגוריתם הכי מתבלבל מהן.",
    "meta_title": "פרומפטים בקול בעברית | מדריך מלא | Peroot",
    "meta_description": "מדריך מקיף לפרומפטים קוליים בעברית: בחירת שפת פלט, הקלטה ברורה, וטריקים לדיבור עם AI שמבין אותך מהפעם הראשונה.",
    "tags": ["קול", "voice", "מדריך", "מתחילים"],
    "category": "מדריכים",
    "thumbnail_url": "/images/blog/guides.svg",
    "read_time": "10 דקות קריאה",
    "author": "צוות Peroot",
    "published_at": "2026-05-10T12:00:00Z"
  },
  "long-context-prompts-200k-tokens": {
    "title": "פרומפטים לחלון של 200K טוקנים — איך מנצלים זיכרון ארוך",
    "excerpt": "טכניקות מעשיות לעבודה עם חלונות הקשר ארוכים: chunking, סיכום הדרגתי, וציטוטים מקור.",
    "meta_title": "פרומפטים לחלון 200K טוקנים | מדריך 2026 | Peroot",
    "meta_description": "איך מנצלים נכון חלון הקשר של 200,000 טוקנים: chunking, סיכומים, ציטוטים, וניהול זיכרון בפרומפטים ארוכים.",
    "tags": ["context", "פרומפט אנג׳ינירינג", "טוקנים", "מתקדם"],
    "category": "פרומפט אנג׳ינירינג",
    "thumbnail_url": "/images/blog/prompt-engineering.svg",
    "read_time": "11 דקות קריאה",
    "author": "צוות Peroot",
    "published_at": "2026-05-10T13:00:00Z"
  },
  "prompt-injection-security-guide": {
    "title": "Prompt Injection — איך מגנים על המידע העסקי שלכם מ-AI",
    "excerpt": "התקפות על מודלים של AI הופכות נפוצות. מדריך מעשי למשתמש העסקי על זיהוי, מניעה, והתמודדות.",
    "meta_title": "Prompt Injection — מדריך אבטחה לעסקים | Peroot",
    "meta_description": "מדריך מקיף ל-prompt injection: מהן ההתקפות, איך לזהות, ואיך להגן על נתונים עסקיים בפרומפטים. דוגמאות וטכניקות הגנה.",
    "tags": ["אבטחה", "טעויות", "עסקים", "injection"],
    "category": "טעויות נפוצות",
    "thumbnail_url": "/images/blog/mistakes.svg",
    "read_time": "12 דקות קריאה",
    "author": "צוות Peroot",
    "published_at": "2026-05-10T14:00:00Z"
  },
  "multimodal-prompts-text-image-voice": {
    "title": "פרומפטים מולטימודליים — שילוב טקסט, תמונה וקול",
    "excerpt": "Gemini 2.5 ו-GPT-5 קוראים תמונה, מבינים קול ומגיבים בטקסט. מדריך מעשי לשילוב כל הקלטים בפרומפט אחד.",
    "meta_title": "פרומפטים מולטימודליים | מדריך 2026 | Peroot",
    "meta_description": "איך משלבים טקסט, תמונה וקול בפרומפט אחד: דוגמאות עבודה עם Gemini 2.5 ו-GPT-5, וטעויות שגרורות חוסר דיוק.",
    "tags": ["מולטימודלי", "מדריך", "gemini", "gpt-5"],
    "category": "מדריכים",
    "thumbnail_url": "/images/blog/guides.svg",
    "read_time": "11 דקות קריאה",
    "author": "צוות Peroot",
    "published_at": "2026-05-10T15:00:00Z"
  }
}
```

- [ ] **Step 2: Verify JSON parses**

```bash
node -e "JSON.parse(require('fs').readFileSync('supabase/migrations/blog-content-2026-05-10/metadata.json','utf8')); console.log('OK')"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/blog-content-2026-05-10/metadata.json
git commit -m "feat(blog): add metadata for SEO/GEO content batch"
```

---

## Tasks 3–11: Author the 9 long-form HTML bodies (one per task)

**Each content task follows the same pattern:**

1. Open the slug's `metadata.json` entry — this dictates `title`, `category`, `tags`, internal link targets.
2. Write the HTML body file matching the **Required HTML structure** above.
3. Validate the file with the Hebrew-content checklist (Task 12).
4. Commit.

Each task below specifies the **outline** (H2/H3 headings in Hebrew), **FAQ questions**, **HowTo steps** (where applicable), and **internal-link targets**. The subagent fills in body prose using the Hebrew style requirements above and the GEO rules from the spec (definitional ledes, concrete numbers, question headings, structured lists).

### Task 3: `how-to-write-good-prompt.html`

**File:** `supabase/migrations/blog-content-2026-05-10/how-to-write-good-prompt.html`

- [ ] **Step 1: Outline the file**

```
<h2>סקירה כללית</h2>
<h2>מהו פרומפט טוב?</h2>
  <h3>הגדרה</h3>
  <h3>שלושת הרכיבים החיוניים</h3>
<h2>חמשת העקרונות לכתיבת פרומפט אפקטיבי</h2>
  <h3>בהירות</h3>
  <h3>הקשר</h3>
  <h3>פורמט פלט</h3>
  <h3>דוגמאות (few-shot)</h3>
  <h3>אילוצים</h3>
<h2>טעויות נפוצות שכדאי להימנע מהן</h2>
  <h3>עמימות</h3>
  <h3>חוסר הקשר</h3>
  <h3>הוראות סותרות</h3>
<h2>תבניות מוכנות לשימוש</h2>
  <h3>תבנית סיכום</h3>
  <h3>תבנית ניתוח</h3>
  <h3>תבנית כתיבה יצירתית</h3>
<h2>איך לעשות זאת — צעד אחר צעד</h2>  <!-- HowTo block -->
  <ol>
    1. הגדרת המטרה
    2. איסוף ההקשר
    3. בחירת פורמט הפלט
    4. כתיבת הפרומפט
    5. בדיקה ושיפור איטרטיבי
  </ol>
<h2>שאלות נפוצות</h2>
  Q1: מה ההבדל בין פרומפט טוב לפרומפט מצוין?
  Q2: כמה פרטים צריך לתת ב-פרומפט?
  Q3: האם כדאי להשתמש בעברית או באנגלית?
  Q4: איך יודעים שהפרומפט עובד?
  Q5: האם תבניות מוכנות מוגבלות את היצירתיות?
<h2>סיכום</h2>
```

**Internal links (≥3):**
- `/blog/chain-of-thought-prompting-guide` (anchor: "פרומפטים בשיטת chain-of-thought")
- `/blog/prompt-engineering-dictionary-glossary` (anchor: "מילון מונחים לפרומפט אנג׳ינירינג")
- `/library?category=מדריכים` (anchor: "ספריית פרומפטים מוכנים")

- [ ] **Step 2: Write the file** — full Hebrew HTML matching the outline, 12,000–15,000 chars, applying the style requirements at the top of this plan.

- [ ] **Step 3: Validate locally**

```bash
node -e "
const fs = require('fs');
const c = fs.readFileSync('supabase/migrations/blog-content-2026-05-10/how-to-write-good-prompt.html','utf8');
const len = c.length;
const hasFaq = /<h2>שאלות נפוצות<\/h2>/.test(c);
const hasHowTo = /<h2>איך לעשות זאת/.test(c);
const linkCount = (c.match(/href=\"\//g) || []).length;
console.log({len, hasFaq, hasHowTo, linkCount});
if (len < 12000 || len > 15000) process.exit(1);
if (!hasFaq) process.exit(2);
if (!hasHowTo) process.exit(3);
if (linkCount < 3) process.exit(4);
console.log('OK');
"
```

Expected: `{ len: <between 12000 and 15000>, hasFaq: true, hasHowTo: true, linkCount: >=3 } OK`

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/blog-content-2026-05-10/how-to-write-good-prompt.html
git commit -m "feat(blog): rewrite how-to-write-good-prompt body"
```

### Task 4: `gpt-5-vs-claude-opus-4-hebrew-2026.html`

**File:** `supabase/migrations/blog-content-2026-05-10/gpt-5-vs-claude-opus-4-hebrew-2026.html`

- [ ] **Step 1: Outline**

```
<h2>סקירה כללית</h2>
<h2>מה ההבדל בין GPT-5 ל-Claude Opus 4?</h2>  <!-- definitional, GEO -->
<h2>איכות עברית — מי מנצח?</h2>
  <h3>הבנת ניואנסים</h3>
  <h3>תרגום ועריכה</h3>
  <h3>שגיאות נפוצות</h3>
<h2>מהירות ועלות</h2>
  <h3>זמן תגובה ממוצע (מ-2026)</h3>
  <h3>עלות לכל מיליון טוקנים</h3>
<h2>חלון הקשר ויכולות הסקה</h2>
  <h3>אורך פלט מקסימלי</h3>
  <h3>הסקה בשלבים (chain-of-thought)</h3>
<h2>למי מתאים מה — המלצות מעשיות</h2>
  <h3>למשתמש העסקי</h3>
  <h3>לפיתוח קוד</h3>
  <h3>לכתיבה יצירתית</h3>
<h2>שאלות נפוצות</h2>
  Q1: האם GPT-5 או Claude טובים יותר בעברית?
  Q2: איזה מודל זול יותר?
  Q3: האם שווה לשלם על Pro?
  Q4: איזה חלון הקשר גדול יותר?
  Q5: האם אפשר לחבר את שניהם?
<h2>סיכום</h2>
```

**No HowTo block** — comparison post.

**Internal links:** `/blog/chatgpt-vs-claude-hebrew-2026`, `/blog/gemini-vs-claude-hebrew`, `/?capability_mode=STANDARD`.

- [ ] **Step 2: Write the file** — full Hebrew, 12,000–15,000 chars.

- [ ] **Step 3: Validate**

```bash
node -e "
const c=require('fs').readFileSync('supabase/migrations/blog-content-2026-05-10/gpt-5-vs-claude-opus-4-hebrew-2026.html','utf8');
const len=c.length, hasFaq=/<h2>שאלות נפוצות<\/h2>/.test(c), linkCount=(c.match(/href=\"\//g)||[]).length;
console.log({len,hasFaq,linkCount});
if(len<12000||len>15000)process.exit(1);
if(!hasFaq)process.exit(2);
if(linkCount<3)process.exit(4);
console.log('OK');
"
```

Expected: `{ len: 12000–15000, hasFaq: true, linkCount: >=3 } OK`

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/blog-content-2026-05-10/gpt-5-vs-claude-opus-4-hebrew-2026.html
git commit -m "feat(blog): add gpt-5 vs claude opus 4 comparison post"
```

### Task 5: `sora-2-video-prompts-guide-hebrew.html`

**File:** `supabase/migrations/blog-content-2026-05-10/sora-2-video-prompts-guide-hebrew.html`

- [ ] **Step 1: Outline**

```
<h2>סקירה כללית</h2>
<h2>מהו Sora 2 ואיך הוא שונה מהדור הקודם?</h2>
<h2>מבנה פרומפט קולנועי ל-Sora 2</h2>
  <h3>סצנה ונושא</h3>
  <h3>תנועת מצלמה</h3>
  <h3>תאורה ומצב רוח</h3>
  <h3>סגנון ויזואלי</h3>
<h2>חמש הטעויות שהורגות פרומפטים לווידאו</h2>
<h2>דוגמאות עבודה — לפני ואחרי</h2>
  <h3>דוגמה 1: סצנת רחוב</h3>
  <h3>דוגמה 2: דמות מדברת</h3>
  <h3>דוגמה 3: אנימציה מופשטת</h3>
<h2>איך לעשות זאת — צעד אחר צעד</h2>  <!-- HowTo -->
  <ol>
    1. הגדרת הסצנה
    2. בחירת תנועת מצלמה
    3. הגדרת תאורה
    4. ציון משך הסרטון
    5. בדיקה ועידון
  </ol>
<h2>שאלות נפוצות</h2>
  Q1: באיזה אורך מקסימלי תומך Sora 2?
  Q2: האם אפשר לכתוב פרומפט בעברית?
  Q3: כמה זה עולה?
  Q4: האם Sora 2 שומר עקביות בין סצנות?
  Q5: למה הסרטון יוצא איכות נמוכה?
<h2>סיכום</h2>
```

**Internal links:** `/blog/ai-video-prompts-sora-runway-kling`, `/blog/ai-image-prompts-dalle-flux-ideogram`, `/?capability_mode=VIDEO_GENERATION`.

- [ ] **Step 2: Write the file** — 12,000–15,000 chars.

- [ ] **Step 3: Validate**

```bash
node -e "
const c=require('fs').readFileSync('supabase/migrations/blog-content-2026-05-10/sora-2-video-prompts-guide-hebrew.html','utf8');
const len=c.length, hasFaq=/<h2>שאלות נפוצות<\/h2>/.test(c), hasHowTo=/<h2>איך לעשות זאת/.test(c), linkCount=(c.match(/href=\"\//g)||[]).length;
console.log({len,hasFaq,hasHowTo,linkCount});
if(len<12000||len>15000)process.exit(1);
if(!hasFaq||!hasHowTo)process.exit(2);
if(linkCount<3)process.exit(4);
console.log('OK');
"
```

Expected: `{ ..., hasFaq:true, hasHowTo:true, linkCount:>=3 } OK`

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/blog-content-2026-05-10/sora-2-video-prompts-guide-hebrew.html
git commit -m "feat(blog): add sora 2 video prompts guide"
```

### Task 6: `mcp-model-context-protocol-guide.html`

**File:** `supabase/migrations/blog-content-2026-05-10/mcp-model-context-protocol-guide.html`

- [ ] **Step 1: Outline**

```
<h2>סקירה כללית</h2>
<h2>מהו MCP?</h2>  <!-- GEO definitional -->
<h2>למה MCP חשוב?</h2>
  <h3>הבעיה לפני MCP</h3>
  <h3>מה MCP פותר</h3>
<h2>איך MCP עובד מאחורי הקלעים</h2>
  <h3>שרת MCP</h3>
  <h3>לקוח MCP</h3>
  <h3>פרוטוקול ההודעות</h3>
<h2>שלוש דוגמאות לשימוש מעשי</h2>
  <h3>גישה לבסיס נתונים מקומי</h3>
  <h3>קריאה לכלים חיצוניים</h3>
  <h3>אינטגרציה עם CRM</h3>
<h2>איך לעשות זאת — צעד אחר צעד</h2>
  <ol>
    1. בחירת לקוח שתומך ב-MCP
    2. התקנת שרת MCP
    3. אימות והרשאות
    4. בדיקת חיבור
    5. שימוש מתוך פרומפט
  </ol>
<h2>שאלות נפוצות</h2>
  Q1: האם MCP בטוח?
  Q2: עם אילו מודלים זה עובד?
  Q3: כמה זה עולה?
  Q4: צריך לדעת לתכנת?
  Q5: איפה לומדים יותר?
<h2>סיכום</h2>
```

**Internal links:** `/blog/system-prompts-complete-guide`, `/blog/agentic-ai-build-agents-no-code` (post 4 — same batch, will exist after Task 7), `/?capability_mode=AGENT_BUILDER`.

> Cross-batch link note: link to `/blog/agentic-ai-build-agents-no-code` works because all 9 inserts happen atomically in Task 14. Until then, the link is a 404 — accept this transient state during local authoring.

- [ ] **Step 2: Write the file** — 12,000–15,000 chars.

- [ ] **Step 3: Validate**

```bash
node -e "
const c=require('fs').readFileSync('supabase/migrations/blog-content-2026-05-10/mcp-model-context-protocol-guide.html','utf8');
const len=c.length, hasFaq=/<h2>שאלות נפוצות<\/h2>/.test(c), hasHowTo=/<h2>איך לעשות זאת/.test(c), linkCount=(c.match(/href=\"\//g)||[]).length;
console.log({len,hasFaq,hasHowTo,linkCount});
if(len<12000||len>15000)process.exit(1);
if(!hasFaq||!hasHowTo)process.exit(2);
if(linkCount<3)process.exit(4);
console.log('OK');
"
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/blog-content-2026-05-10/mcp-model-context-protocol-guide.html
git commit -m "feat(blog): add MCP guide post"
```

### Task 7: `agentic-ai-build-agents-no-code.html`

**File:** `supabase/migrations/blog-content-2026-05-10/agentic-ai-build-agents-no-code.html`

- [ ] **Step 1: Outline**

```
<h2>סקירה כללית</h2>
<h2>מהו סוכן AI?</h2>  <!-- definitional -->
<h2>למה כדאי לבנות סוכן ולא להשתמש בצ'אט רגיל?</h2>
<h2>שלושת הרכיבים של סוכן טוב</h2>
  <h3>מטרה</h3>
  <h3>כלים</h3>
  <h3>גבולות</h3>
<h2>תרחיש מעשי: סוכן מחקר</h2>
  <h3>הגדרת המשימה</h3>
  <h3>בחירת מקורות מידע</h3>
  <h3>פורמט הדוח</h3>
<h2>איך לעשות זאת — צעד אחר צעד עם Peroot Agent Builder</h2>
  <ol>
    1. פתיחת Agent Builder
    2. כתיבת תיאור המשימה
    3. הוספת כלים
    4. הגדרת גבולות
    5. בדיקה איטרטיבית
    6. פרסום
  </ol>
<h2>טעויות שכדאי להימנע מהן</h2>
<h2>שאלות נפוצות</h2>
  Q1: האם צריך לדעת לתכנת?
  Q2: כמה זה עולה בקרדיטים?
  Q3: האם הסוכן רץ אוטומטית?
  Q4: האם זה בטוח לעבוד מולו?
  Q5: כמה זמן לוקח לבנות סוכן ראשון?
<h2>סיכום</h2>
```

**Internal links:** `/blog/system-prompts-complete-guide`, `/blog/mcp-model-context-protocol-guide`, `/?capability_mode=AGENT_BUILDER`.

- [ ] **Step 2: Write the file** — 12,000–15,000 chars.

- [ ] **Step 3: Validate**

```bash
node -e "
const c=require('fs').readFileSync('supabase/migrations/blog-content-2026-05-10/agentic-ai-build-agents-no-code.html','utf8');
const len=c.length, hasFaq=/<h2>שאלות נפוצות<\/h2>/.test(c), hasHowTo=/<h2>איך לעשות זאת/.test(c), linkCount=(c.match(/href=\"\//g)||[]).length;
console.log({len,hasFaq,hasHowTo,linkCount});
if(len<12000||len>15000)process.exit(1);
if(!hasFaq||!hasHowTo)process.exit(2);
if(linkCount<3)process.exit(4);
console.log('OK');
"
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/blog-content-2026-05-10/agentic-ai-build-agents-no-code.html
git commit -m "feat(blog): add agentic AI no-code post"
```

### Task 8: `voice-prompting-hebrew-guide.html`

**File:** `supabase/migrations/blog-content-2026-05-10/voice-prompting-hebrew-guide.html`

- [ ] **Step 1: Outline**

```
<h2>סקירה כללית</h2>
<h2>מהו פרומפט קולי?</h2>
<h2>מתי לדבר ומתי לכתוב</h2>
  <h3>יתרונות הפרומפט הקולי</h3>
  <h3>מתי לכתוב עדיף</h3>
<h2>איכות הקלטה — שלושה כללים</h2>
  <h3>מיקרופון ותנאי הקלטה</h3>
  <h3>קצב דיבור</h3>
  <h3>הגייה ברורה</h3>
<h2>בחירת שפת פלט בנפרד משפת הקלט</h2>
  <h3>למה זה חשוב</h3>
  <h3>איך לבחור ב-Peroot</h3>
<h2>טעויות הגייה נפוצות והאלגוריתם</h2>
<h2>איך לעשות זאת — צעד אחר צעד</h2>
  <ol>
    1. אישור הרשאות מיקרופון
    2. בחירת שפת קלט
    3. בחירת שפת פלט
    4. הקלטה
    5. עריכת הטקסט שהומר
  </ol>
<h2>שאלות נפוצות</h2>
  Q1: האם הפלט חייב להיות באותה שפה שדיברתי?
  Q2: איך מתקנים שגיאות הגייה?
  Q3: האם דיאלקט עובד?
  Q4: כמה זמן הקלטה אפשר?
  Q5: האם יש פרטיות?
<h2>סיכום</h2>
```

**Internal links:** `/blog/multimodal-prompts-text-image-voice` (post 8 — same batch), `/blog/how-to-write-good-prompt`, `/?capability_mode=STANDARD`.

- [ ] **Step 2: Write the file** — 12,000–15,000 chars.

- [ ] **Step 3: Validate**

```bash
node -e "
const c=require('fs').readFileSync('supabase/migrations/blog-content-2026-05-10/voice-prompting-hebrew-guide.html','utf8');
const len=c.length, hasFaq=/<h2>שאלות נפוצות<\/h2>/.test(c), hasHowTo=/<h2>איך לעשות זאת/.test(c), linkCount=(c.match(/href=\"\//g)||[]).length;
console.log({len,hasFaq,hasHowTo,linkCount});
if(len<12000||len>15000)process.exit(1);
if(!hasFaq||!hasHowTo)process.exit(2);
if(linkCount<3)process.exit(4);
console.log('OK');
"
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/blog-content-2026-05-10/voice-prompting-hebrew-guide.html
git commit -m "feat(blog): add voice prompting hebrew guide"
```

### Task 9: `long-context-prompts-200k-tokens.html`

**File:** `supabase/migrations/blog-content-2026-05-10/long-context-prompts-200k-tokens.html`

- [ ] **Step 1: Outline**

```
<h2>סקירה כללית</h2>
<h2>מהו חלון הקשר של 200K טוקנים?</h2>
<h2>למה הפרומפט הקלאסי לא מספיק כשיש הרבה טקסט</h2>
<h2>שלוש טכניקות לעבודה עם הרבה הקשר</h2>
  <h3>Chunking — חיתוך לחתיכות</h3>
  <h3>סיכום הדרגתי (map-reduce)</h3>
  <h3>ציטוטים מקור</h3>
<h2>אילו מודלים תומכים ב-200K טוקנים?</h2>
  <h3>Claude Opus 4 — 200K</h3>
  <h3>GPT-5 — עד 1M</h3>
  <h3>Gemini 2.5 Pro — 2M</h3>
<h2>טעויות נפוצות בחלונות גדולים</h2>
  <h3>"Lost in the middle"</h3>
  <h3>חוסר מבנה</h3>
  <h3>טוקנים מבוזבזים</h3>
<h2>איך לעשות זאת — צעד אחר צעד</h2>
  <ol>
    1. אומדן גודל ההקשר
    2. חלוקה לקטעים
    3. הוספת רכיב סיכום
    4. בקשה לציטוטים
    5. אימות פלט
  </ol>
<h2>שאלות נפוצות</h2>
  Q1: כמה זה עולה?
  Q2: האם איכות הפלט יורדת בחלון גדול?
  Q3: האם RAG עדיף?
  Q4: איך מודדים שימוש בטוקנים?
  Q5: האם 1M טוקנים שווה את זה?
<h2>סיכום</h2>
```

**Internal links:** `/blog/chain-of-thought-prompting-guide`, `/blog/system-prompts-complete-guide`, `/library?category=פרומפט אנג׳ינירינג`.

- [ ] **Step 2: Write the file** — 12,000–15,000 chars.

- [ ] **Step 3: Validate**

```bash
node -e "
const c=require('fs').readFileSync('supabase/migrations/blog-content-2026-05-10/long-context-prompts-200k-tokens.html','utf8');
const len=c.length, hasFaq=/<h2>שאלות נפוצות<\/h2>/.test(c), hasHowTo=/<h2>איך לעשות זאת/.test(c), linkCount=(c.match(/href=\"\//g)||[]).length;
console.log({len,hasFaq,hasHowTo,linkCount});
if(len<12000||len>15000)process.exit(1);
if(!hasFaq||!hasHowTo)process.exit(2);
if(linkCount<3)process.exit(4);
console.log('OK');
"
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/blog-content-2026-05-10/long-context-prompts-200k-tokens.html
git commit -m "feat(blog): add long context prompts post"
```

### Task 10: `prompt-injection-security-guide.html`

**File:** `supabase/migrations/blog-content-2026-05-10/prompt-injection-security-guide.html`

- [ ] **Step 1: Outline**

```
<h2>סקירה כללית</h2>
<h2>מהי התקפת prompt injection?</h2>
<h2>שני סוגי התקפות שכדאי להכיר</h2>
  <h3>Direct injection</h3>
  <h3>Indirect injection (דרך מסמכים, אתרים)</h3>
<h2>שלושה תרחישים מציאותיים מהעולם העסקי</h2>
  <h3>הדלפת מידע מלקוח</h3>
  <h3>שינוי החלטות אוטומטיות</h3>
  <h3>זיוף תוכן</h3>
<h2>איך מזהים שהותקפת</h2>
<h2>איך לעשות זאת — צעד אחר צעד להגנה</h2>
  <ol>
    1. הפרדת הוראות מקלט משתמש
    2. סינון תווים חשודים
    3. שימוש ב-system prompt חזק
    4. אימות פלט
    5. תיעוד וניטור
  </ol>
<h2>טכניקות הגנה מתקדמות</h2>
  <h3>Sandboxing</h3>
  <h3>Allowlisting פלטים</h3>
  <h3>אדם בלולאה (human-in-the-loop)</h3>
<h2>שאלות נפוצות</h2>
  Q1: האם זה נפוץ באמת?
  Q2: האם המודלים עצמם מגנים?
  Q3: מה לעשות אם הותקפנו?
  Q4: האם זה רלוונטי לי גם בלי תוכנה משלי?
  Q5: יש כלי בדיקה?
<h2>סיכום</h2>
```

**Internal links:** `/blog/system-prompts-complete-guide`, `/blog/ai-prompts-for-small-business-israel`, `/library?category=טעויות נפוצות`.

- [ ] **Step 2: Write the file** — 12,000–15,000 chars.

- [ ] **Step 3: Validate**

```bash
node -e "
const c=require('fs').readFileSync('supabase/migrations/blog-content-2026-05-10/prompt-injection-security-guide.html','utf8');
const len=c.length, hasFaq=/<h2>שאלות נפוצות<\/h2>/.test(c), hasHowTo=/<h2>איך לעשות זאת/.test(c), linkCount=(c.match(/href=\"\//g)||[]).length;
console.log({len,hasFaq,hasHowTo,linkCount});
if(len<12000||len>15000)process.exit(1);
if(!hasFaq||!hasHowTo)process.exit(2);
if(linkCount<3)process.exit(4);
console.log('OK');
"
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/blog-content-2026-05-10/prompt-injection-security-guide.html
git commit -m "feat(blog): add prompt injection security guide"
```

### Task 11: `multimodal-prompts-text-image-voice.html`

**File:** `supabase/migrations/blog-content-2026-05-10/multimodal-prompts-text-image-voice.html`

- [ ] **Step 1: Outline**

```
<h2>סקירה כללית</h2>
<h2>מהו פרומפט מולטימודלי?</h2>
<h2>שלושת הקלטים — מה מתאים למה</h2>
  <h3>טקסט</h3>
  <h3>תמונה</h3>
  <h3>קול</h3>
<h2>איך מודלים שונים מטפלים בקלטים מעורבים</h2>
  <h3>Gemini 2.5 — נטיב מולטימודלי</h3>
  <h3>GPT-5 — vision מובנה</h3>
  <h3>Claude Opus 4 — תמונה ומסמכים</h3>
<h2>שלוש דוגמאות עבודה מעשיות</h2>
  <h3>ניתוח תמונה + הוראה כתובה</h3>
  <h3>הקלטה קולית + סקיצה</h3>
  <h3>סיכום מסמך + שאלה בקול</h3>
<h2>איך לעשות זאת — צעד אחר צעד</h2>
  <ol>
    1. בחירת המודל המתאים
    2. הכנת הקלט הוויזואלי
    3. כתיבת הוראה ברורה
    4. שילוב הקלטים בפרומפט
    5. בדיקה ועידון
  </ol>
<h2>טעויות שגרורות חוסר דיוק</h2>
<h2>שאלות נפוצות</h2>
  Q1: האם איכות התמונה משפיעה?
  Q2: האם אפשר לשלב עברית עם תמונה?
  Q3: כמה זה עולה?
  Q4: האם יש מגבלת גודל קובץ?
  Q5: איזה מודל הכי מדויק לתמונות?
<h2>סיכום</h2>
```

**Internal links:** `/blog/voice-prompting-hebrew-guide`, `/blog/ai-image-prompts-dalle-flux-ideogram`, `/?capability_mode=IMAGE_GENERATION`.

- [ ] **Step 2: Write the file** — 12,000–15,000 chars.

- [ ] **Step 3: Validate**

```bash
node -e "
const c=require('fs').readFileSync('supabase/migrations/blog-content-2026-05-10/multimodal-prompts-text-image-voice.html','utf8');
const len=c.length, hasFaq=/<h2>שאלות נפוצות<\/h2>/.test(c), hasHowTo=/<h2>איך לעשות זאת/.test(c), linkCount=(c.match(/href=\"\//g)||[]).length;
console.log({len,hasFaq,hasHowTo,linkCount});
if(len<12000||len>15000)process.exit(1);
if(!hasFaq||!hasHowTo)process.exit(2);
if(linkCount<3)process.exit(4);
console.log('OK');
"
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/blog-content-2026-05-10/multimodal-prompts-text-image-voice.html
git commit -m "feat(blog): add multimodal prompts post"
```

---

## Task 12: Hebrew QA pass on all 9 content files

**Files:**
- Read: all 9 `.html` files under `supabase/migrations/blog-content-2026-05-10/`

A grep-based check for the most common Hebrew style violations.

- [ ] **Step 1: Run automated checks**

```bash
node -e "
const fs = require('fs');
const path = require('path');
const dir = 'supabase/migrations/blog-content-2026-05-10';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));
const ktivChaserBlocklist = ['תכנה ', 'שרות ', 'מצר ', 'תכנון ל', 'מקרה'];
const englishIdiomBlocklist = ['חשוב ל-think', 'מחוץ לקופסה', 'בסוף היום']; // literal translations
const issues = [];
for (const f of files) {
  const c = fs.readFileSync(path.join(dir, f), 'utf8');
  // Ktiv chaser red flags
  for (const w of ktivChaserBlocklist) {
    if (c.includes(w)) issues.push(\`\${f}: ktiv chaser suspect: '\${w}'\`);
  }
  // Wrong gershayim/geresh
  if (/[a-zA-Zא-ת]\"[a-zA-Zא-ת]/.test(c)) issues.push(\`\${f}: ASCII quote inside Hebrew word — use ׳ or ״\`);
  // 'אתה צריך' / 'אתה חייב' — not gender-neutral
  if (/אתה צריך|אתה חייב|אתה יכול/.test(c)) issues.push(\`\${f}: masculine 'אתה ___' — rewrite with 'יש ל-' / 'ניתן ל-'\`);
  // Definite direct object missing את (heuristic)
  if (/ראית[יםנן]? ה[א-ת]/.test(c)) issues.push(\`\${f}: possible missing 'את' before definite object\`);
  // Smichut error: ha- on first noun
  if (/ה(בית|יום|ספר|לקוח|משתמש) ה(ספר|לקוח|חדש|טוב)/.test(c)) issues.push(\`\${f}: possible smichut error (ha- on first noun)\`);
}
if (issues.length === 0) { console.log('OK — no obvious Hebrew style issues'); }
else { console.log(issues.join('\\n')); process.exit(1); }
"
```

Expected: `OK — no obvious Hebrew style issues`

- [ ] **Step 2: Fix any flagged issues** in the relevant files using Edit tool.

- [ ] **Step 3: Re-run check until clean**

- [ ] **Step 4: Commit if any fixes were made**

```bash
git add supabase/migrations/blog-content-2026-05-10/
git commit -m "fix(blog): hebrew style cleanup pass"
```

---

## Task 13: Write the migration compile script

**Files:**
- Create: `scripts/compile-blog-migration.mjs`

This script reads the 9 HTML bodies + `metadata.json` and emits the final SQL migration. Hebrew content goes through dollar-quoting (`$content$...$content$`) so embedded apostrophes/quotes never need escaping.

- [ ] **Step 1: Create the script**

```javascript
// scripts/compile-blog-migration.mjs
// Reads HTML bodies + metadata, emits 20260510000000_blog_seo_geo_pass.sql
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CONTENT_DIR = join(ROOT, 'supabase/migrations/blog-content-2026-05-10');
const OUT = join(ROOT, 'supabase/migrations/20260510000000_blog_seo_geo_pass.sql');

const metadata = JSON.parse(readFileSync(join(CONTENT_DIR, 'metadata.json'), 'utf8'));

// Section 2: thumbnail-only updates (keyed on slug)
const THUMBNAIL_FIXES = {
  'gemini-vs-claude-hebrew': '/images/blog/comparisons.svg',
  'midjourney-vs-dalle-hebrew': '/images/blog/comparisons.svg',
  'chatgpt-vs-claude-hebrew-2026': '/images/blog/comparisons.svg',
  'prompts-for-cultural-localization-hebrew-english': '/images/blog/content.svg',
  'prompt-engineering-dictionary-glossary': '/images/blog/prompt-engineering.svg',
  'ai-resume-cover-letter-prompts': '/images/blog/freelancers.svg',
  'chain-of-thought-prompting-guide': '/images/blog/prompt-engineering.svg',
  'ai-image-prompts-dalle-flux-ideogram': '/images/blog/images.svg',
  'system-prompts-complete-guide': '/images/blog/prompt-engineering.svg',
  'ai-prompts-for-teachers-education': '/images/blog/education.svg',
  'midjourney-v7-complete-guide-hebrew': '/images/blog/images.svg',
  'social-media-marketing-prompts': '/images/blog/marketing.svg',
  'coding-prompts-for-developers': '/images/blog/code.svg',
  'ai-prompts-for-small-business-israel': '/images/blog/business.svg',
  'ai-music-prompts-suno-udio': '/images/blog/images.svg',
  'ai-video-prompts-sora-runway-kling': '/images/blog/images.svg',
  'gemini-prompts-complete-guide': '/images/blog/prompt-engineering.svg',
  'claude-prompts-hebrew-guide': '/images/blog/prompt-engineering.svg',
};

const sqlEscape = (s) => s.replaceAll("'", "''");
const dq = (content) => {
  // Pick a safe dollar tag that is guaranteed not to appear in content.
  let tag = 'content';
  while (content.includes('$' + tag + '$')) tag += 'x';
  return `$${tag}$${content}$${tag}$`;
};

const sqlArr = (arr) => `ARRAY[${arr.map(t => `'${sqlEscape(t)}'`).join(',')}]::text[]`;

let sql = `-- 20260510000000_blog_seo_geo_pass.sql\n`;
sql += `-- Generated by scripts/compile-blog-migration.mjs — DO NOT EDIT BY HAND.\n`;
sql += `-- Source: docs/superpowers/specs/2026-05-10-blog-seo-geo-pass-design.md\n`;
sql += `-- Source: docs/superpowers/plans/2026-05-10-blog-seo-geo-pass.md\n\n`;
sql += `BEGIN;\n\n`;

// Section 1+4: 9 content posts (1 rewrite + 8 new) — INSERT ... ON CONFLICT DO UPDATE
sql += `-- =========================================================================\n`;
sql += `-- Section 1: Long-form content (1 rewrite + 8 new posts)\n`;
sql += `-- INSERT ... ON CONFLICT (slug) DO UPDATE — handles both create and refresh.\n`;
sql += `-- =========================================================================\n\n`;

for (const slug of Object.keys(metadata)) {
  const m = metadata[slug];
  const content = readFileSync(join(CONTENT_DIR, `${slug}.html`), 'utf8');
  sql += `INSERT INTO blog_posts (slug, title, content, excerpt, meta_title, meta_description, thumbnail_url, category, tags, status, author, read_time, published_at)\n`;
  sql += `VALUES (\n`;
  sql += `  '${sqlEscape(slug)}',\n`;
  sql += `  '${sqlEscape(m.title)}',\n`;
  sql += `  ${dq(content)},\n`;
  sql += `  '${sqlEscape(m.excerpt)}',\n`;
  sql += `  '${sqlEscape(m.meta_title)}',\n`;
  sql += `  '${sqlEscape(m.meta_description)}',\n`;
  sql += `  '${sqlEscape(m.thumbnail_url)}',\n`;
  sql += `  '${sqlEscape(m.category)}',\n`;
  sql += `  ${sqlArr(m.tags)},\n`;
  sql += `  'published',\n`;
  sql += `  '${sqlEscape(m.author)}',\n`;
  sql += `  '${sqlEscape(m.read_time)}',\n`;
  sql += `  '${m.published_at}'::timestamptz\n`;
  sql += `)\n`;
  sql += `ON CONFLICT (slug) DO UPDATE SET\n`;
  sql += `  title = EXCLUDED.title,\n`;
  sql += `  content = EXCLUDED.content,\n`;
  sql += `  excerpt = EXCLUDED.excerpt,\n`;
  sql += `  meta_title = EXCLUDED.meta_title,\n`;
  sql += `  meta_description = EXCLUDED.meta_description,\n`;
  sql += `  thumbnail_url = EXCLUDED.thumbnail_url,\n`;
  sql += `  category = EXCLUDED.category,\n`;
  sql += `  tags = EXCLUDED.tags,\n`;
  sql += `  status = 'published',\n`;
  sql += `  read_time = EXCLUDED.read_time,\n`;
  sql += `  updated_at = NOW();\n\n`;
}

// Section 2: thumbnail-only fixes
sql += `-- =========================================================================\n`;
sql += `-- Section 2: Thumbnail assignments (17 posts)\n`;
sql += `-- =========================================================================\n\n`;
for (const [slug, url] of Object.entries(THUMBNAIL_FIXES)) {
  sql += `UPDATE blog_posts SET thumbnail_url = '${url}', updated_at = NOW() WHERE slug = '${sqlEscape(slug)}' AND (thumbnail_url IS NULL OR thumbnail_url = '');\n`;
}
sql += `\n`;

// Section 3: read_time typo fix
sql += `-- =========================================================================\n`;
sql += `-- Section 3: read_time typo fix\n`;
sql += `-- =========================================================================\n\n`;
sql += `UPDATE blog_posts SET read_time = '12 דקות קריאה', updated_at = NOW() WHERE slug = 'ai-for-freelancers-guide' AND read_time = '12';\n\n`;

sql += `COMMIT;\n`;

writeFileSync(OUT, sql, 'utf8');
console.log(`Wrote ${OUT} (${sql.length} bytes)`);
```

- [ ] **Step 2: Commit**

```bash
git add scripts/compile-blog-migration.mjs
git commit -m "feat(blog): add migration compile script"
```

---

## Task 14: Generate the migration

**Files:**
- Create: `supabase/migrations/20260510000000_blog_seo_geo_pass.sql` (generated)

- [ ] **Step 1: Run the compile script**

```bash
node scripts/compile-blog-migration.mjs
```

Expected: `Wrote .../20260510000000_blog_seo_geo_pass.sql (NNNNNN bytes)` — should be >100KB.

- [ ] **Step 2: Spot-check the SQL**

```bash
node -e "
const fs = require('fs');
const sql = fs.readFileSync('supabase/migrations/20260510000000_blog_seo_geo_pass.sql','utf8');
const insertCount = (sql.match(/^INSERT INTO blog_posts/gm)||[]).length;
const thumbUpdates = (sql.match(/UPDATE blog_posts SET thumbnail_url/g)||[]).length;
const readTimeUpdate = sql.includes(\"read_time = '12 דקות קריאה'\");
const beginEnd = sql.startsWith('-- ') && sql.includes('BEGIN;') && sql.endsWith('COMMIT;\\n');
console.log({insertCount, thumbUpdates, readTimeUpdate, beginEnd});
if (insertCount !== 9) process.exit(1);
if (thumbUpdates !== 18) process.exit(2);
if (!readTimeUpdate) process.exit(3);
if (!beginEnd) process.exit(4);
console.log('OK');
"
```

Expected: `{ insertCount: 9, thumbUpdates: 18, readTimeUpdate: true, beginEnd: true } OK`

> Note: `THUMBNAIL_FIXES` in the script has 18 entries. The spec inventory listed 17 thumbnail-missing slugs plus the broken post — the 18th entry is for `prompts-for-cultural-localization-hebrew-english` (full slug, was abbreviated in spec table).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260510000000_blog_seo_geo_pass.sql
git commit -m "feat(blog): generate atomic migration for SEO/GEO pass"
```

---

## Task 15: Apply migration to staging (Supabase preview branch)

**Tool:** `mcp__supabase__create_branch`, then `mcp__supabase__apply_migration` on the branch.

- [ ] **Step 1: Create a Supabase preview branch**

Use `mcp__supabase__create_branch` with name `blog-seo-geo-pass-2026-05-10`.

Expected: branch ID returned.

- [ ] **Step 2: Apply migration on the branch**

Use `mcp__supabase__apply_migration` with `name: '20260510000000_blog_seo_geo_pass'`, `query: <contents of 20260510000000_blog_seo_geo_pass.sql>` against the new branch.

Expected: success, no errors.

- [ ] **Step 3: Verify rows touched**

Use `mcp__supabase__execute_sql` on the branch:

```sql
SELECT slug, status, thumbnail_url IS NOT NULL AS has_thumb, char_length(content) AS clen
FROM blog_posts
WHERE updated_at > NOW() - INTERVAL '5 minutes'
ORDER BY slug;
```

Expected: ≥27 rows. All 9 long-form slugs show `clen >= 12000`. All thumbnail-fixed slugs show `has_thumb = true`. `how-to-write-good-prompt` shows `status = 'published'`.

- [ ] **Step 4: Verify the broken post was fixed**

```sql
SELECT slug, status, char_length(content) AS clen, array_length(tags, 1) AS tag_count
FROM blog_posts
WHERE slug = 'how-to-write-good-prompt';
```

Expected: `status = 'published'`, `clen between 12000 and 15000`, `tag_count = 4`.

- [ ] **Step 5: Verify FAQ + HowTo blocks present**

```sql
SELECT slug,
       content LIKE '%<h2>שאלות נפוצות</h2>%' AS has_faq,
       content LIKE '%<h2>איך לעשות זאת%' AS has_howto
FROM blog_posts
WHERE slug IN (
  'how-to-write-good-prompt',
  'sora-2-video-prompts-guide-hebrew',
  'mcp-model-context-protocol-guide',
  'agentic-ai-build-agents-no-code',
  'voice-prompting-hebrew-guide',
  'long-context-prompts-200k-tokens',
  'prompt-injection-security-guide',
  'multimodal-prompts-text-image-voice'
);
```

Expected: all rows `has_faq = true` and `has_howto = true`.

- [ ] **Step 6: If validation passes, merge the branch**

Use `mcp__supabase__merge_branch` to merge into production.

If validation fails: don't merge. Report findings, fix content/migration, regenerate, re-apply on the branch.

---

## Task 16: Production smoke test

**URL:** `https://www.peroot.space/blog`

- [ ] **Step 1: Trigger ISR revalidation** (optional, if instant refresh needed)

```bash
curl -X POST 'https://www.peroot.space/api/revalidate?path=/blog&secret=$REVALIDATE_SECRET'
```

(`REVALIDATE_SECRET` per `src/app/api/revalidate/route.ts` if it exists; otherwise just wait up to 1h.)

- [ ] **Step 2: Verify /blog index shows 55 cards**

Open `https://www.peroot.space/blog` in browser. Count card thumbnails. Confirm zero broken images.

Expected: 55 cards, all with thumbnails.

- [ ] **Step 3: Open 3 random new-post slugs**

For each of `gpt-5-vs-claude-opus-4-hebrew-2026`, `mcp-model-context-protocol-guide`, `prompt-injection-security-guide`:

1. Navigate to `https://www.peroot.space/blog/<slug>`.
2. Confirm page renders, has `<h2>שאלות נפוצות</h2>` block.
3. View source, search `application/ld+json` — confirm 5 occurrences (Article, Breadcrumb, FAQPage, HowTo where applicable, Speakable).

- [ ] **Step 4: Lighthouse SEO**

Run Lighthouse on 2 spot-checks (one new + one repaired). Score must be ≥95.

- [ ] **Step 5: Google Rich Results Test**

Run https://search.google.com/test/rich-results on `https://www.peroot.space/blog/sora-2-video-prompts-guide-hebrew`.

Expected: FAQPage and HowTo schemas both validate.

- [ ] **Step 6: Confirm `/blog/how-to-write-good-prompt` renders**

Navigate to `https://www.peroot.space/blog/how-to-write-good-prompt`. Confirm: full content, no empty page, all sections render.

- [ ] **Step 7: Confirm read_time fix**

On `/blog`, find the `ai-for-freelancers-guide` card. Confirm metadata shows `12 דקות קריאה` (not raw `12`).

---

## Task 17: Acceptance criteria checklist

Run through the spec's acceptance criteria one by one:

- [ ] All 47 + 8 = 55 posts visible at `/blog`.
- [ ] Zero posts missing `thumbnail_url`. (Verify: `SELECT count(*) FROM blog_posts WHERE thumbnail_url IS NULL OR thumbnail_url = ''` → `0`.)
- [ ] Zero posts with `status='draft'`. (Verify: `SELECT count(*) FROM blog_posts WHERE status='draft'` → `0`.)
- [ ] `how-to-write-good-prompt` has `char_length(content) > 5000`. (Already verified in Task 15.)
- [ ] Each of the 8 new slugs returns 200 and renders. (Curl spot-check.)
- [ ] Each of the 8 new posts has a `faqSchema` JSON-LD block in HTML source.
- [ ] Each of the 5 how-to new posts (Sora 2, MCP, Agentic, Voice, Long-context, Injection, Multimodal — actually 7 of 8 have HowTo per outlines; only the comparison post has none) has a `howToSchema` JSON-LD block.
- [ ] `ai-for-freelancers-guide` shows `12 דקות קריאה` in card metadata.

If all pass: feature is shipped.

---

## Self-Review Notes

Spec coverage check:
- Inventory's 18 repair UPDATEs → covered in Task 14 (generated migration) via `THUMBNAIL_FIXES` (18 entries) + `read_time` UPDATE.
- 8 new posts → covered in Tasks 4–11.
- 1 broken post rewrite → Task 3.
- SEO/GEO playbook → encoded in "Required HTML structure" + content task outlines.
- Hebrew style requirements → encoded at top of plan + Task 12 QA pass.
- Schema markup (FAQ/HowTo/Article/Breadcrumb/Speakable) → already wired in `[slug]/page.tsx`; content structure guarantees FAQ/HowTo blocks.
- Single migration architecture → Tasks 13–14.
- Idempotency → `INSERT ... ON CONFLICT DO UPDATE` for content; `UPDATE ... WHERE thumbnail_url IS NULL` for thumbs.
- Testing → Tasks 15 (staging) + 16 (production).
- Acceptance criteria → Task 17.

All spec sections covered.
