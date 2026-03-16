/**
 * Contextual placeholder examples for prompt variables.
 * Used by both PromptInput and VariableFiller to show relevant examples.
 */
export const VARIABLE_EXAMPLES: Record<string, string> = {
  // Identity / Entity
  name: "לירן שמעוני",
  company: "סטארט-אפ טכנולוגי",
  brand: "Peroot",
  competitor: "חברה מתחרה בתחום",
  persona: "מנהלת שיווק, 32, תל אביב",

  // Industry / Domain
  industry: "פינטק",
  field: "בינה מלאכותית",
  topic: "אוטומציה בשירות לקוחות",
  subject: "השקת מוצר חדש",

  // Product / Feature
  product: "אפליקציית ניהול תקציב",
  feature: "אוטומציה חכמה",

  // Audience
  target_audience: "בעלי עסקים קטנים",
  audience: "מפתחים ויזמים",
  age_group: "25-35",

  // Tone / Style / Mood
  tone: "מקצועי ונגיש",
  style: "מודרני ונקי",
  mood: "אנרגטי ומעורר השראה",

  // Role / Platform / Channel
  role: "מנהל שיווק",
  platform: "LinkedIn",
  channel: "אינסטגרם",

  // Goals / Metrics
  goal: "הגדלת המרות ב-20%",
  metric: "שיעור המרה",
  benefit: "חיסכון של 5 שעות בשבוע",
  pain_point: "חוסר זמן",
  cta: "התחילו עכשיו",

  // Content
  format: "מאמר בלוג",
  headline: "הדרך החדשה לנהל את העסק שלכם",
  email_subject: "הצעה בלעדית בשבילכם",
  blog_name: "TechPulse",
  language: "עברית",

  // Logistics
  location: "תל אביב",
  city: "תל אביב",
  duration: "3 דקות",
  budget: "₪10,000",
  deadline: "סוף החודש",
  season: "חורף 2026",

  // Visual / Media
  color: "כחול כהה",
  size: "1080x1080",
  lighting: "תאורה טבעית רכה",
  scene: "חנות קפה ביום גשום",
  camera: "Dolly zoom in",
  resolution: "4K",
  aspect_ratio: "16:9",
};

/**
 * Returns a contextual placeholder string for a given variable name.
 * Tries exact match first, then partial/substring match, then falls back to a generic hint.
 */
export function getVariablePlaceholder(varName: string): string {
  const lower = varName.toLowerCase().replace(/\s+/g, "_");
  if (VARIABLE_EXAMPLES[lower]) return VARIABLE_EXAMPLES[lower];
  // Check partial matches
  for (const [key, val] of Object.entries(VARIABLE_EXAMPLES)) {
    if (lower.includes(key) || key.includes(lower)) return val;
  }
  return `לדוגמה: ערך עבור ${varName}`;
}
