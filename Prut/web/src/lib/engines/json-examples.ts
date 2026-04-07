/**
 * json-examples.ts
 *
 * Concrete, fully-filled JSON few-shot examples for platforms that accept
 * structured JSON input. Before this module existed, ImageEngine would
 * inject the schema template (an empty shell) AND plain-text examples from
 * the Stable Diffusion / Nano Banana text skills into the JSON prompt.
 * The LLM saw an empty schema + wrong-format examples and produced
 * inconsistent, often truncated or invalid JSON.
 *
 * This module provides 3-4 fully-filled canonical examples per platform
 * key, returned as a pre-formatted system-prompt block. Callers inject the
 * result directly into the system prompt BEFORE the user's own input.
 *
 * Platform keys covered:
 *   - stable-diffusion-json (SDXL config with all fields)
 *   - nanobanana-json       (Gemini Image structured prompt)
 *
 * To add a new JSON-friendly platform, append a new entry to EXAMPLES and
 * make sure the string is valid parseable JSON — the module verifies this
 * at load time via the assertion in __tests__/json-examples.test.ts.
 */

export interface JsonExample {
  /** Short Hebrew description of the concept — shown to the LLM as context. */
  concept: string;
  /** Valid JSON string that matches the platform's schema. */
  output: string;
}

/**
 * Stable Diffusion XL JSON config examples.
 * Schema: prompt, negative_prompt, width, height, steps, cfg_scale,
 *         sampler_name, scheduler, clip_skip, hires_fix, lora
 */
const STABLE_DIFFUSION_JSON: JsonExample[] = [
  {
    concept: 'פורטרט קולנועי של לוחמת סמוראית ביער במבוק',
    output: `{
  "prompt": "(masterpiece:1.3), (best quality:1.3), cinematic portrait of a female samurai warrior, (lone female samurai:1.2), traditional lacquered armor in deep crimson and black, polished katana in hand, fierce determined expression, (bamboo forest at dusk:1.2), volumetric god rays piercing through bamboo, shallow depth of field, 85mm lens, photorealistic, (sharp focus on eyes:1.4), cinematic color grading, (Kurosawa aesthetic:1.1)",
  "negative_prompt": "worst quality, low quality, blurry, deformed, ugly, watermark, text, signature, cartoon, anime, extra fingers, mutated hands, bad anatomy, disfigured, amateur",
  "width": 832,
  "height": 1216,
  "steps": 35,
  "cfg_scale": 7.5,
  "sampler_name": "DPM++ 2M Karras",
  "scheduler": "Karras",
  "clip_skip": 1,
  "hires_fix": {
    "enable": true,
    "denoising_strength": 0.4,
    "upscaler": "4x-UltraSharp",
    "upscale_by": 1.5
  },
  "lora": []
}`,
  },
  {
    concept: 'איור אנימה של מכשפה צעירה עם חתול שחור',
    output: `{
  "prompt": "(masterpiece:1.3), (best quality:1.3), (anime style:1.2), young witch girl around 16 years old, (long silver hair:1.1), purple eyes, pointy witch hat, black cloak with moon embroidery, (black cat familiar on shoulder:1.2), ancient library background, floating spellbooks, warm candlelight, magical glow, (detailed face:1.3), (vibrant colors:1.1), Studio Ghibli inspired, soft shading",
  "negative_prompt": "worst quality, low quality, blurry, deformed, realistic, photo, photorealistic, western cartoon, 3d, ugly, bad hands, extra fingers, mutated, watermark, text, signature",
  "width": 1024,
  "height": 1024,
  "steps": 28,
  "cfg_scale": 8,
  "sampler_name": "Euler a",
  "scheduler": "Normal",
  "clip_skip": 2,
  "hires_fix": {
    "enable": true,
    "denoising_strength": 0.35,
    "upscaler": "R-ESRGAN 4x+ Anime6B",
    "upscale_by": 1.5
  },
  "lora": [
    { "name": "studio_ghibli_style_v2", "weight": 0.7 }
  ]
}`,
  },
  {
    concept: 'צילום מוצר של שעון יוקרתי על שיש שחור',
    output: `{
  "prompt": "(product photography:1.3), luxury mechanical wristwatch, (rose gold case:1.2), (black dial with white indices:1.1), exposed tourbillon mechanism, brown alligator leather strap, resting on polished black marble slab, soft studio lighting from left, subtle rim light on metal, (extreme detail:1.3), (commercial product shot:1.2), clean minimalist composition, (sharp focus:1.4), 100mm macro lens, f/8, ISO 100",
  "negative_prompt": "worst quality, low quality, blurry, deformed, watermark, text, signature, cluttered background, people, hands, oversaturated, digital noise, amateur",
  "width": 1344,
  "height": 768,
  "steps": 40,
  "cfg_scale": 9,
  "sampler_name": "DPM++ SDE Karras",
  "scheduler": "Karras",
  "clip_skip": 1,
  "hires_fix": {
    "enable": true,
    "denoising_strength": 0.3,
    "upscaler": "4x-UltraSharp",
    "upscale_by": 1.5
  },
  "lora": []
}`,
  },
];

/**
 * Gemini Image (Nano Banana) JSON config examples.
 * Schema: subject (description/expression/consistency_id), camera (lens/aperture/angle),
 *         lighting (type/direction/quality), style, reference_style, mood,
 *         environment (setting/time_of_day/weather), aspect_ratio, constraints
 */
