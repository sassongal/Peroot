/**
 * The onboarding role, in one place.
 *
 * The answer to "במה נתחיל?" was being used for exactly one thing: seeding a
 * sample prompt into the input box, after which it was thrown away. It is the
 * only thing we know about a user on day one, and the memory layer that
 * personalises every enhancement was waiting ~20 days for the style analyzer
 * to infer the same fact from their library (master plan 3.5).
 *
 * The ids, the labels shown in the overlay, the seed prompt and the memory
 * fact all lived in different files and drifted. They live here now, so adding
 * a role is one edit rather than three that must agree.
 */
export interface OnboardingRole {
  id: string;
  label: string;
  /** Seeds the input box so activation is one click, not a blank page. */
  seed?: string;
  /**
   * Written to `user_memory_facts` as a professional fact. Absent where the
   * answer carries no signal ("משהו אחר"), because a fact that says nothing
   * still costs a slot in the injected block.
   */
  fact?: string;
}

export const ONBOARDING_ROLES: OnboardingRole[] = [
  {
    id: "marketing",
    label: "שיווק ותוכן",
    seed: "כתוב פוסט לרשתות החברתיות שמשווק את המוצר החדש שלי",
    fact: "עוסק בשיווק ובכתיבת תוכן",
  },
  {
    id: "business",
    label: "עסקים ויזמות",
    seed: "כתוב אימייל מקצועי ללקוח פוטנציאלי שמציג את השירות שלי",
    fact: "עוסק בעסקים וביזמות",
  },
  {
    id: "dev",
    label: "פיתוח וקוד",
    seed: "כתוב פונקציה בפייתון שמקבלת רשימת מספרים ומחזירה אותה ממוינת",
    fact: "עוסק בפיתוח תוכנה ובכתיבת קוד",
  },
  {
    id: "creative",
    label: "עיצוב ויצירה",
    seed: "צור תיאור לתמונה של נוף הרים בזריחה בסגנון ציור שמן",
    fact: "עוסק בעיצוב וביצירה",
  },
  {
    id: "study",
    label: "לימודים והוראה",
    seed: "הסבר לי בצורה פשוטה וברורה איך עובד תהליך הפוטוסינתזה",
    fact: "עוסק בלימודים ובהוראה",
  },
  { id: "other", label: "משהו אחר" },
];

const BY_ID = new Map(ONBOARDING_ROLES.map((r) => [r.id, r]));

export function onboardingRole(id: string | null | undefined): OnboardingRole | undefined {
  return id ? BY_ID.get(id) : undefined;
}

/** The Hebrew fact for a role, or null when the role carries no signal. */
export function roleFact(id: string | null | undefined): string | null {
  return onboardingRole(id)?.fact ?? null;
}
