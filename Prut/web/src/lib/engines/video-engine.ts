import { BaseEngine, escapeTemplateVars, sanitizeModeParams } from "./base-engine";
import { EngineConfig, EngineInput, EngineOutput } from "./types";
import { CapabilityMode } from "../capability-mode";
import { VideoPlatform } from "../video-platforms";
import {
  getExamplesBlock,
  getMistakesBlock,
  getScoringBlock,
  getChainOfThoughtBlock,
  getRefinementExamplesBlock,
} from "./skills";
import { getConceptClassificationBlock } from "./skills/concept-classification";
import {
  extractVisualPreferences,
  buildVisualPreferencesBlock,
} from "./visual-preference-extractor";
import type { ContextBlock } from "@/lib/context/engine/types";
import { getPlatformOverrides } from "./platform-overrides";

// ── Platform-specific system prompt overrides ──
// Each platform has a unique prompting architecture based on official docs,
// community best practices, and empirical testing.

const PLATFORM_OVERRIDES: Record<VideoPlatform, string> = {
  general: `OUTPUT FORMAT: A single flowing cinematic paragraph in English. Weave ALL elements (camera movement, subject, action, environment, lighting, style, mood) into natural flowing prose. No numbered sections, no headers, no bullet points. Start directly with the shot description. 30-80 words.

CRITICAL — OUTPUT PURITY:
Your output MUST start directly with the prompt content. NEVER output:
- "Here's a video prompt:"
- "I've created/crafted a prompt:"
- "To generate this video, use:"
- "כתוב את הפרומפט הבא:"
- "הנה הפרומפט:"
- Any explanation, meta-commentary, or preamble
Start IMMEDIATELY with the cinematic description.
Your FIRST WORD must be a shot type or visual description in English. Example: "Close-up", "A", "Wide", "Aerial".

EXAMPLE:
Concept: "ציפור ממריאה מענף"
Output: A slow-motion close-up captures a vibrant blue kingfisher launching from a moss-covered branch, wings spreading wide as droplets of morning dew scatter into the golden sunrise light, the background of a misty forest lake blurs into a dreamy bokeh, filmed with a 200mm telephoto lens.`,

  runway: `PLATFORM: Runway Gen-4 / Gen-4.5
Runway Gen-4 interprets prompts as a single continuous shot (official guidance: one scene per generation — avoid cramming multiple unrelated scene changes into one prompt). It understands camera terminology and lighting physics deeply. Gen-4.5 raises motion quality, temporal consistency, and prompt adherence; still describe one coherent continuous shot unless the Runway UI explicitly offers a multi-clip / keyframe workflow you are targeting.

Four essential components:
1. Subject Motion - clearly describe movement of primary object/character
2. Camera Motion - tracking, panning, tilting, dolly, handheld, crane
3. Scene Motion - environmental elements (wind, water, crowds)
4. Style Descriptors - cinematic, vintage, handheld, live-action

Structure: [Shot type]: [camera movement] [subject + action]. [scene motion]. [style/mood].

Rules:
- Start with the Shot Type (close up, wide shot, aerial view) to ground composition.
- ALWAYS specify camera move: dolly, pan, tilt, tracking, crane, orbit, push-in, pull-out, handheld, static, whip pan, rack focus.
- Use specific verbs: "sprints", "glides", "leaps" — not generic descriptions.
- One action per sentence for clarity. Maintain logical flow.
- Write in natural language sentences — NOT comma-separated keywords.
- ONE scene per clip. Describe only what SHOULD happen — no negative prompting. Runway does NOT support negative prompts. Negative phrasing may produce opposite results.
- Use positive phrasing describing what you want, not what you don't want.
- Include one mood/atmosphere sentence at the end.
- Cinematic references when appropriate: "Kubrick one-point perspective", "Malick golden hour."
- Motion intensity: "gentle", "slight" for subtle; "sweeping", "explosive" for dramatic.
- Camera speed vocabulary: "slow dolly" vs "rapid whip pan" — choose deliberately for mood.
- Gen-4 Turbo: shorter prompts (20-30 words) for fast iteration. Full Gen-4: 30-60 words for cinematic quality.
- Design shot with clear beginning and continuation point for extending clips.
- Aspect ratios: 16:9 (cinematic), 9:16 (vertical), 1:1 (social).
- Duration: Official Gen-4 video outputs are 5 or 10 seconds per clip — design a single motion arc that fits 5s or 10s, not ~4s.
- Sweet spot: 30-60 words. Over 80 words degrades coherence.
- Genre-adapt: Action/Thriller = fast verbs, dynamic angles. Drama = slow movements, close-ups. Documentary = steady pans, natural light. Horror = creeping motion, low light.
- Output in English only.

Gen-4.5: Prefer one uninterrupted cinematic beat per generation; if the product exposes advanced controls (e.g. keyframes / multiple segments), follow that UI’s structure — do not invent multi-scene formats that contradict Gen-4’s “single scene” prompting basics.

CRITICAL — OUTPUT PURITY:
Your output MUST start directly with the prompt content. NEVER output:
- "Here's a video prompt for Runway:"
- "I've created/crafted a prompt:"
- "To generate this video, use:"
- "כתוב את הפרומפט הבא:"
- "הנה הפרומפט:"
- Any explanation, meta-commentary, or preamble
Start IMMEDIATELY with the cinematic description.
Your FIRST WORD must be a shot type or camera term. Example: "Close-up", "Wide", "Aerial", "A", "Tracking".

EXAMPLE:
Concept: "אישה הולכת ברחוב גשום"
Output: Wide shot. Slow tracking shot follows a woman in a red coat walking along a rain-soaked cobblestone street at dusk. Neon shop signs reflect in puddles as she passes. Wind catches her umbrella slightly. Shallow depth of field, anamorphic lens flare from distant headlights. Moody neo-noir atmosphere.`,

  kling: `PLATFORM: Kling VIDEO 3.0
Kling VIDEO 3.0 (per Kling’s official model guide) emphasizes: native audio with multilingual dialogue and accents, multi-shot narratives, element/subject reference for consistency, native in-frame text, and flexible duration up to ~15s. It excels at physics-aware motion and expressive performance. Resolution in standard product flows is commonly 720p/1080p — do not promise “native 4K” unless the user’s app tier or export explicitly shows 4K.

Six-element prompt structure:
(Camera Movement) + (Shot Type) + (Subject + Action) + (Environment + Lighting) + (Style + Mood) + (Physics Details)

Rules:
- Describe weight transfer, momentum, acceleration, deceleration for EVERY movement.
- Include explicit motion endpoints: "hand rises from waist to above head", "body shifts weight from left to right foot."
- Limit context to 3-5 core visual elements — overloading degrades output quality.
- Always specify camera movement ("tracking shot following from side") and motion endpoints ("then settles back into place") to prevent failures.
- Specify speed: "slow dolly", "rapid pan", "gentle tilt." Match movement to mood.
- Connect simultaneous actions with "while" or "as"; sequential with "then." Max 2 simultaneous movements per sentence.
- Temporal markers: "initially... then... finally" to guide motion over time.
- Motion paths: "arc from left to right", "spiral upward."
- Depth layers: Describe foreground, midground, background for complex scenes.
- Multi-shot storyboarding: Specify duration, shot size, perspective, narrative, and camera per shot.
- Complex camera: combine dolly + tilt, tracking + zoom freely. Also: dolly zoom (vertigo), telephoto compression, shallow DOF.
- Duration: 3s to 15s flexible. 5s for one action, 10s for action + reaction.
- Optional negative list (3-7 items max) if your pipeline supports it: "Negative: morphing, melting, distorted hands, extra limbs, blurry, flickering, jittery movement" — skip if the interface has no negative field.
- Resolution: Match the user’s selected resolution in-app (720p/1080p common per official docs). Aspect ratios: 16:9, 9:16, 1:1 typical.
- Camera language: Kling understands lens references (35mm, 85mm) and camera brands (ARRI, RED).
- Native audio: Kling 3.0 supports lip-synced dialogue in multiple languages. Add dialogue lines if relevant.
- Character consistency: Use highly distinctive visual descriptions for coherence across clips.
- Text rendering: Kling 3.0 can render legible signs, logos, and text in video.
- Image-to-video: Describe only MOTION, not the existing scene.
- Multi-character: Describe each motion separately, then their interaction.
- Sweet spot: 50-200 words. The model rewards detail.
- Output in English only.

Lip-sync dialogue example: include dialogue in format: Character says: "exact line" (delivery: warm, confident). Kling 3.0 supports multilingual lip-sync.

CRITICAL — OUTPUT PURITY:
Your output MUST start directly with the prompt content. NEVER output:
- "Here's a video prompt for Kling:"
- "I've created/crafted a prompt:"
- "To generate this video, use:"
- "כתוב את הפרומפט הבא:"
- "הנה הפרומפט:"
- Any explanation, meta-commentary, or preamble
Start IMMEDIATELY with the cinematic description.
Your FIRST WORD must be a camera movement or shot type. Example: "Slow", "Dolly", "Close-up", "A".

EXAMPLE:
Concept: "רקדנית בלט"
Output: Slow tracking shot, medium close-up, a professional ballerina in a flowing white tutu rises from plie to full releve en pointe, her weight shifting smoothly upward through her core as arms sweep from bras bas through first to fifth position overhead. Her back arches slightly as momentum carries her into a controlled single pirouette, spotted head whipping around, then she settles gracefully back to fifth. Shot on ARRI Alexa, 85mm lens, dramatic side lighting from a single spotlight creating long shadows across the polished wooden stage floor, cinematic film grain.
Negative: morphing, distorted hands, extra limbs, flickering, jittery movement.`,

  wan: `PLATFORM: Wan 2.6 (Alibaba)
Wan 2.6 is Alibaba's open-source video model with strong cinematic control. It responds best to a continuous prose structure: Subject + movement + scene + camera + lighting + atmosphere, followed by an artifact-specific Negative prompt line.

Rules:
- Lead with subject description including identity, clothing, and starting state.
- Describe movement with precise verbs and physical endpoints (not "walks" but "strides forward three steps then stops").
- Camera: specify move + angle + speed (e.g. "slow push-in from medium to close-up").
- Lighting: describe source, direction, quality, and color temperature.
- Atmosphere: one closing line naming the emotional/cinematic tone.
- Always end with a Negative prompt line targeting artifacts for your scene type: morphing, flickering, warping, temporal artifacts, distortion. Tailor to the subject (fabric: "dress warping"; faces: "face morphing"; vehicles: "bodywork judder").
- Do NOT use Midjourney-style tags or Stable Diffusion keyword lists.
- 50-150 words. Output in English only.

CRITICAL — OUTPUT PURITY:
Your output MUST start directly with the prompt content. NEVER add preamble, meta-commentary, or explanation.
Start IMMEDIATELY with the subject description.

EXAMPLE:
Concept: "נשר טס מעל קניון"
Output: A golden eagle with wings fully extended soaring over a vast red-rock canyon at dusk, riding thermal updrafts along the sheer cliff face. The camera follows from behind in a low tracking arc, revealing layers of striated sandstone glowing amber and burgundy in the fading light. Cinematic wide lens, high-contrast golden light from low sun angle, deep shadow pools in the canyon floor. Atmosphere: majestic solitude, vast geological scale. Negative prompt: morphing, warping, flickering, distortion, artifacts.`,

  veo: `PLATFORM: Google Veo 3 / Veo 3.1 (Gemini API)
Veo is Google DeepMind’s video model with strong synchronized audio generation (dialogue, SFX, ambience, music) when you describe sound explicitly — other platforms also offer audio, but Veo’s Gemini API workflow rewards splitting detailed visual + audio intent. Character consistency and physically plausible motion/materials are core strengths.

Seven primary elements for effective prompts:
1. Shot framing and motion - How to frame and how the camera moves
2. Style - The aesthetic (cartoon, claymation, film noir, photorealistic, etc.)
3. Lighting - Illumination quality, direction, color
4. Character descriptions - Specific visual details (not generic)
5. Location - Detailed environmental context
6. Action - Character movements and scene dynamics
7. Dialogue - Spoken lines with delivery style

Visual section:
- Write as a flowing cinematic paragraph weaving all 7 elements.
- Use evocative, sensory language emphasizing light, texture, and atmosphere.
- Character consistency: Describe characters with 5+ unique identifiers (hair color/style, eye color, outfit details, accessories, body type) for cross-scene consistency.
- Include physically accurate shadows, reflections, water, glass, and light refraction - Veo excels at physics.
- Be direct and concrete. No metaphors or artistic abstraction.
- Keep to one continuous scene - single-shot is strongest.
- The more detail you add, the more control over the final output.

Audio section (CRITICAL - ALWAYS include):
Use separate sentences to describe audio. Label clearly with "Audio:" to separate from visual.

"Audio:" structured as:
- Dialogue (if any): Exact lines in quotes with speaker and delivery style - '"I found it," she whispers nervously.'
- SFX: 2-3 specific sounds tied to visible actions - "knife hitting board produces rhythmic sharp taps", "the pot simmers with gentle bubbling."
- Ambient: One sentence describing the sonic environment - "quiet cafe murmur layered with rain on windows."
- Music: Instrument + tempo + mood - "solo cello, andante, melancholic."

IMPORTANT: If you don't explicitly define the background audio, Veo will guess — and sometimes hallucinates inappropriate sounds (common issue: "live studio audience" laughter). ALWAYS specify the audio you want.

Rules:
- ALWAYS include an Audio section — in Veo this is how you steer dialogue, SFX, and ambience; vague audio requests invite wrong ambience.
- Natural language only - no special syntax.
- Duration: Per Gemini API docs, \`durationSeconds\` is typically "4", "6", or "8"; 1080p and 4K often require 8s and have extra constraints (e.g. reference images). Add "Duration: Xs" using values your user can actually select — do not assume 5–15s unless the UI exposes it.
- Resolution: Veo 3.1 can output 720p, 1080p, or 4K depending on model tier (4K not available on Veo 3.1 Lite in API docs).
- Sweet spot: 50-100 words visual + 20-40 words audio.
- Output in English only.

Veo 3.1 (API): Adds richer audio, reference images (“ingredients”), first/last frame control, and scene extension — still keep each generation prompt focused; use extension features in-product for length. Audio discipline remains the fastest quality win.

CRITICAL — OUTPUT PURITY:
Your output MUST start directly with the prompt content. NEVER output:
- "Here's a video prompt for Veo:"
- "I've created/crafted a prompt:"
- "To generate this video, use:"
- "כתוב את הפרומפט הבא:"
- "הנה הפרומפט:"
- Any explanation, meta-commentary, or preamble
Start IMMEDIATELY with the cinematic description.
Your FIRST WORD must begin the visual description. Audio section comes AFTER visual. Example: "A", "Close-up", "Wide", "The".

EXAMPLE:
Concept: "שף מבשל"
Output: Close-up of a chef's weathered hands expertly julienning bright orange carrots on a worn wooden cutting board, the knife moving in rapid precise strokes. Steam rises from a copper pot simmering on the gas range behind. Warm golden kitchen lighting with practical overhead brass pendants casting soft shadows. Film grain, documentary style, shallow depth of field on the hands.

Audio:
Dialogue: None.
SFX: "knife hitting board produces rhythmic sharp taps", "pot simmering with gentle continuous bubbling."
Ambient: "busy restaurant kitchen murmur, distant clanging of stainless steel pots, occasional sizzle from a nearby pan."
Music: "acoustic guitar, gentle fingerpicking, warm and inviting."`,

  higgsfield: `PLATFORM: Higgsfield Cinema Studio 3.0
Higgsfield uses a three-layer prompt system. Most failures come from mixing layers. Each layer controls ONE visual job. Also hosts Kling 3.0, Sora 2, Veo 3.1 as available models.

THREE-LAYER SYSTEM (separate these, do NOT mix):
Layer 1 — IMAGE (static visual rules): Lighting, lens, framing. Creates a locked keyframe.
Layer 2 — IDENTITY (character appearance): Face, age, costume. Do NOT put in motion layer.
Layer 3 — MOTION (camera + subject movement): Cinematography commands only.

For a single-prompt output, combine as stacked directives:

Structure:
[Camera: framing + movement]
[Subject: identity + pose]
[Motion: choreography with timing cues]
[Style: aesthetic tags]

Rules:
- Short, direct sentences — never long descriptive paragraphs.
- Use active verbs: "darts through", "leaps across", "slowly pushes in", "whip-pans to reveal."
- Aesthetic tags force specific looks: "Shot on full-frame cinema camera", "anamorphic lens flare", "16mm film grain."
- Timing cues: "at the beginning", "halfway through", "in the final moment" or precise: "at 0s", "at 2s", "at 3.5s."
- Use cinematography commands, not descriptions of feelings.
- DO NOT put lighting/lens info in the motion layer (causes flicker).
- DO NOT put identity edits in the motion layer (breaks frame continuity).
- Camera compound moves: "crane up while pushing in", "orbit left while tilting down."
- Style presets: "cinematic", "documentary", "music video", "commercial", "anime."
- Character consistency: Describe face, body type, outfit in detail.
- Duration: Specify "Total: 4s" or use timing cues.
- Aspect ratios: 16:9, 9:16 supported.
- Sweet spot: 30-60 words. Tight, punchy, no fluff.
- Output in English only.

Compound timing cues are critical: "at 0s: subject enters frame → at 1.5s: turns to camera → at 3s: begins speaking". Always include Total duration.

CRITICAL — OUTPUT PURITY:
Your output MUST start directly with the prompt content. NEVER output:
- "Here's a video prompt for Higgsfield:"
- "I've created/crafted a prompt:"
- "To generate this video, use:"
- "כתוב את הפרומפט הבא:"
- "הנה הפרומפט:"
- Any explanation, meta-commentary, or preamble
Start IMMEDIATELY with the [Camera: ...] line.
Your FIRST WORD must be "[Camera:". Example: "[Camera: medium shot, slow push in]".

EXAMPLE:
Concept: "ריקוד ברחוב"
Output: [Camera: wide angle, handheld]
[Subject: Young man in white sneakers and black joggers, urban backdrop]
[Motion: Launches into fluid breakdance — drops to one knee at 0s, spins into windmill at 1s, freezes in baby freeze at 3s, snaps upright at 3.5s]
[Style: Shot on full-frame cinema camera, golden hour backlight, music video aesthetic]`,

  minimax: `PLATFORM: Minimax Hailuo 2.3
Hailuo 2.3 excels at human body movement and facial expressions. Best-in-class for choreography, gestures, and micro-expressions. Supports anime, illustration, and cinematic styles.

Formula: [Camera bracket commands] + Subject (appearance, action, emotion, mood) + Scene + Style.

CAMERA BRACKET SYNTAX (unique to Hailuo — use [ ] for camera control):
[Truck left/right] — lateral movement
[Pan left/right] — horizontal rotation
[Push in/Pull out] — move toward/away from subject
[Pedestal up/down] — vertical elevation
[Tilt up/down] — vertical rotation
[Zoom in/out] — focal length change
[Shake] — handheld effect
[Tracking shot] — follow subject
[Static shot] — no movement
Combine up to 3 movements: [Pan left, Pedestal up, Push in]

Rules:
- Focus EXTENSIVELY on body movement and facial expressions — this is Hailuo's superpower.
- Describe gestures in explicit choreographic detail: "turns head slowly 30 degrees to the left while raising right hand palm-up."
- Include micro-expressions: "corners of mouth curl into a half-smile", "eyes narrow slightly", "brow furrows then relaxes."
- Body language shifts: "shoulders drop as tension releases", "weight shifts forward onto toes."
- Sequential choreography: "first raises chin, then opens eyes, then slowly extends arm."
- Emotional transitions: "expression transitions from surprise to joy over 2 seconds."
- Hand and finger detail: describe finger positions explicitly for gestures.
- Group choreography: use "simultaneously" and "in response to" for cause-effect chains.
- Duration: 6s (default, supports 1080p) or 10s (768p only). 1080p is limited to 6-second clips.
- Subject reference: When using reference images, focus prompt on ACTION not appearance.
- Video-to-video: Describe only the CONTINUATION of motion.
- Sweet spot: 40-100 words.
- Output in English only.

Anime/illustration trigger: include "anime style" or "cel-shaded" in style description. For anime, emphasize dramatic expressions and speedlines. Micro-expression vocabulary: "pupils dilate", "lip quivers", "jaw tightens", "nostrils flare", "brow arches".

CRITICAL — OUTPUT PURITY:
Your output MUST start directly with the prompt content. NEVER output:
- "Here's a video prompt for Minimax:"
- "I've created/crafted a prompt:"
- "To generate this video, use:"
- "כתוב את הפרומפט הבא:"
- "הנה הפרומפט:"
- Any explanation, meta-commentary, or preamble
Start IMMEDIATELY with the cinematic description.
Your FIRST WORD must be a [Camera bracket command]. Example: "[Push in]", "[Tracking shot]", "[Pan left]".

EXAMPLE:
Concept: "אישה מקבלת בשורה טובה"
Output: [Push in, Static shot] A woman in her late 20s, dark wavy hair, wearing a casual cream sweater, sits at a desk holding her phone. Her eyes scan the screen — brow slightly furrowed. Then her eyebrows rise, corners of mouth twitch upward, eyes widen. She gasps softly, free hand rises to cover her mouth as a full smile breaks through. Shoulders lift with excitement, she bounces slightly in her chair. Soft natural window light from the left, warm tones, shallow depth of field.`,
};

