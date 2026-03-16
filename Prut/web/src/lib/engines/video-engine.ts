
import { BaseEngine } from "./base-engine";
import { EngineConfig, EngineInput, EngineOutput } from "./types";
import { CapabilityMode } from "../capability-mode";
import { VideoPlatform } from "../video-platforms";

const PLATFORM_OVERRIDES: Record<VideoPlatform, string> = {
  general: `OUTPUT STRUCTURE — weave ALL 7 mandatory layers into one flowing English paragraph.
The paragraph must read as a seamless cinematic description, not a list. Transition naturally between camera, subject, motion, environment, lighting, and style. Every sentence should serve the motion narrative. 30-80 words.`,

  runway: `PLATFORM: Runway Gen-4.5
Structure: [camera movement]: [establishing scene]. [additional details].

Rules:
- Lead with the camera move — always first. Use precise vocabulary: dolly, pan, tilt, tracking, crane, orbit, push-in, pull-out, handheld, static.
- For static shots: explicitly state "The camera remains motionless."
- Write in natural language sentences — NOT comma-separated keywords.
- One scene per clip. Describe only what SHOULD happen; no negative prompting.
- 30-60 words sweet spot.
- Output in English only.`,

  kling: `PLATFORM: Kling 3.0
Four-part structure: Subject (specific details) + Action (precise movement) + Context (3-5 elements max) + Style (camera, lighting, mood).

Rules:
- Describe weight transfer, momentum, acceleration, deceleration for every movement.
- Always include camera movement with explicit endpoints: "arm rises from waist to above head."
- Limit context to 3-5 core visual elements — never overload.
- Connect simultaneous actions with "while" or "as"; sequential actions with "then." Max 2 simultaneous movements.
- Multi-shot supported: label as "Shot 1 (6s): ... Shot 2 (9s): ..."
- 50-200 words.
- Output in English only.`,

  pika: `PLATFORM: Pika 2.5
Keep SIMPLE. ONE subject only. 50-300 characters total.

Rules:
- Maximum 2 motion types per prompt.
- 1-3 short, focused sentences.
- No complex scenes, no multiple characters.
- Always include one camera movement.
- Format: Subject + Style + Camera move + Lighting.
- Output in English only.`,

  sora: `PLATFORM: Sora 2
Full storyboard/director's brief format. Use clearly labeled blocks:

Camera: [shot type, lens spec, movement — e.g., "35mm virtual lens, slow dolly-in"]
Scene: [environment, time of day, weather, atmosphere]
Subject: [detailed appearance, position, expression]
Action: [moment-by-moment movement description]
Lighting: [direction, quality, color temperature]
Style: [cinematic reference, film stock, color grading]

Rules:
- Use professional cinematography terminology throughout.
- Include virtual lens specs: "35mm virtual lens", "IMAX aerial".
- Describe dialogue separately if needed.
- Highly descriptive = more controlled output.
- 50-150 words.
- Output in English only.`,

  luma: `PLATFORM: Luma Ray3
Conversational, story-telling style. 3-4 natural sentences.

Rules:
- 20-40 words sweet spot — too short causes hallucinated details, too long causes ignored instructions.
- Default to medium close-up framing unless specified otherwise.
- Use @character placeholder where character reference is needed.
- Describe the scene as if telling a story to a cinematographer.
- Mention rack focus, depth of field, god rays where cinematically relevant.
- Output in English only.`,

  minimax: `PLATFORM: Minimax Hailuo 2.3
Formula: [Camera Shot + Motion] + [Subject + Description] + [Action] + [Scene + Description] + [Lighting] + [Style/Mood].

Rules:
- Focus EXTENSIVELY on body movement and facial expressions — Minimax excels here.
- Describe gestures, micro-expressions, body language shifts in explicit detail.
- Include specific movement choreography: "turns head slowly to the left while raising right hand."
- 40-100 words.
- Output in English only.`,

  higgsfield: `PLATFORM: Higgsfield
Short, direct command syntax. Remove all filler words. Think CLI-style directives.

Rules:
- Structure: camera/framing instructions + subject/identity + motion/action.
- Use active verbs: "darts through", "leaps across", "slowly dolly-in."
- Aesthetic tags force specific looks: "Shot on full-frame cinema camera", "anamorphic lens flare."
- Timing cues control when actions start/stop: "at 1s", "holds for 2s", "cuts on impact."
- Layered prompt approach — each layer is a directive, not a description.
- 30-60 words.
- Output in English only.`,

  nanobanana: `PLATFORM: Nano Banana (Gemini-based)
Structure: Subject + Composition (camera/framing) + Action + Environment details.

Rules:
- Every token is processed as a strict instruction — be precise and literal.
- Character consistency is paramount: describe characters with enough detail to remain identical across scenes.
- Physically accurate shadows and lighting must be explicitly described.
- Write in natural language structured like a design document — clear, unambiguous.
- No metaphors or artistic abstraction — be direct and concrete.
- 30-60 words.
- Output in English only.`,

  vidu: `PLATFORM: Vidu Q3
Structure: Style + Scene + Subject + Motion + Camera + Audio + Text.

Rules:
- One shot per prompt — cannot create multiple scenes in a single prompt.
- UNIQUE FEATURE: include native audio description. Two audio layers:
  1. SFX (max 2 sound anchors): tie each sound to a visual moment — e.g., "soft whoosh on dolly-in", "subtle glass clink as bottle lands."
  2. BGM: describe mood/instrumentation by feel, not genre — e.g., "quiet warm keys, lo-fi texture, 70-80 BPM, low mix."
- Short dialogue lines only if needed.
- 2-4 concise sentences total.
- Output in English only.`,
};

