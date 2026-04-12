/**
 * Canonical Variable Registry for prompt enhancement.
 * All engines use this registry to produce consistent, predictable variable names.
 *
 * This module is the SINGLE SOURCE OF TRUTH for anything that deals with
 * `{placeholder}` tokens in prompt text. Consumers (the Variables Panel in
 * ResultSection, the VariableFiller in library cards, the engine-side
 * registry instruction block) MUST all route through this file. Before this
 * consolidation the codebase had three different regexes and two different
 * extractor implementations, each with its own bugs and Hebrew-label
 * inconsistencies.
 */

interface VariableDefinition {
  key: string;       // snake_case English name used inside {}
  label: string;     // Hebrew description for UI display
  example: string;   // Hebrew example value
}

/**
 * Canonical regex for matching `{token}` placeholders inside prompt text.
 *
 * Deliberately restrictive so that structured JSON outputs (image/video
 * engines in JSON mode) can never be mis-identified as placeholders:
 *   - The first character must be a letter (ASCII or Hebrew) or underscore.
 *   - Subsequent characters are letters / digits / underscore / hyphen /
 *     single space (for multi-word names like `{target audience}`).
 *   - No quotes, colons, commas, braces, newlines, or other JSON syntax.
 *
 * Matches: `{brand_name}`, `{target audience}`, `{קהל_יעד}`, `{tone-style}`
 * Rejects: `{ "subject": {...} }`, `{\n  "k": "v"\n}`, `{ }`, `{}`
 */
export const VARIABLE_TOKEN_REGEX =
  /\{([A-Za-z_\u0590-\u05FF][A-Za-z0-9_\u0590-\u05FF\- ]{0,39})\}/g;

const VARIABLE_REGISTRY: Record<string, VariableDefinition[]> = {
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
const VARIABLE_EXAMPLES: Record<string, string> = {
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
  // Fall back to a localized hint that uses the human-readable Hebrew label
  // so the user sees something meaningful even for unregistered variables.
  return `לדוגמה: ${getVariableLabel(varName).toLowerCase()}`;
}

// --- Hebrew label lookup ---------------------------------------------------

// Flat map: variable key (lowercase, snake_case) → Hebrew label from the
// registry. Built once at module load so consumers can do an O(1) lookup
// without iterating the registry on every render.
const LABEL_BY_KEY: Record<string, string> = (() => {
  const out: Record<string, string> = {};
  for (const group of Object.values(VARIABLE_REGISTRY)) {
    for (const def of group) out[def.key] = def.label;
  }
  return out;
})();

// Common backward-compat aliases whose Hebrew label we want even though
// they don't live in the registry (the engines sometimes still emit them).
const ALIAS_LABELS: Record<string, string> = {
  name: "שם",
  company: "שם החברה",
  brand: "שם המותג",
  audience: "קהל יעד",
  tone: "טון",
  format: "פורמט",
  role: "תפקיד",
  goal: "מטרה",
  location: "מיקום",
  color: "צבע",
  size: "גודל",
  subject: "נושא",
  topic: "נושא",
  language: "שפה",
  style: "סגנון",
  mood: "מצב רוח",
  lighting: "תאורה",
  camera: "מצלמה",
  setting: "סצנה",
  background: "רקע",
};

// Humanize a snake_case / kebab-case / camelCase identifier into a
// space-separated phrase. Used only as the absolute last fallback — real
// keys should live in the registry above. The camelCase split handles
// engine outputs like `{brandName}` which Gemini occasionally produces
// instead of the canonical snake_case convention.
function humanize(key: string): string {
  return key
    .replace(/([a-z\u0590-\u05FF])([A-Z])/g, "$1 $2") // camelCase → "camel Case"
    .replace(/[_\-]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Word-boundary check for partial-key matching. The previous version of
 * `getVariableLabel` used a naive `lower.includes(key)` which produced
 * false-positive labels — `{stone}` was matched as containing `tone` and
 * labelled "טון", `{phone}` likewise, `{username}` got "שם", and so on.
 *
 * This helper requires the alias key to be either the full name or a
 * standalone segment delimited by `_`/`-`/space, so `tone_style` /
 * `brand_tone` / `default-tone` still resolve to "טון", but `stone`
 * does not.
 */
function containsAsSegment(haystack: string, needle: string): boolean {
  if (haystack === needle) return true;
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[_\\- ])${escaped}([_\\- ]|$)`).test(haystack);
}

/**
 * Returns the Hebrew display label for a variable key.
 *
 * Lookup order:
 *   1. Exact match in the canonical registry (`VARIABLE_REGISTRY`).
 *   2. Exact match in the alias table (common LLM outputs like `{tone}`).
 *   3. Partial substring match against registry keys (e.g. `brand_voice`
 *      resolves via the `brand_name` alias to "שם המותג" → "מותג").
 *   4. Humanized form of the raw key — last resort, but never raw
 *      snake_case so the UI never surfaces `brand_name` to the user.
 */
export function getVariableLabel(varName: string): string {
  const raw = varName.trim();
  if (!raw) return "";
  // Pre-process camelCase → snake_case BEFORE lowercasing. Without this
  // step the case boundary is lost (`brandName` → `brandname`) and the
  // alias lookup fails. With it, `brandName` → `brand_name` → exact
  // registry hit → "שם המותג".
  const snake = raw.replace(/([a-z\u0590-\u05FF])([A-Z])/g, "$1_$2");
  const lower = snake.toLowerCase().replace(/\s+/g, "_");

  if (LABEL_BY_KEY[lower]) return LABEL_BY_KEY[lower];
  if (ALIAS_LABELS[lower]) return ALIAS_LABELS[lower];

  // Word-boundary partial match: `brand_voice` resolves via the `brand`
  // alias to "שם המותג", `tone_style` resolves via `tone` to "טון", but
  // `stone` / `phone` / `username` no longer false-match short aliases
  // because the alias key must sit on a `_`/`-`/space boundary.
  for (const [key, label] of Object.entries(ALIAS_LABELS)) {
    if (containsAsSegment(lower, key)) return label;
  }
  for (const [key, label] of Object.entries(LABEL_BY_KEY)) {
    if (containsAsSegment(lower, key) || containsAsSegment(key, lower)) return label;
  }

  return humanize(raw);
}

// --- Extraction & substitution --------------------------------------------

/**
 * Extract every unique `{token}` placeholder from a piece of prompt text.
 * Uses the canonical VARIABLE_TOKEN_REGEX so the result is always a clean
 * list of single-token identifiers — never a JSON body fragment.
 *
 * Returns variable keys in the order they first appear in the text.
 */
export function extractVariables(text: string): string[] {
  if (!text) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const match of text.matchAll(VARIABLE_TOKEN_REGEX)) {
    const key = match[1].trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

/**
 * Substitute every `{token}` in the text with the caller-provided value.
 * Missing or empty values leave the original `{token}` in place so the
 * user can still see which placeholders are unfilled.
 *
 * Only tokens matching VARIABLE_TOKEN_REGEX are substituted — stray `{`
 * in JSON content is left untouched.
 */
export function substituteVariables(
  text: string,
  values: Record<string, string | undefined>
): string {
  if (!text) return text;
  return text.replace(VARIABLE_TOKEN_REGEX, (match, key: string) => {
    const trimmed = key.trim();
    const val = values[trimmed];
    return val && val.trim().length > 0 ? val : match;
  });
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
