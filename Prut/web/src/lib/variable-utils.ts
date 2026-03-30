/**
 * Canonical Variable Registry for prompt enhancement.
 * All engines use this registry to produce consistent, predictable variable names.
 */

export interface VariableDefinition {
  key: string;       // snake_case English name used inside {}
  label: string;     // Hebrew description for UI display
  example: string;   // Hebrew example value
}

export const VARIABLE_REGISTRY: Record<string, VariableDefinition[]> = {
  core: [
    { key: "brand_name", label: "שם המותג", example: "Peroot" },
    { key: "company_name", label: "שם החברה", example: "סטארט-אפ טכנולוגי" },
    { key: "target_audience", label: "קהל יעד", example: "בעלי עסקים קטנים" },
    { key: "industry", label: "תעשייה/תחום", example: "פינטק" },
    { key: "main_goal", label: "המטרה המרכזית", example: "הגדלת המרות ב-20%" },
    { key: "tone_style", label: "טון וסגנון", example: "מקצועי ונגיש" },
  ],
  marketing: [
    { key: "pain_point", label: "הכאב המרכזי של הלקוח", example: "חוסר זמן לניהול תוכן" },
    { key: "unique_value", label: "הצעת הערך הייחודית", example: "אוטומציה שחוסכת 5 שעות בשבוע" },
    { key: "cta", label: "קריאה לפעולה", example: "התחילו תקופת ניסיון חינם" },
    { key: "platform", label: "ערוץ/פלטפורמה", example: "LinkedIn" },
    { key: "competitor", label: "מתחרה עיקרי", example: "חברה מתחרה בתחום" },
    { key: "funnel_stage", label: "שלב בפאנל", example: "מודעות (TOFU)" },
  ],
  content: [
    { key: "content_format", label: "פורמט תוכן", example: "מאמר בלוג" },
    { key: "word_count", label: "אורך רצוי", example: "800-1200 מילים" },
    { key: "key_message", label: "המסר המרכזי", example: "AI מנגיש טכנולוגיה לכולם" },
    { key: "publish_platform", label: "פלטפורמת פרסום", example: "בלוג החברה" },
    { key: "headline", label: "כותרת", example: "הדרך החדשה לנהל את העסק שלכם" },
  ],
  business: [
    { key: "company_size", label: "גודל החברה", example: "5-50 עובדים" },
    { key: "budget", label: "תקציב", example: "₪10,000 לחודש" },
    { key: "timeline", label: "לוח זמנים", example: "Q2 2026" },
    { key: "kpi", label: "מדד הצלחה", example: "שיעור המרה" },
    { key: "market", label: "שוק יעד", example: "שוק ישראלי B2B" },
  ],
  visual: [
    { key: "style", label: "סגנון ויזואלי", example: "מודרני ונקי" },
    { key: "color_palette", label: "פלטת צבעים", example: "כחול כהה וזהב" },
    { key: "lighting", label: "תאורה", example: "תאורה טבעית רכה" },
    { key: "composition", label: "קומפוזיציה", example: "תקריב, זווית גובה העין" },
    { key: "scene", label: "סצנה/רקע", example: "חנות קפה ביום גשום" },
  ],
  research: [
    { key: "research_scope", label: "היקף המחקר", example: "שוק ה-AI בישראל 2024-2026" },
    { key: "time_range", label: "טווח זמנים", example: "3 השנים האחרונות" },
    { key: "source_type", label: "סוג מקורות מועדף", example: "מאמרים אקדמיים ודוחות שוק" },
    { key: "confidence_level", label: "רמת ודאות נדרשת", example: "גבוהה - 3+ מקורות לכל טענה" },
  ],
  agent: [
    { key: "agent_role", label: "תפקיד הסוכן", example: "יועץ שיווק דיגיטלי" },
    { key: "boundary", label: "גבול/מגבלה", example: "אל תמליץ על מוצרים ספציפיים" },
    { key: "escalation_path", label: "נתיב אסקלציה", example: "הפנה למומחה אנושי" },
  ],
};

// Build VARIABLE_EXAMPLES from registry so they stay in sync
export const VARIABLE_EXAMPLES: Record<string, string> = {
  // Backward-compat aliases for old variable names used in existing prompts
  name: "לירן שמעוני",
  company: "סטארט-אפ טכנולוגי",
  brand: "Peroot",
  audience: "מפתחים ויזמים",
  tone: "מקצועי ונגיש",
  format: "מאמר בלוג",
  role: "מנהל שיווק",
  goal: "הגדלת המרות ב-20%",
  location: "תל אביב",
  color: "כחול כהה",
  size: "1080x1080",
  subject: "השקת מוצר חדש",
  topic: "אוטומציה בשירות לקוחות",
  // Registry-derived entries (override aliases if keys collide)
  ...Object.fromEntries(
    Object.values(VARIABLE_REGISTRY)
      .flat()
      .map(v => [v.key, v.example])
  ),
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

/**
 * Formats the variable registry into a compact instruction block for AI system prompts.
 * Only includes relevant domains based on detected category.
 */
export function getRegistryInstructionBlock(category?: string): string {
  const relevantDomains = getRelevantDomains(category);

  const lines: string[] = [];
  for (const domain of relevantDomains) {
    const vars = VARIABLE_REGISTRY[domain];
    if (!vars) continue;
    const varList = vars.map(v => `{${v.key}} (${v.label})`).join(', ');
    lines.push(`${domain}: ${varList}`);
  }

  return lines.join('\n');
}

/**
 * Returns relevant registry domains based on prompt category.
 * Always includes 'core' + 1-2 domain-specific groups.
 */
function getRelevantDomains(category?: string): string[] {
  const domains = ['core'];

  switch (category?.toLowerCase()) {
    case 'marketing':
    case 'sales':
    case 'social':
    case 'ecommerce':
      domains.push('marketing', 'content');
      break;
    case 'creative':
    case 'design':
      domains.push('content', 'visual');
      break;
    case 'data':
    case 'strategy':
    case 'finance':
      domains.push('business', 'research');
      break;
    case 'dev':
    case 'automation':
      domains.push('business');
      break;
    case 'education':
    case 'legal':
    case 'healthcare':
      domains.push('content', 'business');
      break;
    case 'hr':
    case 'operations':
    case 'community':
    case 'nonprofit':
      domains.push('business', 'content');
      break;
    default:
      domains.push('marketing', 'content', 'business');
      break;
  }

  return [...new Set(domains)];
}