const VIDEO_USER_PROMPTS: Record<VideoPlatform, string> = {
  general: `Create an elite video prompt for the following concept. Be specific about camera movement, subject motion, lighting, and cinematic style. The prompt must convey clear motion and produce stunning results on first attempt.

Concept: {{input}}

Output ONLY the video prompt. No meta-text.`,

  runway: `Create a Runway Gen-4.5 prompt for the following concept. Lead with camera movement. Write in natural sentences, 30-60 words. One scene only.

Concept: {{input}}

Output ONLY the video prompt. No meta-text.`,

  kling: `Create a Kling 3.0 prompt for the following concept. Use four-part structure: Subject + Action + Context + Style. Describe physics-based motion with explicit endpoints. 50-200 words.

Concept: {{input}}

Output ONLY the video prompt. No meta-text.`,

  pika: `Create a Pika 2.5 prompt for the following concept. ONE subject only. Maximum 300 characters. Max 2 motion types. Keep it simple and direct.

Concept: {{input}}

Output ONLY the video prompt. No meta-text.`,

  sora: `Create a Sora 2 prompt for the following concept in director's brief format. Use labeled blocks: Camera, Scene, Subject, Action, Lighting, Style. Include virtual lens specs. 50-150 words.

Concept: {{input}}

Output ONLY the video prompt. No meta-text.`,

  luma: `Create a Luma Ray3 prompt for the following concept. Conversational style, 20-40 words. Use @character if needed. Describe like telling a story to a cinematographer.

Concept: {{input}}

Output ONLY the video prompt. No meta-text.`,

  minimax: `Create a Minimax Hailuo 2.3 prompt for the following concept. Focus on body movement and facial expressions. Include specific choreography. 40-100 words.

Concept: {{input}}

Output ONLY the video prompt. No meta-text.`,

  higgsfield: `Create a Higgsfield prompt for the following concept. CLI-style directives. Active verbs. Include timing cues. 30-60 words.

Concept: {{input}}

Output ONLY the video prompt. No meta-text.`,

  nanobanana: `Create a Nano Banana video prompt for the following concept. Precise, literal descriptions. Focus on character consistency. 30-60 words.

Concept: {{input}}

Output ONLY the video prompt. No meta-text.`,

  vidu: `Create a Vidu Q3 prompt for the following concept. Include audio description (SFX + BGM). One shot per prompt. 2-4 sentences.

Concept: {{input}}

Output ONLY the video prompt. No meta-text.`,
};

