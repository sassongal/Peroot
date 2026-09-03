"use client";

import { useState, useCallback } from "react";
import { trackFeatureUse } from "@/lib/analytics";
import { PROMPT_LIBRARY_COUNT } from "@/lib/constants";

// ─── Feature Discovery Tips ─────────────────────────────────────────────────

export interface DiscoveryTip {
  id: string;
  text: string;
  emoji: string;
  /** Which feature this tip promotes */
  feature: string;
  /** localStorage key that indicates the user has used this feature */
  usedKey: string;
  /** Minimum enhance count before this tip can be shown */
  minEnhances: number;
  /** CTA button text */
  cta?: string;
  /** Action to perform on CTA click */
  ctaAction?:
    | "library"
    | "variables"
    | "share"
    | "research"
    | "image"
    | "chains"
    | "public-library";
}

const ALL_TIPS: DiscoveryTip[] = [
  {
    id: "tip_languages",
    text: "אפשר לקבל את הפרומפט באנגלית, בערבית או ברוסית: בורר השפה מעל תיבת הכתיבה",
    emoji: "🌐",
    feature: "שפות פלט",
    usedKey: "peroot_used_output_language",
    minEnhances: 2,
  },
  {
    id: "tip_attachments",
    text: 'אפשר לצרף קובץ, תמונה או קישור ופירוט ישלב את התוכן בפרומפט: הכפתור "קובץ · קול · מודל"',
    emoji: "📎",
    feature: "צירוף הקשר",
    usedKey: "peroot_used_attachments",
    minEnhances: 4,
  },
  {
    id: "tip_handoff",
    text: "אחרי השדרוג אפשר לשגר את הפרומפט ישר ל-ChatGPT, Claude או Gemini, כבר ממולא",
    emoji: "🚀",
    feature: "שיגור למודל",
    usedKey: "peroot_used_handoff",
    minEnhances: 5,
  },
  {
    id: "tip_library",
    text: "אפשר לשמור את הפרומפט לספרייה האישית ולהשתמש בו שוב בכל עת",
    emoji: "📚",
    feature: "ספרייה אישית",
    usedKey: "peroot_used_personal_library",
    minEnhances: 3,
    cta: "שמרו עכשיו",
    ctaAction: "library",
  },
  {
    id: "tip_variables",
    text: "אפשר להוסיף {משתנים} לפרומפט ולמלא אותם בכל שימוש, כמו תבנית חכמה",
    emoji: "✨",
    feature: "משתנים",
    usedKey: "peroot_used_variables",
    minEnhances: 6,
  },
  {
    id: "tip_share",
    text: "אפשר לשתף פרומפט עם קישור, עמיתים יוכלו להעתיק ולהשתמש",
    emoji: "🔗",
    feature: "שיתוף",
    usedKey: "peroot_used_share",
    minEnhances: 8,
    cta: "שתפו",
    ctaAction: "share",
  },
  {
    id: "tip_research",
    text: "במצב מחקר מעמיק (Pro), פירוט מוסיף מקורות ושרשרת חשיבה לפרומפט",
    emoji: "🔬",
    feature: "מחקר מעמיק",
    usedKey: "peroot_used_research",
    minEnhances: 10,
    cta: "נסו מחקר מעמיק",
    ctaAction: "research",
  },
  {
    id: "tip_image",
    text: "במנוי Pro פירוט יוצר פרומפטים לתמונות: Midjourney, DALL-E ועוד",
    emoji: "🎨",
    feature: "יצירת תמונות",
    usedKey: "peroot_used_image",
    minEnhances: 12,
    cta: "נסו תמונות",
    ctaAction: "image",
  },
  {
    id: "tip_chains",
    text: "אפשר לבנות שרשרת פרומפטים, שלב אחד מוביל לבא, כמו pipeline חכם",
    emoji: "🔗",
    feature: "שרשראות",
    usedKey: "peroot_used_chains",
    minEnhances: 15,
    cta: "צרו שרשרת",
    ctaAction: "chains",
  },
  {
    id: "tip_public_library",
    text: `יש ספרייה עם ${PROMPT_LIBRARY_COUNT} פרומפטים מוכנים לכל תחום, אפשר להתחיל מהם`,
    emoji: "📋",
    feature: "ספרייה ציבורית",
    usedKey: "peroot_used_public_library",
    minEnhances: 18,
    cta: "גלו את הספרייה",
    ctaAction: "public-library",
  },
];