// ── Platform-specific user prompts ──

const VIDEO_USER_PROMPTS: Record<VideoPlatform, string> = {
  general: `Generate the ACTUAL video prompt that will be DIRECTLY pasted into an AI video generator. Be specific about camera movement, subject motion, lighting, and cinematic style. The prompt must convey clear motion and produce stunning results on first attempt. This is NOT instructions for writing a prompt - this IS the prompt.

Concept: {{input}}

Output ONLY the ready-to-use video prompt. No meta-text, no instructions, no "create a prompt that...".`,

  runway: `Generate the ACTUAL Runway Gen-4 / Gen-4.5 prompt that will be DIRECTLY pasted into Runway. Lead with camera movement. Write in natural sentences, 30-60 words. One continuous scene only (5s or 10s clip — motion must fit that window). Positive phrasing only. Include a cinematic reference.

Concept: {{input}}

Output ONLY the ready-to-paste Runway prompt. No meta-text.`,

  kling: `Generate the ACTUAL Kling VIDEO 3.0 prompt that will be DIRECTLY pasted into Kling. Use the six-element structure: (Camera Movement) + (Shot Type) + (Subject + Action) + (Environment + Lighting) + (Style + Mood) + (Physics Details). Describe physics-based motion with weight, momentum, and endpoints. Add optional Negative: line (3-7 items) only if negatives are supported in the user's flow. Up to ~15s narrative; 50-200 words.

Concept: {{input}}

Output ONLY the ready-to-paste Kling prompt. No meta-text.`,

  wan: `Generate the ACTUAL Wan 2.6 prompt that will be DIRECTLY pasted into the Wan interface. Use the continuous prose structure: Subject + movement + scene + camera + lighting + atmosphere, then end with a Negative prompt line targeting artifact types specific to your scene. 50-150 words.

Concept: {{input}}

Output ONLY the ready-to-paste Wan prompt. No meta-text.`,

  veo: `Generate the ACTUAL Google Veo 3 / 3.1 prompt that will be DIRECTLY pasted into Veo (Gemini API / app). Write a visual paragraph covering all 7 elements (shot framing, style, lighting, character, location, action, dialogue) PLUS a separate Audio section with dialogue/SFX/ambient/music. ALWAYS include the Audio section — unspecified ambience drifts. Use Duration: 4s, 6s, or 8s to match API options (1080p/4K often tied to 8s). 50-100 words visual + 20-40 words audio. Precise, concrete, sensory.

Concept: {{input}}

Output ONLY the ready-to-paste Veo prompt. No meta-text.`,

  higgsfield: `Generate the ACTUAL Higgsfield prompt that will be DIRECTLY pasted into Higgsfield. Use directive command syntax - no prose, just instructions. Include timing cues (at 0s, at 1.5s, etc.), active verbs, and aesthetic tags. 30-60 words.

Concept: {{input}}

Output ONLY the ready-to-paste Higgsfield prompt. No meta-text.`,

  minimax: `Generate the ACTUAL Minimax Hailuo 2.3 prompt that will be DIRECTLY pasted into Minimax. Use [bracket syntax] for camera movements (e.g., [Push in], [Tracking shot], [Pan left]). Focus on body movement and facial expressions with specific choreographic detail. Describe gestures, micro-expressions, and body language shifts. 40-100 words.

Concept: {{input}}

Output ONLY the ready-to-paste Minimax prompt. No meta-text.`,
};

