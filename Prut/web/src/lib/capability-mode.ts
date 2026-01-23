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
}

/** Icon names from lucide-react */
export type IconName = 'MessageSquare' | 'Globe' | 'Palette' | 'Bot';

/** Tailwind color names for theming */
export type ColorName = 'sky' | 'emerald' | 'purple' | 'amber';

export interface CapabilityConfig {
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
};

/** Get all capability modes as an array */
export const CAPABILITY_MODES = Object.values(CapabilityMode);

/** Get capability config by mode */
export function getCapabilityConfig(mode: CapabilityMode): CapabilityConfig {
  return CAPABILITY_CONFIGS[mode];
}

/** Check if a string is a valid CapabilityMode */
export function isValidCapabilityMode(value: string): value is CapabilityMode {
  return Object.values(CapabilityMode).includes(value as CapabilityMode);
}

/** Parse capability mode from string with fallback to STANDARD */
export function parseCapabilityMode(value: string | null | undefined): CapabilityMode {
  if (value && isValidCapabilityMode(value)) {
    return value;
  }
  return CapabilityMode.STANDARD;
}
