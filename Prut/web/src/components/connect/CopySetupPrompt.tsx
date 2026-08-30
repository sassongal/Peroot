"use client";

import { useState } from "react";
import { Check, Sparkles } from "lucide-react";
import { toast } from "sonner";

/**
 * "העתק פרומפט חיבור" — one click copies a Hebrew instruction prompt the user
 * pastes into ANY agent (Claude, ChatGPT, Cursor…). The prompt teaches the
 * model what Peroot Connect is and exactly how to connect itself (MCP first,
 * REST fallback, OAuth note), then how to verify with get_quota.
 *
 * When a fresh API key exists (Settings, right after creation) it is embedded;
 * otherwise a placeholder tells the model to ask the user for the key.
 */

export function buildSetupPrompt(apiKey?: string): string {
  const key = apiKey || "<API_KEY — צור בהגדרות Peroot ← Connect והדבק כאן>";
  return [
    "אני רוצה לחבר אותך ל-Peroot Connect — מנוע שדרוג הפרומפטים שלי (peroot.space).",
    "",
    "מה זה נותן לך: כלי enhance_prompt שהופך כל פרומפט לפרומפט מושלם ומורחב",
    "(טקסט / תמונה / וידאו / מחקר עמוק / בניית סוכן), חיפוש ושמירה בספרייה האישית",
    "שלי, תבניות מוכחות מהספרייה הציבורית, והזיכרון האישי שלי שמותאם לכל שדרוג.",
    "",
    "איך להתחבר:",
    "1. אם אתה תומך ב-MCP (Claude Desktop, Cursor, claude.ai ועוד):",
    "   שרת MCP בכתובת https://www.peroot.space/api/mcp",
    `   עם הכותרת:  Authorization: Bearer ${key}`,
    "   (ב-claude.ai וב-ChatGPT אפשר להוסיף קונקטור עם הכתובת בלבד — האישור נעשה ב-OAuth)",
    "2. אם אין לך MCP — השתמש ב-REST API עם אותה כותרת:",
    "   POST https://www.peroot.space/api/v1/enhance",
    "   תיעוד מלא (OpenAPI): https://www.peroot.space/api/v1/openapi",
    "",
    "אחרי החיבור: קרא ל-get_quota כדי לאמת שהחיבור עובד, ומעכשיו — לפני כל משימת",
    "יצירה, שדרג את הפרומפט דרך enhance_prompt במוד המתאים (STANDARD / IMAGE_GENERATION /",
    "VIDEO_GENERATION / DEEP_RESEARCH / AGENT_BUILDER), והעבר תמצית של הקשר השיחה",
    "בפרמטר context כדי שהשדרוג יתבסס על מה שאני באמת עובד עליו.",
  ].join("\n");
}

export function CopySetupPrompt({
  apiKey,
  className = "",
}: {
  apiKey?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(buildSetupPrompt(apiKey));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
    toast.success("פרומפט החיבור הועתק — הדבק אותו אצל הסוכן שלך");
  };

  return (
    <button
      type="button"
      onClick={copy}
      className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-medium rounded-lg text-sm transition-colors border border-amber-500/30 ${className}`}
    >
      {copied ? <Check className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
      {copied ? "הועתק!" : "העתק פרומפט חיבור לסוכן"}
    </button>
  );
}