const STORAGE_KEY = "peroot_discovery_tips";
const SNOOZE_UNTIL_KEY = "peroot_discovery_snooze_until";
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days after dismiss
const MIN_INTERVAL = 2; // Show tips at most every 2 enhances

function isSnoozed(): boolean {
  try {
    const raw = localStorage.getItem(SNOOZE_UNTIL_KEY);
    if (!raw) return false;
    return Date.now() < Number(raw);
  } catch {
    return false;
  }
}

function snoozeDiscovery() {
  try {
    localStorage.setItem(SNOOZE_UNTIL_KEY, String(Date.now() + SNOOZE_MS));
  } catch {
    /* ignore */
  }
}

interface DiscoveryState {
  seen: string[];
  enhanceCount: number;
  lastShownAtEnhance: number;
}

function getState(): DiscoveryState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  // Fresh state starts at zero: the first success moment belongs to the
  // result, not to a tooltip. Tips become eligible from the third enhance
  // (one-overlay law, UX plan U2.2).
  return { seen: [], enhanceCount: 0, lastShownAtEnhance: 0 };
}

function saveState(state: DiscoveryState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

/** Mark a feature as "used" so its tip won't show again */
export function markFeatureUsed(key: string) {
  try {
    localStorage.setItem(key, "true");
  } catch {
    /* ignore */
  }
  trackFeatureUse(key);
}

function isFeatureUsed(key: string): boolean {
  try {
    return localStorage.getItem(key) === "true";
  } catch {
    return false;
  }
}

export function useFeatureDiscovery() {
  const [activeTips, setActiveTips] = useState<DiscoveryTip[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visible, setVisible] = useState(false);

  /** Call this after each successful enhance */
  const onEnhanceComplete = useCallback(() => {
    if (isSnoozed()) return;

    const state = getState();
    state.enhanceCount += 1;
    saveState(state);

    // Not enough enhances yet
    if (state.enhanceCount < 2) return;

    // Too soon since last tip
    if (state.enhanceCount - state.lastShownAtEnhance < MIN_INTERVAL) return;

    // Find eligible tips
    const eligible = ALL_TIPS.filter(
      (tip) =>
        tip.minEnhances <= state.enhanceCount &&
        !state.seen.includes(tip.id) &&
        !isFeatureUsed(tip.usedKey),
    );

    if (eligible.length === 0) return;

    // Show tips
    state.lastShownAtEnhance = state.enhanceCount;
    saveState(state);

    setActiveTips(eligible);
    setCurrentIndex(0);
    // Small delay so the result section renders first
    setTimeout(() => setVisible(true), 1500);
  }, []);

  /** Mark current tip as seen and go to next */
  const nextTip = useCallback(() => {
    const state = getState();
    if (activeTips[currentIndex]) {
      state.seen.push(activeTips[currentIndex].id);
      saveState(state);
    }

    if (currentIndex < activeTips.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      snoozeDiscovery();
      setVisible(false);
      setActiveTips([]);
    }
  }, [activeTips, currentIndex]);

  /** Dismiss all tips */
  const dismiss = useCallback(() => {
    snoozeDiscovery();
    const state = getState();
    // Mark all currently shown tips as seen
    for (const tip of activeTips) {
      if (!state.seen.includes(tip.id)) {
        state.seen.push(tip.id);
      }
    }
    saveState(state);
    setVisible(false);
    setActiveTips([]);
  }, [activeTips]);

  const currentTip = activeTips[currentIndex] || null;
  const totalTips = activeTips.length;

  return {
    visible,
    currentTip,
    currentIndex,
    totalTips,
    nextTip,
    dismiss,
    onEnhanceComplete,
  };
}
