/**
 * Skills Loader — Obsidian-skills pattern for platform prompt knowledge.
 *
 * Features:
 * - Few-shot examples with category tags for smart selection
 * - Negative examples (mistakes) to teach what NOT to do
 * - Platform-specific scoring criteria for quality gates
 * - Smart example selection: picks the 3 most relevant based on user's concept
 */

// Image platform skills
import { skill as midjourney } from './image/midjourney';
import { skill as dalle } from './image/dalle';
import { skill as flux } from './image/flux';
import { skill as stableDiffusion } from './image/stable-diffusion';
import { skill as imagen } from './image/imagen';
import { skill as geminiImage } from './image/gemini-image';
import { skill as imageGeneral } from './image/general';

// Video platform skills
import { skill as runway } from './video/runway';
import { skill as kling } from './video/kling';
import { skill as sora } from './video/sora';
import { skill as veo } from './video/veo';
import { skill as higgsfield } from './video/higgsfield';
import { skill as minimax } from './video/minimax';
import { skill as videoGeneral } from './video/general';

// ── Types ──

export type ExampleCategory =
  | 'portrait' | 'landscape' | 'product' | 'food' | 'architecture'
  | 'abstract' | 'action' | 'emotion' | 'nature' | 'sci-fi'
  | 'fantasy' | 'editorial' | 'street' | 'fashion' | 'commercial'
  | 'documentary' | 'narrative' | 'macro' | 'music-video' | 'interior';

export interface SkillExample {
  concept: string;
  output: string;
  category?: ExampleCategory;
}

export interface SkillMistake {
  bad: string;
  good: string;
  why: string;
}

export interface PlatformSkill {
  platform: string;
  name: string;
  examples: SkillExample[];
  mistakes?: SkillMistake[];
  scoringCriteria?: string[];
}

// ── Skill Registry ──

const IMAGE_SKILLS: Record<string, PlatformSkill> = {
  midjourney,
  dalle,
  flux,
  'stable-diffusion': stableDiffusion,
  imagen,
  nanobanana: geminiImage,
  general: imageGeneral,
};

const VIDEO_SKILLS: Record<string, PlatformSkill> = {
  runway,
  kling,
  sora,
  veo,
  higgsfield,
  minimax,
  general: videoGeneral,
};

// ── Category Detection ──

const CATEGORY_KEYWORDS: Record<ExampleCategory, string[]> = {
  portrait:     ['פורטרט', 'דיוקן', 'פנים', 'אדם', 'אישה', 'גבר', 'ילד', 'ילדה', 'זקן', 'portrait', 'face', 'headshot', 'person', 'woman', 'man', 'child', 'elderly'],
  landscape:    ['נוף', 'הרים', 'ים', 'שקיעה', 'זריחה', 'שמיים', 'יער', 'מדבר', 'landscape', 'mountain', 'sea', 'sunset', 'sunrise', 'sky', 'forest', 'desert', 'ocean', 'beach'],
  product:      ['מוצר', 'שעון', 'בקבוק', 'נעל', 'טלפון', 'product', 'watch', 'bottle', 'shoe', 'phone', 'packaging', 'brand', 'luxury'],
  food:         ['אוכל', 'מאכל', 'בישול', 'שף', 'מסעדה', 'עוגה', 'food', 'cooking', 'chef', 'restaurant', 'cake', 'dish', 'meal', 'sushi', 'pasta', 'coffee'],
  architecture: ['בניין', 'אדריכלות', 'מבנה', 'בית', 'גשר', 'building', 'architecture', 'house', 'bridge', 'interior', 'room', 'skyscraper', 'temple'],
  abstract:     ['מופשט', 'גיאומטרי', 'צורות', 'abstract', 'geometric', 'shapes', 'pattern', 'fluid', 'generative', 'fractal'],
  action:       ['פעולה', 'ריצה', 'קפיצה', 'ספורט', 'מרדף', 'action', 'running', 'jumping', 'sports', 'chase', 'explosion', 'fight', 'parkour'],
  emotion:      ['רגש', 'שמחה', 'עצב', 'הפתעה', 'פחד', 'emotion', 'joy', 'sad', 'surprise', 'fear', 'love', 'tears', 'smile', 'reaction'],
  nature:       ['טבע', 'חיה', 'פרח', 'ציפור', 'עץ', 'nature', 'animal', 'flower', 'bird', 'tree', 'wildlife', 'insect', 'butterfly', 'wolf', 'eagle'],
  'sci-fi':     ['עתידני', 'חלל', 'רובוט', 'סייבר', 'sci-fi', 'futuristic', 'space', 'robot', 'cyber', 'neon', 'hologram', 'spaceship', 'alien'],
  fantasy:      ['פנטזיה', 'דרקון', 'קסם', 'שריון', 'fantasy', 'dragon', 'magic', 'armor', 'wizard', 'castle', 'mythical', 'enchanted', 'fairy'],
  editorial:    ['עריכה', 'מגזין', 'אופנה', 'סטודיו', 'editorial', 'magazine', 'vogue', 'studio', 'professional', 'commercial', 'advertising'],
  street:       ['רחוב', 'עירוני', 'שוק', 'street', 'urban', 'market', 'city', 'graffiti', 'alley', 'nightlife', 'cafe'],
  fashion:      ['אופנה', 'בגד', 'שמלה', 'דוגמן', 'fashion', 'dress', 'model', 'outfit', 'haute couture', 'runway', 'style'],
  commercial:   ['פרסומת', 'מותג', 'שיווק', 'commercial', 'ad', 'brand', 'marketing', 'promo', 'campaign'],
  documentary:  ['תיעודי', 'דוקו', 'ריאליסטי', 'documentary', 'realistic', 'authentic', 'raw', 'candid', 'journalism'],
  narrative:    ['סיפור', 'סצנה', 'דרמה', 'narrative', 'story', 'scene', 'drama', 'cinematic', 'movie', 'film'],
  macro:        ['מאקרו', 'קרוב', 'פרט', 'macro', 'close-up', 'detail', 'texture', 'droplet', 'tiny'],
  'music-video': ['קליפ', 'מוזיקה', 'להקה', 'music video', 'clip', 'band', 'concert', 'performance', 'stage'],
  interior:     ['פנים', 'חדר', 'סלון', 'מטבח', 'interior', 'room', 'living room', 'kitchen', 'decor', 'furniture'],
};

