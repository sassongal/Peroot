"use client";

import { useState, useEffect } from "react";
import { Lightbulb, X } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Fun Facts ──────────────────────────────────────────────────────────────

const FACTS = [
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
];

const STORAGE_KEY = "peroot_fun_facts";
const SESSION_KEY = "peroot_fun_fact_dismissed";

interface FactState {
  seenIndexes: number[];
}

function getNextFactIndex(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const state: FactState = raw ? JSON.parse(raw) : { seenIndexes: [] };

    // Find unseen facts
    const unseen = FACTS.map((_, i) => i).filter(i => !state.seenIndexes.includes(i));

    // If all seen, reset
    if (unseen.length === 0) {
      state.seenIndexes = [];
      const idx = Math.floor(Math.random() * FACTS.length);
      state.seenIndexes.push(idx);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return idx;
    }

    // Pick random from unseen
    const idx = unseen[Math.floor(Math.random() * unseen.length)];
    state.seenIndexes.push(idx);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return idx;
  } catch {
    return Math.floor(Math.random() * FACTS.length);
  }
}

function isDismissedThisSession(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === "true";
  } catch {
    return false;
  }
}

export function DidYouKnowBanner() {
  const [factIndex, setFactIndex] = useState<number | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Don't show if already dismissed this session
    if (isDismissedThisSession()) return;

    const idx = getNextFactIndex();
    setFactIndex(idx);
    // Small delay for smooth entrance
    const timer = setTimeout(() => setVisible(true), 800);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    setVisible(false);
    try {
      sessionStorage.setItem(SESSION_KEY, "true");
    } catch { /* ignore */ }
  };

  if (factIndex === null || !visible) return null;

  return (
    <div
      className={cn(
        "w-full transition-all duration-500 ease-out",
        visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
      )}
      dir="rtl"
    >
      <div className="relative flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-500/[0.06] border border-amber-500/15 group">
        {/* Icon */}
        <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500/15 mt-0.5">
          <Lightbulb className="w-4 h-4 text-amber-400" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <span className="text-[11px] font-bold text-amber-400 tracking-wide">
            הידעת?
          </span>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed mt-0.5">
            {FACTS[factIndex]}
          </p>
        </div>

        {/* Close */}
        <button
          onClick={dismiss}
          className="flex-shrink-0 p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-white/5 transition-colors opacity-0 group-hover:opacity-100"
          aria-label="סגור"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