const NANOBANANA_JSON: JsonExample[] = [
  {
    concept: 'דיוקן אדיטוריאלי של שף מאחורי דלפק מסעדה',
    output: `{
  "subject": {
    "description": "A confident Israeli chef in his late 40s with a trimmed salt-and-pepper beard, wearing a crisp white double-breasted chef's coat with rolled sleeves revealing a tattooed forearm, holding a sharp Japanese santoku knife mid-prep over a butcher block filled with fresh herbs and produce",
    "expression": "focused and passionate, slight smile of concentration",
    "consistency_id": "chef_yossi_01"
  },
  "camera": {
    "lens": "85mm",
    "aperture": "f/2.0",
    "angle": "slightly low angle"
  },
  "lighting": {
    "type": "warm tungsten kitchen lighting mixed with window daylight",
    "direction": "side key from the right",
    "quality": "soft with gentle falloff"
  },
  "style": "editorial food photography",
  "reference_style": "Bon Appétit magazine cover aesthetic",
  "mood": "authentic culinary craft and quiet intensity",
  "environment": {
    "setting": "professional open kitchen with brass fixtures and subway tiles in the background softly blurred",
    "time_of_day": "late afternoon",
    "weather": "clear"
  },
  "aspect_ratio": "4:5",
  "constraints": ["no watermark", "no text overlay", "no deformed hands", "no extra fingers", "photorealistic skin texture"]
}`,
  },
  {
    concept: 'צילום אדריכלות של בית מודרני בלילה',
    output: `{
  "subject": {
    "description": "A striking mid-century modern hillside home with floor-to-ceiling glass walls revealing warmly lit interiors, cantilevered roof line, exposed concrete and natural cedar cladding, an infinity pool in the foreground reflecting the illuminated house",
    "expression": "",
    "consistency_id": ""
  },
  "camera": {
    "lens": "24mm",
    "aperture": "f/8",
    "angle": "wide eye level with slight tilt-up"
  },
  "lighting": {
    "type": "blue hour twilight with interior warm lights",
    "direction": "ambient twilight plus interior spill",
    "quality": "balanced warm-cool contrast"
  },
  "style": "architectural photography",
  "reference_style": "Dwell magazine editorial",
  "mood": "luxurious and serene",
  "environment": {
    "setting": "hillside overlooking a distant city skyline, native landscaping with olive trees and ornamental grasses",
    "time_of_day": "blue hour just after sunset",
    "weather": "clear with a few purple clouds"
  },
  "aspect_ratio": "16:9",
  "constraints": ["no watermark", "no text overlay", "no people visible", "long exposure smooth water", "photorealistic"]
}`,
  },
  {
    concept: 'רגע אינטימי בין אם לתינוק בבוקר חורף',
    output: `{
  "subject": {
    "description": "A young mother in her early 30s with wavy chestnut hair tied in a loose bun, wearing an oversized cream knit sweater, cradling her 6-month-old baby who is wrapped in a soft mustard-yellow wool blanket, both of them sitting by a large window with a steaming ceramic mug of coffee on the sill",
    "expression": "tender maternal serenity, eyes closed in a quiet smile as she rests her cheek on the baby's head",
    "consistency_id": "mother_maya_01"
  },
  "camera": {
    "lens": "50mm",
    "aperture": "f/1.8",
    "angle": "eye level, slightly three-quarter"
  },
  "lighting": {
    "type": "soft window daylight from behind",
    "direction": "backlight with gentle fill from front",
    "quality": "very soft, dreamy"
  },
  "style": "lifestyle editorial portrait",
  "reference_style": "Annie Leibovitz intimate family aesthetic",
  "mood": "tender nostalgia and quiet winter warmth",
  "environment": {
    "setting": "cozy modern apartment interior with sheer white curtains, potted monstera plant visible, wooden floor, warm rustic tones",
    "time_of_day": "early morning",
    "weather": "snowy overcast outside visible through window"
  },
  "aspect_ratio": "3:2",
  "constraints": ["no watermark", "no text overlay", "no deformed hands", "no extra fingers", "photorealistic skin and fabric", "natural film grain"]
}`,
  },
];

/**
 * Map of platform key → ordered list of JSON examples.
 * The key matches the `platformKey` produced by getPlatformKey() in
 * image-engine.ts so callers can look up examples by the same key used
 * to resolve the PLATFORM_PROMPTS template.
 */
const EXAMPLES: Record<string, JsonExample[]> = {
  'stable-diffusion-json': STABLE_DIFFUSION_JSON,
  'nanobanana-json': NANOBANANA_JSON,
};

/**
 * Build a formatted few-shot JSON examples block for a given platform key.
 * Returns an empty string if the platform has no JSON examples registered,
 * so callers can concatenate unconditionally.
 *
 * The block uses the same "ADDITIONAL EXAMPLES" header as the text-mode
 * examples block so the LLM receives a visually consistent pattern.
 */
export function getJsonExamplesBlock(platformKey: string, limit: number = 3): string {
  const pool = EXAMPLES[platformKey];
  if (!pool || pool.length === 0) return '';

  const selected = pool.slice(0, Math.max(1, Math.min(limit, pool.length)));

  const lines: string[] = [
    '',
    '',
    'ADDITIONAL EXAMPLES (fully-filled JSON — follow this exact structure and depth of detail):',
    '',
  ];

  for (const ex of selected) {
    lines.push(`CONCEPT: ${ex.concept}`);
    lines.push('OUTPUT:');
    lines.push(ex.output);
    lines.push('');
  }

  lines.push('CRITICAL: Every example above is valid parseable JSON. Your output MUST also be valid parseable JSON with NO markdown fences, NO prose before or after, NO trailing commas, NO comments.');

  return lines.join('\n');
}

/**
 * Exported for tests only — lets the test suite iterate every example and
 * verify it parses as valid JSON, preventing a regression where someone
 * edits this file and accidentally breaks a string.
 */
export const __TEST_EXAMPLES = EXAMPLES;
