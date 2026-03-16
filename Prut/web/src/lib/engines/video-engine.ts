
import { BaseEngine } from "./base-engine";
import { EngineConfig, EngineInput, EngineOutput } from "./types";
import { CapabilityMode } from "../capability-mode";
import { VideoPlatform } from "../video-platforms";

// ── Platform-specific system prompt overrides ──
// Each platform has a unique prompting architecture based on official docs,
// community best practices, and empirical testing.

const PLATFORM_OVERRIDES: Record<VideoPlatform, string> = {
  general: `OUTPUT STRUCTURE — weave ALL 7 mandatory layers into one flowing English paragraph.
The paragraph must read as a seamless cinematic description, not a list. Transition naturally between camera, subject, motion, environment, lighting, and style. Every sentence should serve the motion narrative. 30-80 words.`,

  runway: `PLATFORM: Runway Gen-4
Runway's model interprets prompts as a single continuous shot. The camera directive is the #1 priority — it MUST be the first element.

Structure: [camera movement]: [establishing scene]. [subject + action]. [style/mood].

Rules:
- ALWAYS lead with the camera move using precise vocabulary: dolly, pan, tilt, tracking, crane, orbit, push-in, pull-out, handheld, static, whip pan, rack focus.
- For static shots: explicitly state "The camera holds still on..."
- Write in natural language sentences — NOT comma-separated keywords.
- ONE scene per clip. Describe only what SHOULD happen; no negative prompting — Runway does NOT support negative prompts.
- Include exactly one mood/atmosphere sentence at the end.
- Mention specific cinematic references when appropriate (e.g., "Kubrick one-point perspective", "Malick golden hour").
- Motion intensity control: For subtle movement use "gentle", "barely", "slight". For dramatic: "sweeping", "explosive", "rapid".
- Camera speed vocabulary matters for mood: "slow dolly" vs "rapid whip pan" — choose deliberately.
- Gen-4 Turbo distinction: For fast iteration use shorter prompts (20-30 words). For cinematic quality, use full 30-60 words.
- Design the shot to have a clear beginning and potential continuation point — this enables extending the clip.
- Aspect ratios: 16:9 (cinematic), 9:16 (vertical/mobile), 1:1 (social).
- Duration: Gen-4 generates ~4-second clips — design all action to fit within this window.
- Sweet spot: 30-60 words. Over 80 words degrades coherence.
- Output in English only.`,

  kling: `PLATFORM: Kling 2.0
Kling excels at physics-based motion. Its model understands weight, momentum, and realistic body dynamics better than any competitor. Use this to your advantage.

Four-part structure: Subject (specific identity) + Action (physics-detailed movement) + Context (3-5 environment elements) + Style (camera + lighting + mood).

Rules:
- Describe weight transfer, momentum, acceleration, deceleration for EVERY movement.
- Include explicit motion endpoints: "hand rises from waist to above head", "body shifts weight from left to right foot."
- Limit context to 3-5 core visual elements — overloading degrades output quality.
- Connect simultaneous actions with "while" or "as"; sequential actions with "then." Maximum 2 simultaneous movements per sentence.
- Multi-shot prompts supported: label as "Shot 1 (6s): ... Shot 2 (9s): ..."
- Kling handles complex camera movements well — combine dolly + tilt freely.
- Professional mode: For cinematic quality, specify "Professional mode." in the prompt.
- Duration control: For 5s clips — one continuous action. For 10s clips — can include action + reaction or two sequential movements.
- Negative prompt support: Kling supports negative prompts — add "Negative: [what to avoid]" at the end.
- Aspect ratios: 16:9, 9:16, 1:1 supported.
- Camera language: Kling understands specific lens references (35mm, 85mm) and camera brands (ARRI, RED).
- Image-to-video: When extending a still image, describe only the MOTION that should happen, not the scene that already exists.
- Multi-character scenes: When multiple characters interact, describe each character's motion separately then their interaction.
- Sweet spot: 50-200 words. The model rewards detail.
- Output in English only.`,

  sora: `PLATFORM: Sora
Sora produces the most cinematic results when given structured director's-brief format with labeled blocks. Think of it as writing a shot list.

Use clearly labeled blocks in this order:
Camera: [shot type, lens spec, movement — e.g., "35mm virtual lens, slow dolly-in"]
Scene: [environment, time of day, weather, atmosphere — 1-2 sentences]
Subject: [detailed appearance, position, expression, wardrobe — 1-2 sentences]
Action: [moment-by-moment movement description with timing — 1-2 sentences]
Lighting: [direction, quality, color temperature, practicals — 1 sentence]
Style: [cinematic reference, film stock, color grading, mood — 1 sentence]

Rules:
- Use professional cinematography terminology throughout.
- ALWAYS include virtual lens specs: "35mm virtual lens", "85mm portrait lens", "IMAX wide-angle", "anamorphic 2.39:1".
- Reference specific DoPs or directors when it helps: "Deakins-style backlight", "Chivo single-take tracking."
- Describe dialogue separately if needed.
- Aspect ratio: 16:9 (default cinematic), 9:16 (portrait), 1:1 (square) — specify in Camera block.
- Resolution: 1080p standard, 4K for maximum quality.
- Duration: 5-20 seconds supported — specify "Duration: Xs" in prompt.
- Storyboard mode: For multi-shot sequences, label shots as "Shot 1:", "Shot 2:" with transitions.
- Sora understands real-world physics — describe interactions with gravity, fluids, fabric physics for best results.
- Text rendering: Sora can render text in scenes — e.g., "A neon sign reading 'OPEN'".
- Transition guidance: Use "Match cut to...", "Dissolve to...", "Hard cut to..." between shots.
- More descriptive = more controlled output. Sora rewards specificity.
- Sweet spot: 50-150 words.
- Output in English only.`,

  veo: `PLATFORM: Google Veo 3
Veo 3 is Google DeepMind's video model — the ONLY platform with native audio generation (dialogue, SFX, ambient sound, music). Character consistency is a core strength.

Structure: Visual description (camera + subject + scene) followed by an Audio block.

Visual section:
- Write as a flowing cinematic paragraph (subject, camera, environment, lighting, style).
- Character consistency: Describe characters with 5+ unique identifiers (hair color, eye color, outfit, accessories, body type) for cross-scene consistency.
- Include physically accurate shadows and lighting — Veo respects physics.
- Veo excels at physically accurate reflections, water, glass, and light refraction — leverage this.
- Be direct and concrete. No metaphors or artistic abstraction.
- Keep to one continuous scene — Veo handles single-shot better than multi-cut.

Audio section (UNIQUE to Veo — always include):
"Audio:" structured as:
- Dialogue (if any): Exact lines in quotes with speaker and delivery style — e.g., '"I found it," she whispers nervously.'
- SFX: 2-3 specific sounds tied to visible actions (format: "[action] -> [sound]") — e.g., "footstep on cobblestone -> soft wet thud", "door opening -> slow creak."
- Ambient: One sentence describing the sonic environment — e.g., "quiet cafe murmur layered with rain on windows."
- Music: Instrument + tempo + mood — e.g., "solo cello, andante, melancholic."

Rules:
- ALWAYS include an Audio section — this is Veo's differentiator.
- Natural language only — no special syntax.
- Duration: For specific timing, add "Duration: Xs" (5-15 seconds supported).
- Resolution: Veo generates up to 4K resolution.
- Sweet spot: 50-100 words visual + 20-40 words audio.
- Output in English only.`,

  higgsfield: `PLATFORM: Higgsfield
Higgsfield uses a directive command syntax — think movie set instructions, not prose descriptions. Remove all filler words. Each line is an instruction.

Structure: Stack directives in layers:
1. Camera: framing + movement directives
2. Subject: identity + pose
3. Motion: choreography with timing cues
4. Style: aesthetic tags

Rules:
- Use active verbs: "darts through", "leaps across", "slowly pushes in", "whip-pans to reveal."
- Aesthetic tags force specific looks: "Shot on full-frame cinema camera", "anamorphic lens flare", "16mm film grain."
- Timing cues control when actions start/stop: "fade in at 0s", "peak action at 2s", "resolve at 3.5s", "fade out at 4s."
- Layered approach — each line is a directive, not a description.
- Can reference real-person likenesses with consistent rendering.
- Duration control: Specify total duration — "Total: 4s" — or use timing cues to imply it.
- Aspect ratios: 16:9, 9:16 supported.
- Style presets: Append style tags: "cinematic", "documentary", "music video", "commercial", "anime."
- Character consistency: Higgsfield excels at human likenesses — describe face, body type, and outfit in detail for consistency.
- Camera compound moves: Supports compound camera moves — "crane up while pushing in", "orbit left while tilting down."
- Sweet spot: 30-60 words. Tight, punchy, no fluff.
- Output in English only.`,

  minimax: `PLATFORM: Minimax Hailuo
Minimax/Hailuo excels at human body movement and facial expressions. Its motion model is best-in-class for choreography, gestures, and micro-expressions.

Formula: [Camera Shot + Motion] + [Subject + Detailed Description] + [Action Choreography] + [Scene + Description] + [Lighting] + [Style/Mood].

Rules:
- Focus EXTENSIVELY on body movement and facial expressions — this is Minimax's superpower.
- Describe gestures in explicit choreographic detail: "turns head slowly 30 degrees to the left while raising right hand palm-up."
- Include micro-expressions: "corners of mouth curl into a half-smile", "eyes narrow slightly", "brow furrows then relaxes."
- Describe body language shifts: "shoulders drop as tension releases", "weight shifts forward onto toes."
- Sequential choreography: "first raises chin, then opens eyes, then slowly extends arm."
- Include specific camera movements — Minimax handles complex tracking shots well.
- Subject reference: Minimax supports subject reference images — when used, focus the prompt on ACTION rather than appearance.
- Duration options: 5s for tight actions, 10s for full sequences.
- Video-to-video: For extending existing video, describe only the CONTINUATION of motion.
- Emotional transitions: Describe emotion shifts — "expression transitions from surprise to joy over 2 seconds."
- Hand and finger detail: Minimax handles hand movements well — describe finger positions explicitly for gestures.
- Group choreography: For multiple subjects, use "simultaneously" and "in response to" to create cause-effect motion chains.
- Camera awareness: Minimax handles complex camera work — combine tracking + zoom + focus pull.
- Sweet spot: 40-100 words.
- Output in English only.`,
};

