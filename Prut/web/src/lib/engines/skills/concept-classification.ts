/**
 * Concept Classification Instruction
 *
 * Instructs the LLM to silently classify the user's concept into categories
 * BEFORE generating the prompt. This gives us LLM-level semantic understanding
 * for zero additional API calls (the LLM is already running).
 *
 * Unlike embeddings, this approach:
 * - Adds zero API cost (piggybacks on the existing call)
 * - Works in any language (LLM understands Hebrew + English natively)
 * - Handles typos, slang, and creative phrasings
 * - Self-corrects if the keyword map misses the concept
 */

/**
 * Get the classification instruction block to inject into a system prompt.
 * The LLM will silently classify the concept and use it to select better examples internally.
 */
export function getConceptClassificationBlock(mode: 'image' | 'video' | 'text'): string {
  const categories = CATEGORIES_BY_MODE[mode];

  return `
<concept_classification hidden="true">
STEP 0 — Silent Concept Analysis (do NOT output this):
Before generating the prompt, silently analyze the user's concept and identify which 1-3 of these categories it matches:

${categories}

If the concept matches one of these categories, internally weight your output toward that category's conventions. If it matches none, choose the closest semantic match.

Even if the examples provided below don't perfectly match the user's concept, use your semantic understanding to bridge the gap. For example:
- "תמונה של אישה יפה עם שיער ארוך" → portrait category
- "מסעדה באור נרות" → food + editorial categories
- "רחוב בטוקיו בגשם" → street + narrative categories
- "מחקר על השפעת הבינה המלאכותית על שוק העבודה" → research-market + research-trends

This classification is INTERNAL ONLY. Never output it. Just use it to guide your generation.
</concept_classification>`;
}

const CATEGORIES_BY_MODE: Record<'image' | 'video' | 'text', string> = {
  image: `Visual image categories:
- portrait (people, faces, persons, characters)
- landscape (nature scenes, vistas, outdoors)
- product (commercial products, objects, branded items)
- food (dishes, cuisine, cooking, restaurants)
- architecture (buildings, structures, interiors)
- abstract (geometric, patterns, non-representational)
- fashion (clothing, models, style, runway)
- editorial (magazine, high-end, polished)
- street (urban, city, documentary)
- macro (close-up, detail, texture)
- sci-fi (futuristic, robots, space)
- fantasy (mythological, magical, medieval)
- nature (animals, plants, wildlife)
- action (motion, sports, dynamic)
- emotion (feelings, expressions)
- interior (rooms, decor, spaces)
- commercial (ads, brands, marketing)
- documentary (realistic, authentic, raw)
- narrative (cinematic, story-driven)`,

  video: `Cinematic video categories:
- portrait (people-focused, character-driven)
- landscape (establishing shots, vistas)
- action (motion, chases, dynamic sequences)
- emotion (emotional scenes, character moments)
- narrative (story-driven, dramatic scenes)
- documentary (authentic, observational)
- commercial (ads, brand content)
- music-video (performance, dance, stylized)
- food (culinary, cooking sequences)
- fashion (runway, lookbook, style)
- nature (wildlife, environmental)
- sci-fi (futuristic, VFX-heavy)
- fantasy (mythological, magical)
- street (urban, city atmosphere)
- editorial (polished, cinematic, high-end)
- macro (detail shots, textures)
- interior (architectural, spatial)
- abstract (experimental, non-literal)`,

  text: `Text prompt categories:
Standard text:
- marketing (ads, campaigns, copy, promos)
- email (messages, outreach, newsletters)
- technical (code, docs, engineering)
- creative (stories, poems, fiction)
- strategy (business plans, SWOT, roadmaps)
- sales (pitches, proposals, scripts)
- educational (lessons, tutorials, explanations)
- social-media (Instagram, TikTok, LinkedIn posts)
- business (presentations, reports, meetings)

Research:
- research-market (consumer, competitors, TAM)
- research-academic (literature, thesis, scholarly)
- research-technical (benchmarks, architecture)
- research-competitive (vs comparisons, positioning)
- research-legal (law, regulations, compliance)
- research-healthcare (medical, clinical, pharma)
- research-historical (past events, timelines)
- research-financial (markets, investments, economics)
- research-policy (government, public policy)
- research-trends (forecasting, future, emerging)

Agent:
- agent-customer-service (support, help desk)
- agent-tutor (teaching, homework help)
- agent-coach (fitness, wellness, life)
- agent-writer (writing, editing, content)
- agent-analyst (data, BI, analytics)
- agent-advisor (career, guidance, mentoring)
- agent-therapist (emotional support, mental health)
- agent-recruiter (hiring, talent, HR)
- agent-legal (contracts, legal docs)
- agent-creative (brainstorming, ideation)`,
};