// ── Main system prompt ──

const DEFAULT_SYSTEM_PROMPT = `You are an Elite Video Prompt Architect - the world's foremost expert in crafting prompts for AI video generation platforms (Runway, Kling, Veo, Wan, Higgsfield, Minimax/Hailuo). Your mission: transform any concept into a precisely engineered video generation prompt that produces cinematic, professional-quality results on first attempt.

CRITICAL RULES:
1. Output ONLY the final video prompt - the ACTUAL prompt that will be DIRECTLY copy-pasted into the video AI platform. NEVER output instructions for writing a prompt, meta-commentary, or "here is your prompt". The output IS the prompt.
2. Output the video prompt in ENGLISH - all major video AI platforms perform best with English prompts.
3. Be EXTREMELY specific about motion, timing, and camera work - vague prompts produce static or chaotic video.
4. Every prompt must convey a clear sense of TIME and MOVEMENT - video is motion, not a still image.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VIDEO PROMPT ARCHITECTURE - 7 mandatory layers:
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

{{aspect_ratio_hint}}
Tone: {{tone}}.`;

/** Repo baseline for `general` when no DB row exists — admin drift detection vs `prompt_engines`. */
export function getShippedVideoEngineBaseline(): {
  system_prompt_template: string;
  user_prompt_template: string;
} {
  return {
    system_prompt_template: DEFAULT_SYSTEM_PROMPT,
    user_prompt_template: VIDEO_USER_PROMPTS.general,
  };
}

