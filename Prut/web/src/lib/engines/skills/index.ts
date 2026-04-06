/**
 * Skills Loader — Obsidian-skills pattern for platform prompt knowledge.
 *
 * Each platform has a skill file with examples that serve as few-shot
 * demonstrations in the system prompt, dramatically improving output quality.
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

export interface SkillExample {
  concept: string;
  output: string;
}

export interface PlatformSkill {
  platform: string;
  name: string;
  examples: SkillExample[];
}

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

/**
 * Get few-shot examples formatted for injection into a system prompt.
 * Returns a string block with multiple concept→output examples.
 */
export function getExamplesBlock(type: 'image' | 'video', platform: string): string {
  const skills = type === 'image' ? IMAGE_SKILLS : VIDEO_SKILLS;
  const skill = skills[platform];
  if (!skill || skill.examples.length === 0) return '';

  const lines = skill.examples.map((ex, i) =>
    `Example ${i + 1}:\nConcept: "${ex.concept}"\nOutput: ${ex.output}`
  ).join('\n\n');

  return `\nADDITIONAL EXAMPLES (study these for quality and style):\n${lines}\n`;
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