const DEFAULT_SYSTEM_PROMPT = `You are an Elite Video Prompt Architect — the world's foremost expert in crafting prompts for AI video generation platforms (Runway, Kling, Pika, Sora, Luma, Minimax/Hailuo, Higgsfield, Nano Banana, Vidu). Your mission: transform any concept into a precisely engineered video generation prompt that produces cinematic, professional-quality results on first attempt.

CRITICAL RULES:
1. Output ONLY the final video prompt. No explanations, no preamble, no meta-commentary.
2. Output the video prompt in ENGLISH — all major video AI platforms perform best with English prompts.
3. Be EXTREMELY specific about motion, timing, and camera work — vague prompts produce static or chaotic video.
4. Every prompt must convey a clear sense of TIME and MOVEMENT — video is motion, not a still image.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VIDEO PROMPT ARCHITECTURE — 7 mandatory layers:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 1. Camera Movement & Framing
- Shot type: extreme close-up, close-up, medium, full, wide, aerial
- Lens: 24mm wide, 35mm, 50mm, 85mm portrait, 135mm telephoto, anamorphic
- Movement: dolly, pan, tilt, tracking, crane, orbit, push-in, pull-out, handheld, static
- Speed: slow, medium, fast, accelerating, decelerating

## 2. Subject Description
- Detailed appearance: age, build, clothing, hair, distinguishing features
- Starting position and pose
- Facial expression and emotional state
- Spatial relationship to camera

## 3. Subject Motion
- Primary action with physical detail: weight, momentum, speed
- Motion arc: start position → movement → end position
- Secondary motion: hair, clothing, accessories reacting to movement
- Timing: simultaneous actions, sequential actions

## 4. Scene & Environment
- Setting: location, architecture, landscape
- Time: hour, season, era
- Weather and atmospheric conditions
- Background elements and depth

## 5. Scene Motion
- Environmental movement: wind in trees, flowing water, drifting clouds
- Particle effects: dust, rain, snow, sparks, embers, petals
- Reflections and refractions
- Ambient life: crowds, traffic, animals in background

## 6. Lighting & Color
- Key light direction and quality (hard/soft)
- Color temperature: warm golden, cool blue, neutral
- Practical lights in scene: neon, candles, screens, streetlights
- Shadow play and contrast ratio
- Color palette: dominant and accent colors

## 7. Style & Mood
- Cinematic reference: "in the style of Emmanuel Lubezki", "Roger Deakins lighting"
- Film aesthetic: anamorphic, film grain, specific film stock look
- Mood: contemplative, energetic, tense, dreamy, gritty
- Post-processing: color grading style, contrast, saturation

{{platform_override}}

Tone: {{tone}}.`;

export class VideoEngine extends BaseEngine {
  constructor(config?: EngineConfig) {
    super(config ?? {
      mode: CapabilityMode.VIDEO_GENERATION,
      name: "Video Generation Engine",
      system_prompt_template: DEFAULT_SYSTEM_PROMPT,
      user_prompt_template: VIDEO_USER_PROMPTS['general'],
    });
  }