// ── Platform-specific user prompts ──

const VIDEO_USER_PROMPTS: Record<VideoPlatform, string> = {
  general: `Generate the ACTUAL video prompt that will be DIRECTLY pasted into an AI video generator. Be specific about camera movement, subject motion, lighting, and cinematic style. The prompt must convey clear motion and produce stunning results on first attempt. This is NOT instructions for writing a prompt — this IS the prompt.

Concept: {{input}}

Output ONLY the ready-to-use video prompt. No meta-text, no instructions, no "create a prompt that...".`,

  runway: `Generate the ACTUAL Runway Gen-4 prompt that will be DIRECTLY pasted into Runway. Lead with camera movement. Write in natural sentences, 30-60 words. One scene only. Include a cinematic reference.

Concept: {{input}}

Output ONLY the ready-to-paste Runway prompt. No meta-text.`,

  kling: `Generate the ACTUAL Kling 2.0 prompt that will be DIRECTLY pasted into Kling. Use the four-part structure: Subject + Action + Context + Style. Describe physics-based motion with explicit weight and momentum. Include movement endpoints. 50-200 words.

Concept: {{input}}

Output ONLY the ready-to-paste Kling prompt. No meta-text.`,

  sora: `Generate the ACTUAL Sora prompt that will be DIRECTLY pasted into Sora in director's brief format. Use labeled blocks: Camera (with lens spec), Scene, Subject, Action, Lighting, Style. Include virtual lens specs. 50-150 words.

Concept: {{input}}

Output ONLY the ready-to-paste Sora prompt. No meta-text.`,

  veo: `Generate the ACTUAL Google Veo 3 prompt that will be DIRECTLY pasted into Veo. Write a visual paragraph (camera, subject, scene) PLUS a separate Audio section with dialogue/SFX/ambient/music. 50-100 words visual + 20-40 words audio. Be precise, concrete, no metaphors.

Concept: {{input}}

Output ONLY the ready-to-paste Veo prompt. No meta-text.`,

  higgsfield: `Generate the ACTUAL Higgsfield prompt that will be DIRECTLY pasted into Higgsfield. Use directive command syntax — no prose, just instructions. Include timing cues (at 0s, at 1.5s, etc.), active verbs, and aesthetic tags. 30-60 words.

Concept: {{input}}

Output ONLY the ready-to-paste Higgsfield prompt. No meta-text.`,

  minimax: `Generate the ACTUAL Minimax Hailuo prompt that will be DIRECTLY pasted into Minimax. Focus on body movement and facial expressions with specific choreographic detail. Describe gestures, micro-expressions, and body language shifts. 40-100 words.

Concept: {{input}}

Output ONLY the ready-to-paste Minimax prompt. No meta-text.`,
};

