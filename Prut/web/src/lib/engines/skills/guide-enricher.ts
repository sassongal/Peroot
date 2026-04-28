/**
 * Guide Enricher — merges skill file data into guide pages at render time.
 *
 * This implements the "single source of truth" principle: skill files hold
 * the canonical examples and mistakes, and guide pages automatically reflect
 * the latest skill content without duplication.
 *
 * Usage (in guides/[slug]/page.tsx):
 *   const enrichedGuide = enrichGuideFromSkills(guide);
 */

import type { PlatformSkill, SkillExample, SkillMistake } from "./index";
import { getImageSkill, getVideoSkill } from "./index";

// Mapping from guide slug → skill platform key
const GUIDE_SLUG_TO_SKILL: Record<string, { type: "image" | "video"; platform: string }> = {
  midjourney: { type: "image", platform: "midjourney" },
  "gpt-image": { type: "image", platform: "dalle" },
  dalle: { type: "image", platform: "dalle" },
  flux: { type: "image", platform: "flux" },
  "stable-diffusion": { type: "image", platform: "stable-diffusion" },
  imagen: { type: "image", platform: "imagen" },
  "gemini-image": { type: "image", platform: "nanobanana" },
  nanobanana: { type: "image", platform: "nanobanana" },
  "image-prompts": { type: "image", platform: "general" },

  runway: { type: "video", platform: "runway" },
  kling: { type: "video", platform: "kling" },
  wan: { type: "video", platform: "wan" },
  veo: { type: "video", platform: "veo" },
  higgsfield: { type: "video", platform: "higgsfield" },
  minimax: { type: "video", platform: "minimax" },
  "video-prompts": { type: "video", platform: "general" },
};

/**
 * Get the skill associated with a guide slug.
 */
function getSkillForGuideSlug(slug: string): PlatformSkill | undefined {
  const mapping = GUIDE_SLUG_TO_SKILL[slug];
  if (!mapping) return undefined;
  return mapping.type === "image"
    ? getImageSkill(mapping.platform)
    : getVideoSkill(mapping.platform);
}

/**
 * Convert skill examples into the guide example format.
 */
function skillExamplesToGuideExamples(examples: SkillExample[]): Array<{
  concept: string;
  prompt: string;
  explanation: string;
}> {
  return examples.map((ex) => ({
    concept: ex.concept,
    prompt: ex.output,
    explanation: ex.category
      ? `דוגמה מקטגוריית ${ex.category} — הפרומפט מדגים את הסינטקס והמבנה האופטימלי לפלטפורמה.`
      : "דוגמה שמדגימה את הסינטקס והמבנה האופטימלי לפלטפורמה.",
  }));
}

/**
 * Convert skill mistakes to guide mistake format (they're already identical).
 */
function skillMistakesToGuideMistakes(mistakes: SkillMistake[]): Array<{
  bad: string;
  good: string;
  why: string;
}> {
  return mistakes.map((m) => ({ bad: m.bad, good: m.good, why: m.why }));
}

/**
 * Enrich a guide object with fresh data from the corresponding skill file.
 * Returns a new guide object with examples and mistakes replaced by skill data.
 *
 * If no matching skill is found, returns the guide unchanged.
 */
export function enrichGuideFromSkills<
  T extends { slug: string; examples: unknown[]; mistakes: unknown[] },
>(guide: T, options: { mergeMode?: "replace" | "append" } = { mergeMode: "replace" }): T {
  const skill = getSkillForGuideSlug(guide.slug);
  if (!skill) return guide;

  const skillExamples = skillExamplesToGuideExamples(skill.examples);
  const skillMistakes = skill.mistakes ? skillMistakesToGuideMistakes(skill.mistakes) : [];

  if (options.mergeMode === "append") {
    return {
      ...guide,
      examples: [...guide.examples, ...skillExamples] as typeof guide.examples,
      mistakes: [...guide.mistakes, ...skillMistakes] as typeof guide.mistakes,
    };
  }

  // Replace mode: skill is the single source of truth
  return {
    ...guide,
    examples: skillExamples as typeof guide.examples,
    mistakes: (skillMistakes.length > 0 ? skillMistakes : guide.mistakes) as typeof guide.mistakes,
  };
}
