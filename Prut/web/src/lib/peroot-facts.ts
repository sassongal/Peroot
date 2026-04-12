/**
 * Peroot fun facts — shared between DidYouKnowBanner and LoadingOverlay.
 * Keeps the source of truth in one place so both surfaces stay in sync,
 * and handles "seen" tracking per-locale so switching languages doesn't
 * show already-seen facts from the other language.
 */

export type FactLocale = "he" | "en";

const FACTS_HE: readonly string[] = [
  "פרומפט מובנה עם הקשר ברור משפר את דיוק התשובה של AI ב-40% בממוצע.",
  "הוספת דוגמה אחת בלבד לפרומפט (One-Shot) יכולה לשפר את איכות הפלט ביותר מ-50%.",
  "פירוט מנתח את הפרומפט שלך ומוסיף אוטומטית מבנה, הקשר ופורמט — בלי שתצטרכו לחשוב על זה.",
  "אפשר לשמור פרומפטים מוצלחים לספרייה האישית ולהשתמש בהם שוב עם {משתנים} שונים.",
  "70% מהמשתמשים שמשתמשים בפירוט באופן קבוע אומרים שזה חוסך להם לפחות 30 דקות ביום.",
  "פרומפט עם הנחיית פורמט (\"כתוב כרשימה ממוספרת\") מקבל תשובה מאורגנת יותר מ-AI.",
  "פירוט תומך ב-5 מצבים: טקסט רגיל, מחקר מעמיק, יצירת תמונות, סרטונים וסוכני AI.",
  "הוספת הנחיית טון (\"כתוב בטון מקצועי אך נגיש\") משפיעה דרמטית על איכות הפלט.",
  "אפשר לשתף פרומפט מושלם עם עמיתים בקליק אחד — הם יקבלו אותו מוכן לשימוש.",
  "פרומפט באורך 50-150 מילים מייצר תוצאות טובות יותר מפרומפט קצר מדי או ארוך מדי.",
  "פירוט מזהה אוטומטית את הקטגוריה של הפרומפט שלך (שיווק, פיתוח, חינוך...) ומתאים את השדרוג.",
  "שרשרת פרומפטים (Chains) מאפשרת לבנות תהליך שלם — שלב אחד מזין את הבא.",
  "בספריית פירוט יש מעל 540 פרומפטים מקצועיים מוכנים בעברית — לכל תחום.",
  "הוספת \"חוקי איכות\" לפרומפט (\"וודא שהתשובה כוללת מקורות\") מעלה משמעותית את הדיוק.",
  "הפרומפט הראשון שלך הוא רק נקודת התחלה — פירוט יכול לשפר אותו שוב ושוב (איטרציה).",
  "AI מגיב טוב יותר כשנותנים לו תפקיד (\"אתה מומחה שיווק\") — ופירוט מוסיף את זה אוטומטית.",
  "מצב מחקר מעמיק מוסיף שרשרת חשיבה ומקורות — מושלם לעבודות אקדמיות ומחקר שוק.",
  "אפשר ליצור פרומפטים לתמונות AI (Midjourney, DALL-E) ישירות מפירוט — בעברית.",
  "משתמשי פירוט Pro מקבלים שדרוגים ללא הגבלה + אפשרות להעתיק בלי watermark.",
  "פרומפט טוב שווה יותר מ-10 ניסיונות עם פרומפט גרוע — וזה בדיוק מה שפירוט עושה.",
] as const;

const FACTS_EN: readonly string[] = [
  "A structured prompt with clear context improves AI answer accuracy by ~40% on average.",
  "Adding just one example (One-Shot) to your prompt can boost output quality by over 50%.",
  "Peroot analyzes your prompt and automatically adds structure, context, and format — so you don't have to.",
  "Save your best prompts to your personal library and reuse them with different {variables}.",
  "70% of regular Peroot users say it saves them at least 30 minutes every day.",
  "Prompts that specify a format (\"write as a numbered list\") get more organized answers from AI.",
  "Peroot supports 5 modes: standard text, deep research, image generation, video, and AI agents.",
  "Setting a tone (\"write in a professional yet approachable voice\") dramatically changes output quality.",
  "Share a perfect prompt with teammates in one click — they get it ready to use.",
  "Prompts of 50-150 words outperform prompts that are too short or too long.",
  "Peroot auto-detects your prompt's category (marketing, dev, education…) and tailors the upgrade.",
  "Prompt Chains let you build a full pipeline — each step feeds the next.",
  "Peroot's library has 540+ professional prompts ready to use, across every domain.",
  "Adding \"quality rules\" (\"make sure the answer includes sources\") significantly boosts accuracy.",
  "Your first prompt is just the starting point — Peroot can improve it again and again (iteration).",
  "AI responds better when given a role (\"you are a marketing expert\") — Peroot adds that automatically.",
  "Deep Research mode adds chain-of-thought and sources — perfect for academic work and market research.",
  "Create AI image prompts (Midjourney, DALL-E) straight from Peroot — in any language.",
  "Peroot Pro users get unlimited upgrades and watermark-free copying.",
  "One great prompt beats ten attempts with a bad one — and that's exactly what Peroot delivers.",
] as const;

const STORAGE_KEY_PREFIX = "peroot_fun_facts_";

interface FactState {
  seenIndexes: number[];
}

export function getFactsForLocale(locale: FactLocale): readonly string[] {
  return locale === "en" ? FACTS_EN : FACTS_HE;
}

/**
 * Detect the current locale from the <html lang="..."> attribute.
 * Runs on the client only — returns "he" during SSR.
 */
export function detectFactLocale(): FactLocale {
  if (typeof document === "undefined") return "he";
  const lang = document.documentElement.lang?.toLowerCase();
  return lang === "en" ? "en" : "he";
}

/**
 * Pick the next fact index for a given locale, preferring facts the
 * user hasn't seen yet (tracked per-locale in localStorage). Falls back
 * to a random pick if localStorage is unavailable.
 */
export function getNextFactIndex(locale: FactLocale): number {
  const facts = getFactsForLocale(locale);
  const storageKey = STORAGE_KEY_PREFIX + locale;
  try {
    const raw = localStorage.getItem(storageKey);
    const state: FactState = raw ? JSON.parse(raw) : { seenIndexes: [] };

    const unseen = facts.map((_, i) => i).filter((i) => !state.seenIndexes.includes(i));

    if (unseen.length === 0) {
      // All seen — reset and pick fresh
      state.seenIndexes = [];
      const idx = Math.floor(Math.random() * facts.length);
      state.seenIndexes.push(idx);
      localStorage.setItem(storageKey, JSON.stringify(state));
      return idx;
    }

    const idx = unseen[Math.floor(Math.random() * unseen.length)];
    state.seenIndexes.push(idx);
    localStorage.setItem(storageKey, JSON.stringify(state));
    return idx;
  } catch {
    return Math.floor(Math.random() * facts.length);
  }
}