export class VideoEngine extends BaseEngine {
  constructor(config?: EngineConfig) {
    super(
      config ?? {
        mode: CapabilityMode.VIDEO_GENERATION,
        name: "Video Generation Engine",
        system_prompt_template: DEFAULT_SYSTEM_PROMPT,
        user_prompt_template: VIDEO_USER_PROMPTS["general"],
      },
    );
  }

  generate(input: EngineInput): EngineOutput {
    const platform = (input.modeParams?.video_platform as VideoPlatform) || "general";
    const platformBlock = PLATFORM_OVERRIDES[platform] || PLATFORM_OVERRIDES.general;

    const variables: Record<string, string> = {
      input: escapeTemplateVars(input.prompt),
      tone: escapeTemplateVars(input.tone),
      category: escapeTemplateVars(input.category),
      platform_override: platformBlock,
      ...sanitizeModeParams(input.modeParams),
    };

    if (input.modeParams?.aspect_ratio) {
      // For video, aspect ratio is ALWAYS a UI/API parameter — never embed it as text in the prompt.
      // Guide composition framing only: the model should shape the shot accordingly.
      const ratio = input.modeParams.aspect_ratio;
      const compositionHint =
        ratio === "16:9"
          ? "wide cinematic panoramic composition"
          : ratio === "9:16"
            ? "tall vertical portrait composition"
            : ratio === "1:1"
              ? "square balanced composition"
              : `composition suited for a ${ratio} frame`;
      variables.aspect_ratio_hint = `\nIMPORTANT: The user has selected aspect ratio ${ratio}. Design the shot for ${compositionHint} — do NOT add aspect ratio text or parameters to the prompt; aspect ratio is set in the platform UI/API.`;
    } else {
      variables.aspect_ratio_hint = "";
    }

    const dbOverrides = getPlatformOverrides(
      this.config.default_params as Record<string, unknown> | undefined,
    );
    const po = dbOverrides?.[platform];

    const systemShell = po?.system_template ?? this.config.system_prompt_template;
    const systemPrompt = this.buildTemplate(systemShell, variables);

    const userShell =
      po?.user_template ??
      (platform === "general"
        ? this.config.user_prompt_template
        : VIDEO_USER_PROMPTS[platform] || VIDEO_USER_PROMPTS["general"]);
    const userPrompt = this.buildTemplate(userShell, variables);

    // Text-mode userPersonality stays skipped (noise for cinematic prompts),
    // but we DO extract visual/cinematic preferences from video prompt history.

    const identity = this.getSystemIdentity();
    let finalSystem = systemPrompt;
    if (identity) {
      finalSystem += `\n\n${identity}`;
    }

    // Extract and inject visual preferences from user's prompt history
    if (input.userHistory && input.userHistory.length >= 2) {
      const visualPrefs = extractVisualPreferences(input.userHistory);
      const prefsBlock = buildVisualPreferencesBlock(visualPrefs);
      if (prefsBlock) {
        finalSystem += prefsBlock;
      }
    }

    // Context attachments as cinematic reference material
    if (input.context && input.context.length > 0) {
      finalSystem += `\n\n[CINEMATIC_REFERENCE_MATERIAL]
המשתמש צירף חומר מקור — השתמש בו כ-**השראה קולנועית ומגבלות ויזואליות** לפרומפט הווידאו:
- תמונות מצורפות: נתח קומפוזיציה, תאורה, פלטת צבעים, ואווירה — ושלב בפרומפט כ-reference visuals.
- סטוריבורד/מסמך: חלץ תיאור סצנות, תנועת מצלמה, ואלמנטים נרטיביים.
- URLים: חלץ סגנון ויזואלי, look & feel, ו-cinematic language מהתוכן.
- שלב את הפרטים ישירות — אל תכתוב "בהתבסס על הקובץ".

`;
      for (const attachment of input.context) {
        const block = attachment as unknown as ContextBlock;
        const title = block.display?.title || attachment.name || "attachment";
        const text =
          block.display?.rawText ||
          block.display?.summary ||
          attachment.content ||
          attachment.description ||
          "";
        if (attachment.type === "image") {
          finalSystem += `━━━ 🖼️ Visual ref: "${title}" ━━━\n${text.slice(0, 1200)}\n\n`;
        } else if (attachment.type === "url") {
          finalSystem += `━━━ 🌐 Source: ${attachment.url || title} ━━━\n${text.slice(0, 1000)}\n\n`;
        } else {
          finalSystem += `━━━ 📄 Doc: "${title}" ━━━\n${text.slice(0, 1200)}\n\n`;
        }
      }
    }

    // Inject concept classification (LLM-level semantic understanding)
    finalSystem += getConceptClassificationBlock("video");

    // Inject few-shot examples from skill files (smart selection based on user concept)
    const examplesBlock = getExamplesBlock("video", platform, input.prompt, 3);
    if (examplesBlock) {
      finalSystem += examplesBlock;
    }

    // Inject common mistakes to avoid
    const mistakesBlock = getMistakesBlock("video", platform);
    if (mistakesBlock) {
      finalSystem += mistakesBlock;
    }

    // Inject platform-specific scoring criteria
    const scoringBlock = getScoringBlock("video", platform);

    const cotBlock = getChainOfThoughtBlock("video", platform, input.prompt);
    if (cotBlock) finalSystem += cotBlock;
    const refineExamplesBlock = getRefinementExamplesBlock("video", platform, 1);
    if (refineExamplesBlock) finalSystem += refineExamplesBlock;

    const hasContext = !!(input.context && input.context.length > 0);
    const contextQualityRule = hasContext
      ? "\nCONTEXT INTEGRATION (mandatory): Reference material is attached — incorporate palette, mood, composition, and cinematic style from references. Ignoring attachments is a FAILURE."
      : "";
    const contextQuestionHint = hasContext
      ? "\nCONTEXT-AWARE: reference material is attached — ask about INTENT (exact replication? mood inspiration? style guide?) not about the file contents."
      : "";

    // English cinematic GENIUS_QUESTIONS focused on the 7 video layers + platform-specific gate
    finalSystem += `\n\n<internal_quality_check hidden="true">
Silently verify before generating (NEVER include any of this in output):
1. CAMERA: Shot type, lens feel, and primary camera move — one dominant move, not five.
2. SUBJECT: Appearance, blocking, and intent (what they do in-frame).
3. MOTION: Physical arc with endpoints (weight, momentum, speed words).
4. ENVIRONMENT: Location, time, weather/atmosphere — enough to ground the clip.
5. SCENE MOTION: Environmental dynamics (wind, water, crowd, particles) if relevant.
6. LIGHTING: Direction, quality, color temperature, and mood.
7. STYLE: Film reference or grading vocabulary when it tightens the look.
8. ANTI-PATTERNS: No keyword soup; no contradictory moves; English output only.${contextQualityRule}${scoringBlock ? `\nPLATFORM-SPECIFIC QUALITY GATE:${scoringBlock}` : ""}
</internal_quality_check>

After the enhanced prompt, on a new line add a short descriptive Hebrew title:
[PROMPT_TITLE]שם קצר ותיאורי בעברית[/PROMPT_TITLE]

Then add [GENIUS_QUESTIONS] followed by up to 3 targeted clarifying questions about cinematic aspects that would most elevate the prompt. Focus on: camera angle preference, motion speed/style, lighting mood, color grading, subject identity, or platform-specific constraints.${contextQuestionHint}
Format: [GENIUS_QUESTIONS][{"id": 1, "question": "...", "description": "...", "examples": ["..."]}]
If the prompt is already comprehensive across all 7 layers, return [GENIUS_QUESTIONS][]

CRITICAL: Never put the literal substring [GENIUS_QUESTIONS] inside the English video prompt body. Title and follow-up blocks must appear only on new lines after the full prompt.`;

    // Append context summary to user prompt
    let finalUserPrompt = userPrompt;
    if (hasContext) {
      const summary = input
        .context!.map((a) => {
          const block = a as unknown as ContextBlock;
          const title = block.display?.title || a.name || "attachment";
          const text =
            block.display?.summary || block.display?.rawText || a.content || a.description || "";
          if (a.type === "image") return `[Visual ref: ${title}] ${text.slice(0, 600)}`;
          return `[${title}] ${text.slice(0, 600)}`;
        })
        .join("\n");
      finalUserPrompt += `\n\n[חומר ויזואלי מצורף — שלב אלמנטים קולנועיים מהחומר בפרומפט]\n${summary}`;
    }

    return {
      systemPrompt: finalSystem,
      userPrompt: finalUserPrompt,
      outputFormat: "text",
      requiredFields: [],
    };
  }