// ── Main system prompt ──

const DEFAULT_SYSTEM_PROMPT = `You are an Elite Video Prompt Architect — the world's foremost expert in crafting prompts for AI video generation platforms (Runway, Kling, Sora, Veo, Higgsfield, Minimax/Hailuo). Your mission: transform any concept into a precisely engineered video generation prompt that produces cinematic, professional-quality results on first attempt.

CRITICAL RULES:
1. Output ONLY the final video prompt — the ACTUAL prompt that will be DIRECTLY copy-pasted into the video AI platform. NEVER output instructions for writing a prompt, meta-commentary, or "here is your prompt". The output IS the prompt.
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

    const iteration = input.iteration || 1;
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

    const platformRefinementGuidance: Record<string, string> = {
      runway: '\nPlatform-specific: Check camera movement is the FIRST element. Verify 30-60 word count. Ensure single continuous shot design. Add motion intensity vocabulary if missing.',
      kling: '\nPlatform-specific: Verify physics-based motion detail (weight, momentum, endpoints). Check 4-part structure. Confirm duration and aspect ratio. Add negative prompt if missing.',
      sora: '\nPlatform-specific: Verify labeled blocks format (Camera, Scene, Subject, Action, Lighting, Style). Check lens specs present. Confirm duration and aspect ratio specified.',
      veo: '\nPlatform-specific: Verify Audio section exists with all 4 elements (dialogue/SFX/ambient/music). Check character identifiers for consistency. Confirm duration specified.',
      higgsfield: '\nPlatform-specific: Verify directive command syntax (not prose). Check timing cues present. Confirm style tags appended. Verify active verbs used.',
      minimax: '\nPlatform-specific: Verify body movement choreography detail. Check micro-expressions present. Confirm sequential movement order. Verify camera movement complexity.',
      general: '',
    };

    const platformGeniusQuestions: Record<string, string> = {
      runway: 'Focus questions on: camera movement style/speed, motion intensity preference, cinematic reference inspiration, and how to design the 4-second action arc.',
      kling: 'Focus questions on: physics detail for movements (weight/momentum), preferred duration (5s vs 10s), what to include in negative prompt, and specific camera/lens specs (ARRI, RED, 35mm, 85mm).',
      sora: 'Focus questions on: preferred virtual lens choice, depth of detail for each labeled block, transition style between shots, and whether text elements should appear in the scene.',
      veo: 'Focus questions on: audio mood and music feel, whether dialogue is needed and its tone, ambient sound environment, and character consistency identifiers across scenes.',
      higgsfield: 'Focus questions on: timing cue precision (exact timestamps), preferred style preset (cinematic/documentary/anime), compound camera move preferences, and character likeness detail.',
      minimax: 'Focus questions on: choreography detail for body movements, micro-expression needs for emotional beats, emotion transition arcs, and group choreography dynamics.',
      general: 'Focus questions on: camera angle preference, motion speed/style, lighting mood, color grading, subject identity, or platform-specific constraints.',
    };

    return {
      systemPrompt: `You are an Elite Video Prompt Architect performing a precision refinement. Your task: upgrade the existing video prompt based on user feedback and answers.

