/**
 * The /peroot: command family — SINGLE SOURCE OF TRUTH.
 *
 * Consumed by BOTH:
 *  - /api/mcp prompts/list (mcpTitle + mcpDescription; the build functions
 *    stay in the route)
 *  - the /connect explainer page (pageDescription)
 * so the platform page can never drift from what the MCP server actually
 * serves (help was missing from the page before this existed).
 */

export interface PerootCommand {
  /** MCP prompt name — what the user types after "/peroot:" */
  name: string;
  /** Title shown in MCP clients' prompt pickers. */
  mcpTitle: string;
  /** Description served to MCP clients. */
  mcpDescription: string;
  /** Short marketing-register description for the /connect page. */
  pageDescription: string;
}

export const PEROOT_COMMANDS: PerootCommand[] = [
  {
    name: "enhance",
    mcpTitle: "Peroot: שדרוג פרומפט",
    mcpDescription: "הופך את הבקשה לפרומפט מושלם (מצב סטנדרטי)",
    pageDescription: "הופך כל בקשה לפרומפט מושלם ומורחב",
  },
  {
    name: "image",
    mcpTitle: "Peroot: פרומפט לתמונה",
    mcpDescription: "פרומפט מושלם ליצירת תמונה (Midjourney/gpt-image/Imagen)",
    pageDescription: "פרומפט מותאם ל-Midjourney / gpt-image / Imagen",
  },
  {
    name: "video",
    mcpTitle: "Peroot: פרומפט לוידאו",
    mcpDescription: "פרומפט מושלם ליצירת וידאו (Sora/Veo/Runway/Kling)",
    pageDescription: "פרומפט מותאם ל-Sora / Veo / Runway / Kling",
  },
  {
    name: "research",
    mcpTitle: "Peroot: פרומפט מחקר",
    mcpDescription: "פרומפט מושלם למחקר מעמיק עם מקורות",
    pageDescription: "פרומפט למחקר מעמיק עם תיחום, מקורות ורמות ודאות",
  },
  {
    name: "agent",
    mcpTitle: "Peroot: פרומפט לסוכן",
    mcpDescription: "system prompt מושלם לסוכן/GPT מותאם",
    pageDescription: "System prompt מושלם לסוכן או GPT מותאם",
  },
  {
    name: "save",
    mcpTitle: "Peroot: שמירה לספרייה",
    mcpDescription: "שומר את הפרומפט האחרון לספרייה עם תיוג",
    pageDescription: "שמירה + תיוג אוטומטי לספרייה האישית",
  },
  {
    name: "find",
    mcpTitle: "Peroot: חיפוש בספרייה",
    mcpDescription: "מחפש בפרומפטים השמורים של המשתמש",
    pageDescription: "חיפוש בפרומפטים השמורים שלך",
  },
  {
    name: "quota",
    mcpTitle: "Peroot: כמה נשאר לי",
    mcpDescription: "בדיקת יתרת שדרוגים ומועד חידוש",
    pageDescription: "כמה שדרוגים נשארו ומתי מתחדש",
  },
  {
    name: "help",
    mcpTitle: "Peroot: עזרה",
    mcpDescription: "מה Peroot Connect יודע לעשות",
    pageDescription: "מדריך מהיר לכל הפקודות והכלים",
  },
];

/**
 * Capability groups beyond the commands — the 14 MCP tools, grouped for the
 * /connect page so it reflects the full connected-agent surface.
 */
export const CONNECT_CAPABILITIES: Array<{ title: string; desc: string }> = [
  {
    title: "שדרוג בכל המודים",
    desc: "טקסט, תמונה, וידאו, מחקר וסוכנים — עם בחירת פלטפורמת יעד ומודל יעד",
  },
  { title: "הספרייה האישית", desc: "שמירה עם תיוג אוטומטי, חיפוש, ודפדוף בפרומפטים שלך" },
  { title: "הספרייה הציבורית", desc: "חיפוש במאות תבניות מוכחות ומילוי {משתנים} אוטומטי" },
  { title: "הזיכרון האישי", desc: "הסוכן יכול לזכור עליך עובדות שישפיעו על כל שדרוג עתידי" },
  { title: "Memory Palace", desc: "שליפת הפרומפטים הקרובים בגרף — הקשרים שהמוח שלך בנה" },
  { title: "שרשראות פרומפטים", desc: "הסוכן שולף שרשרת רב-שלבית ומריץ אותה שלב-אחר-שלב" },
];