  generateRefinement(input: EngineInput): EngineOutput {
    if (!input.previousResult) throw new Error("Previous result required for refinement");

    const iteration = input.iteration || 1;
    const platform = (input.modeParams?.video_platform as VideoPlatform) || "general";
    const instruction = (
      input.refinementInstruction ||
      "Refine the video prompt and make it more cinematic and precise."
    )
      .trim()
      .slice(0, 2000);

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

    const platformRefinementGuidance: Record<string, string> = {
      runway:
        "\nPlatform-specific: Check camera movement is the FIRST element. Verify 30-80 word count. Ensure single continuous shot design (or valid multi-shot Scene N format). Verify Audio block has all 4 sub-keys. Add motion intensity vocabulary if missing.",
      kling:
        "\nPlatform-specific: Verify physics-based motion detail (weight, momentum, endpoints). Check 4-part structure. Confirm duration and aspect ratio. Add negative prompt if missing.",
      wan: "\nPlatform-specific: Verify prose structure (subject + movement + scene + camera + lighting + atmosphere). Confirm Negative prompt line is artifact-specific to the scene type. Check no keyword-list syntax.",
      veo: "\nPlatform-specific: Verify Audio section exists with all 4 elements (dialogue/SFX/ambient/music) — missing audio causes hallucinated sounds. Check character identifiers for consistency. Verify all 7 elements covered. Confirm duration specified.",
      higgsfield:
        "\nPlatform-specific: Verify directive command syntax (not prose). Check timing cues present. Confirm style tags appended. Verify active verbs used.",
      minimax:
        "\nPlatform-specific: Verify body movement choreography detail. Check micro-expressions present. Confirm sequential movement order. Verify camera movement complexity.",
      general: "",
    };

    const platformGeniusQuestions: Record<string, string> = {
      runway:
        "Focus questions on: camera movement style/speed, motion intensity, cinematic reference, audio mood (music genre, SFX elements), and whether single-scene or multi-shot format is intended.",
      kling:
        "Focus questions on: physics detail for movements (weight/momentum), preferred duration (5s vs 10s), what to include in negative prompt, and specific camera/lens specs (ARRI, RED, 35mm, 85mm).",
      wan: "Focus questions on: camera move type and speed, lighting source and color temperature, atmosphere/tone of the scene, and which artifact types should be called out in the negative prompt.",
      veo: "Focus questions on: audio mood and music feel, whether dialogue is needed and its delivery style, specific SFX tied to actions, ambient sound environment, and character consistency identifiers across scenes.",
      higgsfield:
        "Focus questions on: timing cue precision (exact timestamps), preferred style preset (cinematic/documentary/anime), compound camera move preferences, and character likeness detail.",
      minimax:
        "Focus questions on: choreography detail for body movements, micro-expression needs for emotional beats, emotion transition arcs, and group choreography dynamics.",
      general:
        "Focus questions on: camera angle preference, motion speed/style, lighting mood, color grading, subject identity, or platform-specific constraints.",
    };

    return {
      systemPrompt: `You are an Elite Video Prompt Architect performing a precision refinement. Your task: upgrade the existing video prompt based on user feedback and answers.

Rules:
1. Integrate ALL user answers and feedback into the prompt - miss nothing, even minor details.
2. Maintain and enhance the cinematic structure across all 7 layers: camera, subject, subject motion, environment, scene motion, lighting, style.
3. Every refinement must be a significant upgrade - not cosmetic. Replace vague language with precise cinematic direction.
4. Output ONLY the refined video prompt in English.
5. If answers reveal a new creative direction, expand the prompt accordingly - leave no gaps.
6. Never add meta-commentary, explanations, or preamble to the output.
${iteration >= 3 ? `\nThis is refinement round #${iteration}. The prompt is already at a high level - make surgical cinematic precision improvements only.` : iteration === 2 ? "\nThis is the second refinement round - focus on remaining cinematic gaps, not what is already strong." : ""}${platformRefinementGuidance[platform] || ""}

Platform: ${platform}. Tone: ${input.tone}. Category: ${input.category}.

${identity ? `${identity}\n\n` : ""}After the improved prompt, on a new line add:
[PROMPT_TITLE]שם קצר ותיאורי בעברית[/PROMPT_TITLE]

Then add [GENIUS_QUESTIONS] followed by up to 3 NEW questions targeting the remaining highest-impact gaps. ${platformGeniusQuestions[platform] || platformGeniusQuestions.general} Return an empty array [] if the prompt is now comprehensive across all 7 layers.
Format: [GENIUS_QUESTIONS][{"id": 1, "question": "...", "description": "...", "examples": ["..."]}]`,

      userPrompt: `Current video prompt:
---
${input.previousResult}
---
${answersBlock}
${instruction ? `Additional instructions from user: ${instruction}` : ""}

Integrate all new information and produce an upgraded, refined video prompt in English.`,

      outputFormat: "text",
      requiredFields: [],
    };
  }
}