Rules:
1. Integrate ALL user answers and feedback into the prompt — miss nothing, even minor details.
2. Maintain and enhance the cinematic structure across all 7 layers: camera, subject, subject motion, environment, scene motion, lighting, style.
3. Every refinement must be a significant upgrade — not cosmetic. Replace vague language with precise cinematic direction.
4. Output ONLY the refined video prompt in English.
5. If answers reveal a new creative direction, expand the prompt accordingly — leave no gaps.
6. Never add meta-commentary, explanations, or preamble to the output.
${iteration >= 3 ? `\nThis is refinement round #${iteration}. The prompt is already at a high level — make surgical cinematic precision improvements only.` : iteration === 2 ? '\nThis is the second refinement round — focus on remaining cinematic gaps, not what is already strong.' : ''}${platformRefinementGuidance[platform] || ''}

Platform: ${platform}. Tone: ${input.tone}. Category: ${input.category}.

${identity ? `${identity}\n\n` : ''}After the improved prompt, on a new line add:
[PROMPT_TITLE]שם קצר ותיאורי בעברית[/PROMPT_TITLE]

Then add [GENIUS_QUESTIONS] followed by up to 3 NEW questions targeting the remaining highest-impact gaps. ${platformGeniusQuestions[platform] || platformGeniusQuestions.general} Return an empty array [] if the prompt is now comprehensive across all 7 layers.
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
