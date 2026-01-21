# [מסמך 6] מפרט טכני (Engineering Spec)

### 1. Architecture & Stack Recommendation
נבחר בגישת **Full-Stack Next.js** לטובת פיתוח מהיר (Velocity) ב-MVP.
*   **Frontend & Backend:** Next.js 14+ (App Router, Server Actions).
*   **Language:** TypeScript (Type safety מקצה לקצה).
*   **Styling:** Tailwind CSS + shadcn/ui (רכיבים נגישים ומותאמים אישית בקלות).
*   **Database:** PostgreSQL (מנוהל ע"י Supabase או Neon).
*   **Auth:** Supabase Auth (קל למימוש, תומך Google/Email).
*   **AI Orchestration:** Vercel AI SDK (שימוש ב-Google Gemini Provider כבחירה ראשונה - ביצועים גבוהים ועלויות נמוכות).
*   **Payments:** Stripe (אם נדרש ב-MVP, אחרת לדחות ל-V1).

### 2. Modules
*   `PromptEngine`: אחראי על בניית הפרומפט למודל (System Prompt injection, Context handling).
*   `UserManager`: ניהול מכסות (Credits), שמירת היסטוריה.
*   `TemplateService`: שליפה וניהול של תבניות סטטיות/דינמיות.

### 3. Safety & Limits
*   **Rate Limiting:** שימוש ב-Upstash (Redis) להגבלת בקשות לפי IP/User (למשל 5 בדקה).
*   **Prompt Injection:** בדיקת סניטיזציה בסיסית בצד שרת לפני שליחה ל-LLM.

#### Checklist להשלמה
- [ ] הקמת ריפו ב-GitHub.
- [ ] הגדרת Vercel Project וחיבור ל-Supabase.
- [ ] רכישת מפתח API ל-OpenAI/Anthropic.