/**
 * Detect relevant categories from a concept string.
 */
function detectCategories(concept: string): ExampleCategory[] {
  const lower = concept.toLowerCase();
  const matches: { category: ExampleCategory; score: number }[] = [];

  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    for (const kw of keywords) {
      if (lower.includes(kw)) score++;
    }
    if (score > 0) matches.push({ category: cat as ExampleCategory, score });
  }

  return matches
    .sort((a, b) => b.score - a.score)
    .map(m => m.category);
}

/**
 * Select the most relevant examples based on the user's concept.
 * Falls back to diverse sampling if no category match.
 */
function selectRelevantExamples(
  examples: SkillExample[],
  concept: string,
  maxExamples: number = 3
): SkillExample[] {
  if (examples.length <= maxExamples) return examples;

  const detectedCats = detectCategories(concept);
  if (detectedCats.length === 0) {
    // No match — return evenly spaced diverse sample
    const step = Math.floor(examples.length / maxExamples);
    return Array.from({ length: maxExamples }, (_, i) => examples[i * step]);
  }

  // Score each example by category match
  const scored = examples.map(ex => {
    const catIndex = ex.category ? detectedCats.indexOf(ex.category) : -1;
    const score = catIndex >= 0 ? detectedCats.length - catIndex : 0;
    return { ex, score };
  });

  scored.sort((a, b) => b.score - a.score);

  // Take top matches, but ensure at least one non-matching for diversity
  const selected = scored.slice(0, maxExamples).map(s => s.ex);

  // If all selected have score 0, just return first N
  if (selected.every((_, i) => scored[i].score === 0)) {
    return examples.slice(0, maxExamples);
  }

  return selected;
}

// ── Public API ──

/**
 * Get few-shot examples formatted for injection into a system prompt.
 * When concept is provided, selects the most relevant examples.
 */
export function getExamplesBlock(
  type: 'image' | 'video',
  platform: string,
  concept?: string,
  maxExamples: number = 3
): string {
  const skills = type === 'image' ? IMAGE_SKILLS : VIDEO_SKILLS;
  const skill = skills[platform];
  if (!skill || skill.examples.length === 0) return '';

  const selected = concept
    ? selectRelevantExamples(skill.examples, concept, maxExamples)
    : skill.examples.slice(0, maxExamples);

  const lines = selected.map((ex, i) =>
    `Example ${i + 1}:\nConcept: "${ex.concept}"\nOutput: ${ex.output}`
  ).join('\n\n');

  return `\nADDITIONAL EXAMPLES (study these for quality and style):\n${lines}\n`;
}

/**
 * Get common mistakes block for injection into system prompt.
 */
export function getMistakesBlock(type: 'image' | 'video', platform: string): string {
  const skills = type === 'image' ? IMAGE_SKILLS : VIDEO_SKILLS;
  const skill = skills[platform];
  if (!skill?.mistakes || skill.mistakes.length === 0) return '';

  const lines = skill.mistakes.map((m, i) =>
    `${i + 1}. BAD: ${m.bad}\n   GOOD: ${m.good}\n   WHY: ${m.why}`
  ).join('\n');

  return `\nCOMMON MISTAKES TO AVOID:\n${lines}\n`;
}

/**
 * Get platform-specific scoring criteria for injection into quality check.
 */
export function getScoringBlock(type: 'image' | 'video', platform: string): string {
  const skills = type === 'image' ? IMAGE_SKILLS : VIDEO_SKILLS;
  const skill = skills[platform];
  if (!skill?.scoringCriteria || skill.scoringCriteria.length === 0) return '';

  const lines = skill.scoringCriteria.map((c, i) => `${i + 1}. ${c}`).join('\n');

  return `\nPLATFORM-SPECIFIC QUALITY CHECKLIST:\n${lines}\n`;
}

/**
 * Get a specific platform skill.
 */
export function getImageSkill(platform: string): PlatformSkill | undefined {
  return IMAGE_SKILLS[platform];
}

export function getVideoSkill(platform: string): PlatformSkill | undefined {
  return VIDEO_SKILLS[platform];
}
