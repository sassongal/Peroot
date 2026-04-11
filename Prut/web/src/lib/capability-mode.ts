/**
 * Capability Mode System
 * 
 * Defines the behavioral modes for prompts - each mode triggers
 * specific AI pipelines, input requirements, and output rendering.
 */

export enum CapabilityMode {
  /** Default LLM text generation/chat */
  STANDARD = 'STANDARD',
  /** Web connectivity, citations, reasoning steps */
  DEEP_RESEARCH = 'DEEP_RESEARCH',
  /** DALL-E/Midjourney targeting with specific parameters */
  IMAGE_GENERATION = 'IMAGE_GENERATION',
  /** Meta-prompting for custom GPTs or AI Agents */
  AGENT_BUILDER = 'AGENT_BUILDER',
  /** AI video prompt generation */
  VIDEO_GENERATION = 'VIDEO_GENERATION',
}

/** Icon names from lucide-react */
export type IconName = 'MessageSquare' | 'Globe' | 'Palette' | 'Bot' | 'Video';

/** Tailwind color names for theming */
type ColorName = 'sky' | 'emerald' | 'purple' | 'amber' | 'rose';

interface CapabilityConfig {
  mode: CapabilityMode;
  label: string;
  labelHe: string;
  icon: IconName;
  color: ColorName;
  description: string;
  descriptionHe: string;
  /** Fields required for this mode */
  requiredFields?: string[];
  /** Optional extra fields for this mode */
  optionalFields?: string[];
}

export const CAPABILITY_CONFIGS: Record<CapabilityMode, CapabilityConfig> = {
  [CapabilityMode.STANDARD]: {
    mode: CapabilityMode.STANDARD,
    label: 'Standard',
    labelHe: 'סטנדרטי',
    icon: 'MessageSquare',
    color: 'sky',
    description: 'Standard LLM text generation and chat',
    descriptionHe: 'יצירת טקסט וצ׳אט רגיל',
  },
  [CapabilityMode.DEEP_RESEARCH]: {
    mode: CapabilityMode.DEEP_RESEARCH,
    label: 'Deep Research',
    labelHe: 'מחקר מעמיק',
    icon: 'Globe',
    color: 'emerald',
    description: 'Web search with citations and reasoning',
    descriptionHe: 'חיפוש ברשת עם מקורות ושרשרת חשיבה',
  },
  [CapabilityMode.IMAGE_GENERATION]: {
    mode: CapabilityMode.IMAGE_GENERATION,
    label: 'Image Generation',
    labelHe: 'יצירת תמונה',
    icon: 'Palette',
    color: 'purple',
    description: 'Generate images with DALL-E or Midjourney',
    descriptionHe: 'יצירת תמונות עם DALL-E או Midjourney',
    optionalFields: ['aspect_ratio', 'style'],
  },
  [CapabilityMode.AGENT_BUILDER]: {
    mode: CapabilityMode.AGENT_BUILDER,
    label: 'Agent Builder',
    labelHe: 'בונה סוכנים',
    icon: 'Bot',
    color: 'amber',
    description: 'Configure custom GPTs and AI agents',
    descriptionHe: 'הגדרת GPT מותאמים וסוכני AI',
    requiredFields: ['system_instructions'],
  },
  [CapabilityMode.VIDEO_GENERATION]: {
    mode: CapabilityMode.VIDEO_GENERATION,
    label: 'Video Generation',
    labelHe: 'יצירת סרטון',
    icon: 'Video',
    color: 'rose',
    description: 'Generate prompts for AI video platforms',
    descriptionHe: 'יצירת פרומפטים לסרטוני AI',
    requiredFields: ['camera_movement', 'duration'],
    optionalFields: ['style', 'mood'],
  },
};

/** Check if a string is a valid CapabilityMode */
function isValidCapabilityMode(value: string): value is CapabilityMode {
  return Object.values(CapabilityMode).includes(value as CapabilityMode);
}

/**
 * DB column `prompt_engines.mode` uses lowercase snake_case (e.g. deep_research).
 * App code uses the CapabilityMode enum (e.g. DEEP_RESEARCH).
 */
const DB_MODE_ALIASES: Record<string, CapabilityMode> = {
  standard: CapabilityMode.STANDARD,
  deep_research: CapabilityMode.DEEP_RESEARCH,
  image_generation: CapabilityMode.IMAGE_GENERATION,
  agent_builder: CapabilityMode.AGENT_BUILDER,
  video_generation: CapabilityMode.VIDEO_GENERATION,
};

export function capabilityModeToDbMode(mode: CapabilityMode): string {
  return mode.toLowerCase();
}

/** Modes where the client may send `target_model` and engines inject ChatGPT/Claude/Gemini structure hints — not image/video pipelines. */
const CAPABILITIES_WITH_TARGET_MODEL = new Set<CapabilityMode>([
  CapabilityMode.STANDARD,
  CapabilityMode.DEEP_RESEARCH,
  CapabilityMode.AGENT_BUILDER,
]);

/** Whether this capability shows the target-model control and passes hints through to engines. */
export function capabilitySupportsTargetModel(mode: CapabilityMode): boolean {
  return CAPABILITIES_WITH_TARGET_MODEL.has(mode);
}

/** Parse capability mode from user/API/DB strings with fallback to STANDARD. Accepts enum values and snake_case DB aliases. */
export function parseCapabilityMode(value: string | null | undefined): CapabilityMode {
  if (value == null || value === "") {
    return CapabilityMode.STANDARD;
  }
  const trimmed = value.trim();
  if (trimmed === "") {
    return CapabilityMode.STANDARD;
  }
  if (isValidCapabilityMode(trimmed)) {
    return trimmed;
  }
  const fromDb = DB_MODE_ALIASES[trimmed.toLowerCase()];
  if (fromDb) {
    return fromDb;
  }
  return CapabilityMode.STANDARD;
}
