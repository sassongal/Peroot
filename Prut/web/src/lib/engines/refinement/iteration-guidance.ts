/**
 * 5-tier iteration guidance for refinement flow.
 *
 * Upgrade from the old 3-tier system (1/2/3+) to a richer 5-tier model
 * that scales aggressiveness as iterations progress.
 *
 * Tier 1 — Expansion: Full enhancement, aggressive additions
 * Tier 2 — Gap-filling: Target specific gaps from previous output
 * Tier 3 — Surgical: Precise targeted improvements only
 * Tier 4 — Polish: Word-level refinement, no structural changes
 * Tier 5 — Convergence: Near-optimal, only critical tweaks
 */

export type IterationTier = 'expansion' | 'gap-filling' | 'surgical' | 'polish' | 'convergence';

export interface IterationGuidance {
  tier: IterationTier;
  iteration: number;
  label: string;           // Hebrew + English
  description: string;     // What to do
  changePolicy: string;    // How aggressive
  systemInstructions: string;
}

// Chain-of-Verification block appended to every tier
const COVE_VERIFICATION = `
<self_verification hidden="true">
Before outputting the refined prompt, silently verify:
1. Does this refinement address the user's specific feedback/answers?
2. Is the core intent of the original prompt preserved?
3. Is each change an ACTUAL improvement vs a cosmetic change?
4. Did you avoid introducing new bugs, ambiguities, or meta-text?
If any answer is NO, revise before outputting.
</self_verification>`;

const TIER_DEFINITIONS: Record<IterationTier, Omit<IterationGuidance, 'iteration'>> = {
  expansion: {
    tier: 'expansion',
    label: 'סבב הרחבה (Expansion)',
    description: 'שיפור מקיף - טרנספורמציה של רעיון גולמי לפרומפט מקצועי',
    changePolicy: 'שינויים נרחבים מותרים: הוספות אגרסיביות, ארגון מחדש, הוספת סעיפים שלמים',
    systemInstructions: `זהו סבב השיפור הראשון (Expansion Tier).
משימה: קח את הפרומפט הקיים והפוך אותו לגרסה מקצועית ומפורטת. שינויים נרחבים מותרים - הוסף מה שחסר, ארגן מחדש, חזק חלקים חלשים.
מטרה: פרומפט שלם, עשיר בפרטים, עם כל המרכיבים הדרושים (Role, Task, Context, Format, Constraints, Examples).${COVE_VERIFICATION}`,
  },
  'gap-filling': {
    tier: 'gap-filling',
    label: 'סבב מילוי פערים (Gap-filling)',
    description: 'איתור ומילוי של פערים ספציפיים שנותרו',
    changePolicy: 'שינויים ממוקדים: הוסף סעיפים חסרים, חזק אזורים חלשים. אל תארגן מחדש מה שעובד.',
    systemInstructions: `זהו סבב שיפור שני (Gap-filling Tier).
משימה: ללא ארגון מחדש - רק זיהוי ומילוי פערים. הפרומפט מהסבב הקודם כבר מוצק. עליך לזהות מה עדיין חסר ולהוסיף אותו בנקודה המתאימה.
מטרה: פרומפט שלם יותר בלי לפגוע במה שכבר עובד.${COVE_VERIFICATION}`,
  },
  surgical: {
    tier: 'surgical',
    label: 'סבב כירורגי (Surgical)',
    description: 'שיפורים מדויקים ממוקדים בלבד',
    changePolicy: 'שינויים זעירים: דיוק בניסוחים, חידוד של הנחיות, החלפת מילים חלשות במילים חזקות. אין שינויים מבניים.',
    systemInstructions: `זהו סבב שיפור שלישי (Surgical Tier).
משימה: שינויים כירורגיים בלבד. הפרומפט כבר חזק. עליך לחדד ניסוחים, להחליף מילים חלשות, לדייק הנחיות מעורפלות. שמור על המבנה הכללי.
מטרה: דיוק מקסימלי בלי לשבור את מה שכבר עובד.${COVE_VERIFICATION}`,
  },
  polish: {
    tier: 'polish',
    label: 'סבב הברקה (Polish)',
    description: 'ליטוש ברמת המילה, התאמות טון',
    changePolicy: 'שינויים מיקרוסקופיים: החלפת מילה יחידה, התאמת טון, סימני פיסוק. אסורים שינויים מבניים או תוספות של סעיפים.',
    systemInstructions: `זהו סבב שיפור רביעי (Polish Tier).
משימה: ליטוש ברמת המילה בלבד. אסור לשנות את המבנה, אסור להוסיף סעיפים חדשים. מותר: החלפת מילה, תיקון ניסוח, דיוק סימן פיסוק.
מטרה: פרומפט מלוטש שכל מילה בו במקומה. אם אין מה לשפר - אמור זאת במפורש.${COVE_VERIFICATION}`,
  },
  convergence: {
    tier: 'convergence',
    label: 'סבב התכנסות (Convergence)',
    description: 'הפרומפט קרוב לאופטימלי - רק שינויים קריטיים',
    changePolicy: 'שינויים מינימליים. לעיתים קרובות, התשובה הנכונה היא "הפרומפט במצבו הטוב ביותר".',
    systemInstructions: `זהו סבב שיפור חמישי+ (Convergence Tier).
משימה: הפרומפט כבר קרוב לאופטימלי. אל תשנה אלא אם יש פגם אמיתי. אם המשתמש מבקש שיפור ואין מה לשפר - אמור זאת בפירוש והסבר למה.
מטרה: שמור על איכות. היזהר מ-"over-fitting" (שיפורים שמרגישים כמו שינוי אבל לא באמת משפרים).
אם יש שיפורים ברורים - בצע אותם. אם לא - החזר את הגרסה הקיימת עם הערה.${COVE_VERIFICATION}`,
  },
};

/**
 * Get iteration guidance based on the round number and mode.
 */
export function getIterationGuidance(iteration: number): IterationGuidance {
  let tier: IterationTier;
  if (iteration <= 1) tier = 'expansion';
  else if (iteration === 2) tier = 'gap-filling';
  else if (iteration === 3) tier = 'surgical';
  else if (iteration === 4) tier = 'polish';
  else tier = 'convergence';

  return {
    ...TIER_DEFINITIONS[tier],
    iteration,
  };
}

/**
 * Get just the system instructions block for a given iteration.
 * Convenience function for injection into engine system prompts.
 */
export function getIterationInstructions(iteration: number): string {
  return getIterationGuidance(iteration).systemInstructions;
}
