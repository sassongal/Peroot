
import { BaseEngine } from "./base-engine";
import { EngineConfig, EngineInput, EngineOutput } from "./types";
import { CapabilityMode } from "../capability-mode";
import { VideoPlatform } from "../video-platforms";

const PLATFORM_OVERRIDES: Record<VideoPlatform, string> = {
  general: `OUTPUT STRUCTURE — weave ALL 7 mandatory layers into a single cohesive English prompt:
1. Camera Movement & Framing — shot type, lens, movement direction
2. Subject Description — appearance, position, expression
3. Subject Motion — physical movement with weight/momentum descriptions
4. Scene & Environment — setting, weather, ambient elements
5. Scene Motion — environmental movement (wind, particles, reflections)
6. Lighting & Color — direction, quality, temperature, palette
7. Style & Mood — cinematic reference, aesthetic, grain/texture

Produce ONE flowing English paragraph that weaves all layers seamlessly.`,

  runway: `PLATFORM: Runway Gen-4
Structure the prompt as: [Camera]: [Scene]. [Subject motion]. [Scene motion]. [Style].
Use precise camera vocabulary: dolly in/out, pan left/right, tilt up/down, tracking shot, crane up/down, handheld, static, orbit, push-in, pull-out.
Always specify camera movement first. Keep it concise — Runway works best with clear, structured prompts.
Output in English only.`,

  kling: `PLATFORM: Kling AI
Focus heavily on physical motion description — describe weight transfer, momentum, acceleration, deceleration.
Always include camera movement. Add explicit motion endpoints to prevent generation hangs (e.g., "arm rises from waist to above head").
Limit context to 3-5 core visual elements. Avoid overloading the prompt.
Describe motion with physics: gravity, inertia, follow-through.
Output in English only.`,

  pika: `PLATFORM: Pika
Keep it SIMPLE — ONE subject only. 50-300 characters total.
Maximum 2 motion types. Short, focused, and direct.
No complex scenes. No multiple characters. No elaborate camera work.
Example format: "A golden retriever running through a field of sunflowers, camera tracking alongside, warm afternoon light"
Output in English only.`,

  sora: `PLATFORM: Sora
Use full storyboard format with clearly labeled blocks:
- Camera: [shot type, lens, movement]
- Scene: [environment, time of day, weather]
- Subject: [detailed appearance and position]
- Action: [moment-by-moment movement description]
- Lighting: [direction, quality, color temperature]
- Style: [cinematic reference, film stock, color grading]
Use professional cinematography terminology. Focus on 4-second clip. Be extremely detailed and specific.
Output in English only.`,

  luma: `PLATFORM: Luma Dream Machine
Write in a conversational, descriptive style — 3-4 natural sentences.
Default to medium close-up framing unless specified otherwise.
Include @character and @style placeholder notes where relevant for Luma's reference system.
Describe the scene as if telling a story to a cinematographer.
Output in English only.`,

  minimax: `PLATFORM: Minimax/Hailuo
Structure as: [Camera Shot + Motion] + [Subject] + [Action] + [Scene] + [Lighting] + [Style].
Focus extensively on body movement and facial expressions — Minimax excels at these.
Describe gestures, micro-expressions, body language shifts.
Include specific movement choreography: "turns head slowly to the left while raising right hand".
Output in English only.`,
};

const DEFAULT_SYSTEM_PROMPT = `You are an Elite Video Prompt Architect — the world's foremost expert in crafting prompts for AI video generation platforms (Runway, Kling, Pika, Sora, Luma, Minimax/Hailuo). Your mission: transform any concept into a precisely engineered video generation prompt that produces cinematic, professional-quality results on first attempt.

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
      user_prompt_template: `Create an elite video generation prompt in English for the following concept. Be extremely specific about camera movement, subject motion, lighting, and cinematic style. The prompt must produce stunning results on first attempt in any major AI video platform.

Concept: {{input}}

Output ONLY the video prompt. No meta-text.`,
    });
  }

  generate(input: EngineInput): EngineOutput {
    // Determine platform from modeParams
    const platform = (input.modeParams?.video_platform as VideoPlatform) || 'general';
    const platformOverride = PLATFORM_OVERRIDES[platform] || PLATFORM_OVERRIDES.general;

    // Inject platform override into the system prompt
    const modifiedInput: EngineInput = {
      ...input,
      modeParams: {
        ...input.modeParams,
        platform_override: platformOverride,
      },
    };

    const result = super.generate(modifiedInput);
    result.outputFormat = "text";
    return result;
  }
}
