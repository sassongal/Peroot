# FAQ AI Chatbot — Design Spec

## Goal

Replace the static FAQ accordion in `FAQBubble` with a streaming AI chatbot powered by client-side BM25 retrieval (MiniSearch) and direct Gemini API calls on a free-tier key. Simultaneously expand the FAQ dataset from 33 to ~75 items to cover all platform aspects comprehensively.

## Architecture

```
User types question
        ↓
MiniSearch (client-side BM25, FREE — no server call)
        ↓
top-3 FAQ items (question + answer + category)
        ↓
POST /api/faq-chat { question, context: top3 }
        ↓
Gemini Flash Lite (free-tier key, GEMINI_FAQ_API_KEY)
        ↓
StreamingTextResponse → UI streams Hebrew answer
```

**If MiniSearch score < 0.3:** skip LLM, return static fallback — "לא מצאתי מידע על זה. צור קשר: gal@joya-tech.net".

## Cost

- Retrieval: **$0** (client-side MiniSearch)
- Generation: **$0** (Gemini free tier — 1,500 RPD / 15 RPM)
- Fallback if free tier exhausted: Flash Lite via existing gateway (~$0.00005/query)

## Files

| File | Change |
|---|---|
| `src/lib/faq-data.ts` | Expand from 33 → ~75 items |
| `src/app/api/faq-chat/route.ts` | New POST endpoint |
| `src/components/features/faq/FAQChatBot.tsx` | New chat UI component |
| `src/components/features/faq/FAQBubble.tsx` | Replace accordion content with FAQChatBot |
| `.env.local` | Add `GEMINI_FAQ_API_KEY` |

## FAQ Expansion — Categories & Targets

| Category | Current | Target | New Topics |
|---|---|---|---|
| כללי | 5 | 8 | השוואה למתחרים, עברית vs אנגלית, מה זה prompt engineering |
| תכונות | 4 | 8 | גרף ספריה, שרשראות, context attachments, refine |
| שימוש | 5 | 8 | variables, ייצוא PDF, היסטוריה, דלתות מהירות |
| איכות | 5 | 7 | מדד חוזק, שאלות הבהרה, 10 דימנשנים |
| ספריה | 3 | 6 | גרף, תגיות, שיתוף prompt, ייצוא |
| תוסף Chrome | 0 | 6 | התקנה, אתרים נתמכים, auto-detect, עדכונים |
| שרשראות | 0 | 5 | מה זה chain, use cases, בניה |
| מחיר ותשלום | 1 | 5 | Pro plan, LemonSqueezy, ביטול, הבדל חינמי/Pro |
| חשבון ואבטחה | 0 | 4 | מחיקת נתונים, RLS, כניסה ב-Google, אנונימי |
| מפתחים | 1 | 4 | API, integrations, open source |
| חינוך | 1 | 3 | מורים, סטודנטים, use cases |
| שיווק/עסקי | 2 | 4 | קופירייטינג, SEO, שיווק |
| SEO/תוכן | 1 | 3 | כתיבת תוכן, בלוג, מאמרים |
| אינטגרציות | 1 | 3 | ChatGPT, Claude, Gemini, Notion |

**Total target: ~74 items**

SEO note: first 10 items remain schema-eligible (FAQPage rich results). First 12 remain in HomeSEOContent sr-only. Item order must be preserved for SEO.

## `/api/faq-chat` Route

```typescript
// POST /api/faq-chat
// Body: { question: string, context: FAQItem[] }
// Response: StreamingTextResponse (Vercel AI SDK)

// Rate limit: 10 req/min per IP via Upstash Redis
// Model: gemini-2.5-flash-lite via @ai-sdk/google (already installed)
// API key: process.env.GEMINI_FAQ_API_KEY (free-tier dedicated key)
// createGoogleGenerativeAI({ apiKey: process.env.GEMINI_FAQ_API_KEY })
// Fallback: if GEMINI_FAQ_API_KEY missing → use GOOGLE_GENERATIVE_AI_API_KEY (main key)
```

System prompt (Hebrew):
```
אתה עוזר תמיכה של Peroot — פלטפורמת שיפור פרומפטים בעברית.
ענה בעברית בלבד, בסגנון ידידותי וקצר.
השתמש אך ורק במידע שסופק ב-context.
אם התשובה לא נמצאת ב-context — אמור זאת בכנות והפנה לדף יצירת קשר.
אל תמציא מידע.
```

## `FAQChatBot` Component

**Props:** none (standalone, self-contained)

**State:**
- `messages: { role: 'user'|'assistant', content: string, sources?: FAQItem[] }[]`
- `input: string`
- `isLoading: boolean`

**Mount:** build MiniSearch index from `FAQ_ITEMS` once.

**On submit:**
1. Add user message to thread
2. Run MiniSearch → top-3 results
3. If max score < 0.3 → add static fallback message, skip API call
4. Else POST `/api/faq-chat` → stream response into assistant message
5. Attach `sources` (the top-3 FAQ items) to the assistant message

**UI structure:**
```
┌─────────────────────────────────┐
│ Header (from FAQBubble, unchanged)│
├─────────────────────────────────┤
│ Message thread (scrollable)      │
│                                  │
│  [Welcome message on first load] │
│                                  │
│  👤 שאלת המשתמש                 │
│                                  │
│  🤖 תשובת AI (streaming)        │
│  📎 מבוסס על: [chip] [chip]     │
│                                  │
├─────────────────────────────────┤
│ [שאל/י כאן...          ] [שלח] │
└─────────────────────────────────┘
```

**Source chips:** show `category` of each matched FAQ item. On click — no action (display only).

**Welcome message:**
> "שלום! אני כאן לעזור עם כל שאלה על Peroot. שאל/י חופשי!"

**Error state:** "משהו השתבש. נסה שוב או צור קשר."

**Session:** messages reset on panel close. No persistence.

## MiniSearch Configuration

```typescript
import MiniSearch from 'minisearch'

const searchIndex = new MiniSearch<FAQItem & { id: number }>({
  fields: ['question', 'answer', 'category'],
  storeFields: ['question', 'answer', 'category'],
  searchOptions: {
    boost: { question: 2, category: 1.5 },
    fuzzy: 0.2,
    prefix: true,
  },
})

searchIndex.addAll(FAQ_ITEMS.map((item, i) => ({ id: i, ...item })))
```

Search returns results with `.score` — use threshold 0.3 to gate LLM call.

## Environment Variables

```bash
# .env.local — new variable
GEMINI_FAQ_API_KEY=AIza...   # Free-tier Gemini key, dedicated for FAQ chat
```

Vercel: add to project environment variables (all environments).

## Constraints

- FAQBubble panel shell (trigger button, position, z-index, animation) must not change.
- First 10 FAQ items must remain in place (SEO schema order).
- No auth required for `/api/faq-chat` — public endpoint.
- MiniSearch imported only in client component (no SSR bundle impact).
- `GEMINI_FAQ_API_KEY` must never appear in client-side code.