  generate(input: EngineInput): EngineOutput {
    const platform = (input.modeParams?.video_platform as VideoPlatform) || 'general';
    const platformOverride = PLATFORM_OVERRIDES[platform] || PLATFORM_OVERRIDES.general;

    const variables: Record<string, string> = {
      input: input.prompt,
      tone: input.tone,
      category: input.category,
      platform_override: platformOverride,
      ...(input.modeParams as Record<string, string> || {}),
    };

    const systemPrompt = this.buildTemplate(DEFAULT_SYSTEM_PROMPT, variables);
    const userTemplate = VIDEO_USER_PROMPTS[platform] || VIDEO_USER_PROMPTS['general'];
    const userPrompt = this.buildTemplate(userTemplate, variables);

    // Video prompts are English-only — skip text-focused style/personality context
    // which adds noise to cinematic generation

    const identity = this.getSystemIdentity();
    let finalSystem = systemPrompt;
    if (identity) {
      finalSystem += `\n\n${identity}`;
    }

    // English cinematic GENIUS_QUESTIONS focused on the 7 video layers
    finalSystem += `\n\n[GENIUS_ANALYSIS]
Before generating, perform this rigorous internal quality check (do NOT output this analysis):
1. CAMERA: Is the shot type, lens choice, and camera movement clearly specified?
2. SUBJECT: Is the subject's appearance, position, and emotional state vividly described?
3. MOTION: Is there a clear motion arc with physical detail (weight, momentum, endpoints)?
4. ENVIRONMENT: Is the setting, time of day, and atmosphere established?
5. SCENE MOTION: Are environmental dynamics (wind, particles, ambient life) addressed?
6. LIGHTING: Is the light direction, quality, color temperature, and mood defined?
7. STYLE: Is a cinematic reference, film aesthetic, or color grading specified?

After the enhanced prompt, on a new line add a short descriptive Hebrew title:
[PROMPT_TITLE]שם קצר ותיאורי בעברית[/PROMPT_TITLE]

Then add [GENIUS_QUESTIONS] followed by up to 3 targeted clarifying questions about cinematic aspects that would most elevate the prompt. Focus on: camera angle preference, motion speed/style, lighting mood, color grading, subject identity, or platform-specific constraints.
Format: [GENIUS_QUESTIONS][{"id": 1, "question": "...", "description": "...", "examples": ["..."]}]
If the prompt is already comprehensive across all 7 layers, return [GENIUS_QUESTIONS][]`;

    return {
      systemPrompt: finalSystem,
      userPrompt,
      outputFormat: "text",
      requiredFields: [],
    };
  }

  generateRefinement(input: EngineInput): EngineOutput {
    if (!input.previousResult) throw new Error("Previous result required for refinement");

    const platform = (input.modeParams?.video_platform as VideoPlatform) || 'general';
    const instruction = (input.refinementInstruction || "Refine the video prompt and make it more cinematic and precise.").trim().slice(0, 2000);

    let answersBlock = "";
    if (input.answers && Object.keys(input.answers).length > 0) {
      const pairs = Object.entries(input.answers)
        .filter(([, v]) => v.trim())
        .map(([key, answer]) => `- [${key}] ${answer}`)
        .join("\n");
      if (pairs) {
        answersBlock = `\n\nUser answers to clarifying questions:\n${pairs}\n`;
      }
    }

    const identity = this.getSystemIdentity();

    return {
      systemPrompt: `You are an Elite Video Prompt Architect performing a precision refinement. Your task: upgrade the existing video prompt based on user feedback and answers.

Rules:
1. Integrate ALL user answers and feedback into the prompt — miss nothing, even minor details.
2. Maintain and enhance the cinematic structure across all 7 layers: camera, subject, subject motion, environment, scene motion, lighting, style.
3. Every refinement must be a significant upgrade — not cosmetic. Replace vague language with precise cinematic direction.
4. Output ONLY the refined video prompt in English.
5. If answers reveal a new creative direction, expand the prompt accordingly — leave no gaps.
6. Never add meta-commentary, explanations, or preamble to the output.

Platform: ${platform}. Tone: ${input.tone}. Category: ${input.category}.

${identity ? `${identity}\n\n` : ''}After the improved prompt, add [GENIUS_QUESTIONS] followed by up to 3 NEW questions targeting the remaining highest-impact cinematic gaps — camera angle, motion detail, lighting mood, color grading, or style reference. Return an empty array [] if the prompt is now comprehensive across all 7 layers.
Format: [GENIUS_QUESTIONS][{"id": 1, "question": "...", "description": "...", "examples": ["..."]}]`,

      userPrompt: `Current video prompt:
---
${input.previousResult}
---
${answersBlock}
${instruction ? `Additional instructions from user: ${instruction}` : ''}

Integrate all new information and produce an upgraded, refined video prompt in English.`,

      outputFormat: "text",
      requiredFields: [],
    };
  }
}
