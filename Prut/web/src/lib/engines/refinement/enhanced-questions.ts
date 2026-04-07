/**
 * Enhanced GENIUS_QUESTIONS format with priority, category, impact, required fields.
 *
 * Upgrade from the basic format:
 *   [{"id", "question", "description", "examples"}]
 * To:
 *   [{"id", "question", "description", "examples", "priority", "category", "impactEstimate", "required"}]
 *
 * The LLM generates these questions AFTER the main prompt output.
 */

import { CapabilityMode } from '../../capability-mode';

export type QuestionCategory =
  | 'role' | 'task' | 'audience' | 'format' | 'constraints'
  | 'context' | 'platform' | 'style' | 'examples';

export interface EnhancedQuestion {
  id: number;
  question: string;
  description: string;
  examples: string[];
  priority: number;        // 1-10 (10 = highest impact)
  category: QuestionCategory;
  impactEstimate: string;  // e.g., "+10 נקודות"
  required: boolean;       // Is this a critical gap?
}

/**
 * Get instructions for the LLM on how to generate enhanced GENIUS_QUESTIONS.
 * These instructions are appended to the engine's system prompt.
 */
export function getQuestionsPromptInstructions(mode: CapabilityMode, iteration: number = 1): string {
  const modeGuidance = getModeSpecificQuestionGuidance(mode);
  const iterationGuidance = iteration > 1
    ? `\nCRITICAL: This is refinement round ${iteration}. Generate DIFFERENT questions than previous rounds. Focus on gaps that remain after previous answers.`
    : '';

  return `\n\nGENERATE ENHANCED GENIUS_QUESTIONS:
After the main output, generate 2-5 highly-targeted clarifying questions in JSON format.
Each question must follow this EXACT schema:

\`\`\`json
[
  {
    "id": 1,
    "question": "שאלה ממוקדת בעברית?",
    "description": "למה השאלה הזו חשובה וכיצד התשובה תשפר את הפרומפט",
    "examples": ["דוגמה 1", "דוגמה 2", "דוגמה 3", "דוגמה 4"],
    "priority": 10,
    "category": "audience",
    "impactEstimate": "+10 נקודות",
    "required": true
  }
]
\`\`\`

FIELD REQUIREMENTS:
- **priority** (1-10): Rank by expected quality impact. 10 = fixing a critical gap, 1 = nice-to-have.
- **category**: One of: role, task, audience, format, constraints, context, platform, style, examples
- **impactEstimate**: Estimated score boost, e.g., "+10 נקודות" or "+5 נקודות"
- **required**: true ONLY if answering this is critical for a good output
- **examples**: 3-4 concrete, domain-relevant Hebrew answers (more is better than fewer)

QUALITY RULES:
- Questions MUST be ordered by priority (highest first)
- Never ask about something already specified in the prompt
- Never repeat questions asked in previous rounds
- Each question targets ONE specific dimension (not multiple things at once)
- Questions should be direct and specific, not vague
- If the prompt is already comprehensive, return [] (empty array) - this is a sign of success

${modeGuidance}${iterationGuidance}

Output format: \`[GENIUS_QUESTIONS][...JSON array...]\`
Place this AFTER the main prompt content and any [PROMPT_TITLE] tag.`;
}

function getModeSpecificQuestionGuidance(mode: CapabilityMode): string {
  switch (mode) {
    case CapabilityMode.IMAGE_GENERATION:
      return `MODE: IMAGE_GENERATION
Prioritize questions about the 7 visual layers: subject, style, composition, lighting, color, technical quality, negative guidance.
Focus on what's missing for the target platform (Midjourney parameters, DALL-E prose, FLUX camera specs, etc.).
Categories to use: style, context, platform, constraints.`;

    case CapabilityMode.VIDEO_GENERATION:
      return `MODE: VIDEO_GENERATION
Prioritize questions about cinematic aspects: camera movement, subject motion, scene dynamics, lighting, audio (if Veo).
Focus on platform-specific requirements (Runway single camera move, Veo audio spec, Kling physics detail).
Categories to use: style, context, platform, constraints.`;

    case CapabilityMode.DEEP_RESEARCH:
      return `MODE: DEEP_RESEARCH
Prioritize questions about: research scope (date range, geography, specificity), source quality requirements, citation style, depth vs breadth tradeoff, sub-questions (MECE), confidence levels.
Categories to use: context, constraints, format, audience.`;

    case CapabilityMode.AGENT_BUILDER:
      return `MODE: AGENT_BUILDER
Prioritize questions about: agent identity and domain specifics, key capabilities, boundaries (what agent won't do), edge cases, welcome message, success criteria.
Categories to use: role, constraints, context, examples.`;

    case CapabilityMode.STANDARD:
    default:
      return `MODE: STANDARD (text)
Prioritize questions about: target audience (biggest impact), task specificity, output format, tone/style, success criteria, constraints.
Categories to use: audience, task, format, role, constraints.`;
  }
}

/**
 * Parse a string of questions JSON into EnhancedQuestion objects.
 * Gracefully handles malformed JSON or old-format questions.
 */
export function parseEnhancedQuestions(rawJson: string): EnhancedQuestion[] {
  try {
    const trimmed = rawJson.trim();
    if (!trimmed) return [];
    const parsed = JSON.parse(trimmed);
    if (!Array.isArray(parsed)) return [];

    return parsed.map((q: Record<string, unknown>, idx) => ({
      id: typeof q.id === 'number' ? q.id : idx + 1,
      question: typeof q.question === 'string' ? q.question : '',
      description: typeof q.description === 'string' ? q.description : '',
      examples: Array.isArray(q.examples) ? q.examples as string[] : [],
      priority: typeof q.priority === 'number' ? q.priority : 5,
      category: (typeof q.category === 'string' ? q.category : 'context') as QuestionCategory,
      impactEstimate: typeof q.impactEstimate === 'string' ? q.impactEstimate : '',
      required: typeof q.required === 'boolean' ? q.required : false,
    }));
  } catch {
    return [];
  }
}
