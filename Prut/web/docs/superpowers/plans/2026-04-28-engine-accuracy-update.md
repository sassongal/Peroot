# Engine Accuracy Update — Image & Video Generation Platforms

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update 6 platform skill files, deprecate Sora, add Wan 2.6, and add an audio scoring dimension for audio-capable video platforms.

**Architecture:** Skill files are self-contained TypeScript objects in `src/lib/engines/skills/{image,video}/`. The skills registry in `index.ts` maps platform keys to skills. Scoring dimensions live in `prompt-dimensions.ts` and are called via `EnhancedScorer` and `InputScorer`. Audio scoring is gated on a `AUDIO_CAPABLE_PLATFORMS` constant and the new optional `platform?` parameter.

**Tech Stack:** TypeScript, Vitest (tests run with `npm run test`), Next.js App Router.

---

## File Map

| File | Action |
|---|---|
| `src/lib/engines/skills/index.ts` | Add `deprecated?: boolean` to interface; add `wan` import + registration; add `isDeprecated()` helper |
| `src/lib/engines/skills/image/dalle.ts` | Update name, examples, scoring, mistakes for gpt-image-1 |
| `src/lib/engines/skills/image/midjourney.ts` | Update to v7: name, examples, --cref/--sref/--draft criteria |
| `src/lib/engines/skills/image/flux.ts` | Update to FLUX.2 Pro: JSON format, HEX color |
| `src/lib/engines/skills/image/imagen.ts` | Update to Imagen 4: 2K, tiers, aspect ratios |
| `src/lib/engines/skills/video/runway.ts` | Major update: Gen-4.5, audio block, multi-shot, 60s |
| `src/lib/engines/skills/video/veo.ts` | Rename: "Veo 3" → "Veo 3.1" |
| `src/lib/engines/skills/video/sora.ts` | Add `deprecated: true` |
| `src/lib/engines/skills/video/wan.ts` | **NEW** — Wan 2.6 full skill file |
| `src/lib/video-platforms.ts` | Update type, names, list (add wan, filter sora) |
| `src/lib/engines/scoring/prompt-dimensions.ts` | Add `AUDIO_CAPABLE_PLATFORMS`, `scoreVideoAudio()`, `platform?` param to `scoreEnhancedVisualDimensions` |
| `src/lib/engines/scoring/enhanced-scorer.ts` | Add `platform?` param; pass to `scoreEnhancedVisualDimensions` |
| `src/lib/engines/scoring/input-scorer.ts` | Add `platform?` to `buildSharedChunkMap`; pass through |
| `src/lib/engines/scoring/__tests__/enhanced-scorer.test.ts` | Add audio dimension test cases |

---

## Task 1: Registry — Interface + Wan Import + isDeprecated()

**Files:**
- Modify: `src/lib/engines/skills/index.ts`

- [ ] **Step 1: Add `deprecated?: boolean` to PlatformSkill interface**

In `src/lib/engines/skills/index.ts`, find the `PlatformSkill` interface at line 82 and update it:

```typescript
export interface PlatformSkill {
  platform: string;
  name: string;
  deprecated?: boolean;  // ← add this line
  examples: SkillExample[];
  mistakes?: SkillMistake[];
  scoringCriteria?: string[];
  chainOfThoughtExamples?: ChainOfThoughtExample[];
  refinementExamples?: RefinementExample[];
}
```

- [ ] **Step 2: Add wan import at the top of the video imports block**

After `import { skill as videoGeneral } from './video/general';` add:

```typescript
import { skill as wan } from './video/wan';
```

- [ ] **Step 3: Add wan to VIDEO_SKILLS registry**

Find `const VIDEO_SKILLS: Record<string, PlatformSkill>` and add `wan` entry:

```typescript
const VIDEO_SKILLS: Record<string, PlatformSkill> = {
  runway,
  kling,
  sora,
  veo,
  higgsfield,
  minimax,
  wan,           // ← add this
  general: videoGeneral,
};
```

- [ ] **Step 4: Add `isDeprecated()` export after `getVideoSkill()`**

Add after `export function getVideoSkill(...)`:

```typescript
export function isDeprecated(type: 'image' | 'video' | 'text', platform: string): boolean {
  const skills = type === 'image' ? IMAGE_SKILLS : type === 'video' ? VIDEO_SKILLS : TEXT_SKILLS;
  return skills[platform]?.deprecated === true;
}
```

- [ ] **Step 5: Typecheck**

```bash
npm run typecheck
```

Expected: no errors (wan.ts doesn't exist yet so this will fail — continue to Task 2 which creates wan.ts; run typecheck again after Task 2).

---

## Task 2: Sora Deprecation + Veo Rename

**Files:**
- Modify: `src/lib/engines/skills/video/sora.ts`
- Modify: `src/lib/engines/skills/video/veo.ts`

- [ ] **Step 1: Add `deprecated: true` to sora skill**

In `src/lib/engines/skills/video/sora.ts`, in the `skill` object right after `name: 'Sora 2',`, add:

```typescript
  deprecated: true,
```

Result:
```typescript
export const skill: PlatformSkill = {
  platform: 'sora' as const,
  name: 'Sora 2',
  deprecated: true,
  examples: [
    // ... rest unchanged
```

- [ ] **Step 2: Rename Veo to "Veo 3.1"**

In `src/lib/engines/skills/video/veo.ts`, change the `name` field from `'Veo 3'` to `'Veo 3.1'`. The rest of the file stays unchanged.

- [ ] **Step 3: Verify with test**

```bash
npm run test -- --grep "sora\|veo"
```

---

## Task 3: New Wan 2.6 Skill File

**Files:**
- Create: `src/lib/engines/skills/video/wan.ts`

- [ ] **Step 1: Write the failing test**

In `src/lib/engines/skills/__tests__/video-skills.test.ts` (create if it doesn't exist), add:

```typescript
import { getVideoSkill } from '../index';

describe('wan skill', () => {
  it('is registered and has examples', () => {
    const skill = getVideoSkill('wan');
    expect(skill).toBeDefined();
    expect(skill!.platform).toBe('wan');
    expect(skill!.examples.length).toBeGreaterThanOrEqual(4);
    expect(skill!.mistakes).toBeDefined();
    expect(skill!.scoringCriteria).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test -- --grep "wan skill"
```

Expected: FAIL — `getVideoSkill('wan')` returns `undefined`.

- [ ] **Step 3: Create `src/lib/engines/skills/video/wan.ts`**

```typescript
import type { PlatformSkill } from '../index';

export const skill: PlatformSkill = {
  platform: 'wan' as const,
  name: 'Wan 2.6',
  examples: [
    {
      concept: 'נשר טס מעל קניון צבעוני',
      output: 'A golden eagle with wings fully extended soaring over a vast red-rock canyon at dusk, riding thermal updrafts along the sheer cliff face. The camera follows from behind in a low tracking arc, revealing layers of striated sandstone glowing amber and burgundy in the fading light. Sparse desert shrubs cling to ledges far below. Cinematic wide lens, high-contrast golden light from low sun angle, deep shadow pools in the canyon floor. Atmosphere: majestic solitude, vast geological scale. Negative prompt: morphing, warping, flickering, distortion, artifacts.',
      category: 'nature',
    },
    {
      concept: 'דוגמנית עם שמלה זורמת בשדה פרחים',
      output: 'A model in a flowing champagne silk dress walks slowly through a field of wild lavender at golden hour, the fabric catching the warm breeze in long ribbons. She turns her face toward the low sun, eyes closed, hair loose. Camera: slow push-in from medium to close-up on her profile, shallow depth of field. Lighting: warm sidelight from the left, soft diffused fill from overcast sky, creating a luminous halo effect. Color: champagne, violet, sage, warm gold. Atmosphere: editorial, serene, aspirational beauty. Negative prompt: warping limbs, flickering dress, face morphing, temporal artifacts.',
      category: 'fashion',
    },
    {
      concept: 'מכונית ספורט דוהרת בכביש מפותל',
      output: 'A matte-black sports car accelerates through a winding mountain road at sunrise, tires gripping the asphalt as it exits a sharp left-hand bend and launches into a straight. Camera: low side angle tracking shot keeping pace with the vehicle, road surface rushing beneath the frame. The car\'s body catches the first amber rays of dawn over the ridge. Pine forest lines both sides of the road, dark silhouettes against a coral and gold sky. Motion blur on the wheels, sharp chassis. Atmosphere: raw speed, mechanical precision, solitude of early morning. Negative prompt: warping bodywork, flickering headlights, judder, motion artifacts.',
      category: 'commercial',
    },
    {
      concept: 'מחול קלאסי על במה מוארת',
      output: 'A female ballet dancer in a white tutu performs a slow arabesque at center stage, her supporting leg perfectly straight, the extended leg forming a long diagonal line. A single overhead spotlight casts a sharp circular pool of white light around her, the rest of the stage falling into deep shadow. She transitions into a slow pirouette, tutu fanning outward in a perfect disc. Camera: static medium shot from the audience perspective, then slow push-in to waist-up. Lighting: harsh theatrical spot, warm floor footlights adding a soft amber base. Color: ivory, charcoal, warm amber. Atmosphere: disciplined grace, theatrical intimacy. Negative prompt: flickering, morphing limbs, tutu distortion, frame judder.',
      category: 'action',
    },
    {
      concept: 'נוף עירוני גשום בלילה',
      output: 'A rain-slicked city intersection at 2am, neon signs from a ramen shop and a convenience store reflecting in long pink and green ribbons across the wet asphalt. A lone pedestrian in a yellow rain jacket crosses the frame left-to-right under a black umbrella. Steam rises from a manhole cover. Camera: static wide shot from a slightly elevated angle, no camera movement. Environmental motion: rain streaking through the light cones, puddles rippling with each drop, steam drifting. Cinematic anamorphic lens compression. Color: deep teal, neon pink, amber yellow, charcoal. Atmosphere: urban solitude, quiet melancholy. Negative prompt: warping reflections, flickering neon, temporal smearing.',
      category: 'street',
    },
  ],
  mistakes: [
    {
      bad: 'A woman dancing beautifully in a field, graceful, cinematic, beautiful light',
      good: 'A dancer in a white linen dress spins slowly in a sunflower field at golden hour, arms extended, fabric trailing in the warm breeze. Camera follows in a slow circular orbit at waist height. Sidelight from low sun, long shadows across the field. Color: gold, ivory, sage. Atmosphere: joyful freedom. Negative prompt: warping, flickering, limb morphing.',
      why: 'Wan 2.6 responds to the full prompt formula: subject + movement + scene + camera + lighting + atmosphere. Vague adjectives give the model nothing to work with. Subject movement must be described with specific verbs and direction.',
    },
    {
      bad: 'A car driving on a road. Negative prompt: bad quality.',
      good: 'A pearl-white sedan moves steadily through a coastal highway at late afternoon. Camera: low front-quarter tracking angle, ocean visible beyond the guardrail to the right. Warm sidelight from the west catching the car\'s roofline. Atmospheric haze from sea spray. Color: pearl white, ocean blue, tawny amber. Negative prompt: warping chassis, flickering headlights, morphing wheels, motion artifacts, jerky movement.',
      why: 'Generic negative prompts like "bad quality" do not prevent Wan 2.6\'s common artifacts (morphing, warping, flickering). Use specific artifact terms: morphing, warping, flickering, distortion, judder, temporal artifacts.',
    },
    {
      bad: 'A chef making sushi, then the restaurant fills with guests, then the chef bows.',
      good: 'A sushi chef in a white jacket slices sashimi at a hinoki counter with deliberate, precise strokes, fish glistening under a single warm overhead light. Camera: static medium close-up on hands and cutting board, slight upward tilt to face at the end. Negative prompt: warping hands, flickering knife, temporal artifacts.',
      why: 'Wan 2.6 struggles with multi-scene narratives in a single generation. Describe one continuous action beat. Save scene transitions for multi-clip workflows.',
    },
  ],
  scoringCriteria: [
    'Subject + subject description + movement described with specific action verbs',
    'Scene + scene description grounding the environment',
    'Camera language: shot type, movement direction, lens type',
    'Lighting: source type, direction, quality (hard/soft), color temperature',
    'Atmosphere: mood or emotional tone, 1 sentence',
    'Negative prompt with artifact-specific terms: morphing, warping, flickering, distortion, judder',
    'Color palette stated explicitly (3-5 colors)',
    '50-120 words total; no keyword lists — flowing descriptive prose',
    'Single scene or single action beat per generation',
  ],
  chainOfThoughtExamples: [
    {
      concept: 'שחקנית בוכה בגשם',
      reasoning: 'Wan formula: subject (actress, appearance) + movement (subtle — tears, shoulders) + scene (rain, street) + camera (push-in to close-up) + lighting (rain diffuses light, backlight creates halo) + atmosphere (raw grief). Add negative prompt for faces and rain artifacts.',
      output: 'A woman in her 30s with dark wet hair stands motionless on an empty rain-soaked sidewalk at night, tears streaming silently down her face, shoulders slightly bowed. Camera: slow push-in from medium to extreme close-up on her face, rain droplets catching the backlight from a streetlamp behind her, creating a soft halo. The wet pavement reflects a blurred amber glow from a shop window. Color: near-monochrome — charcoal, pale skin, amber halo. Atmosphere: devastating stillness, private grief. Negative prompt: face morphing, flickering rain, warping, temporal artifacts.',
    },
  ],
  refinementExamples: [
    {
      iteration: 1,
      beforePrompt: 'A landscape with mountains and fog, cinematic, beautiful colors',
      afterPrompt: 'A mountain range at dawn emerges slowly from a sea of low cloud fog, jagged granite peaks catching the first coral light while the valleys remain hidden in grey mist. Camera: slow crane up from just above the cloud layer, rising to reveal the full ridgeline against a pale rose sky. Lighting: low-angle sunrise from the east, warm sidelight on east-facing cliff faces, cool blue in shadow zones. Color: coral, pale rose, cool grey, granite charcoal. Atmosphere: geological timescale, sacred silence. Negative prompt: flickering, warping mountains, fog morphing, temporal artifacts.',
      changes: [
        'Added specific mountain and fog behavior (sea of cloud, peaks emerging)',
        'Defined camera movement (crane up from cloud level)',
        'Specified lighting source, angle, and shadow zones',
        'Added color palette and atmosphere sentence',
        'Added artifact-specific negative prompt',
      ],
    },
  ],
};
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test -- --grep "wan skill"
```

Expected: PASS.

- [ ] **Step 5: Typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/engines/skills/index.ts src/lib/engines/skills/video/sora.ts src/lib/engines/skills/video/veo.ts src/lib/engines/skills/video/wan.ts
git commit -m "feat(engines): add Wan 2.6, deprecate Sora, rename Veo 3.1, add isDeprecated()"
```

---

## Task 4: Update Image Skills — GPT Image, Midjourney v7, FLUX.2, Imagen 4

**Files:**
- Modify: `src/lib/engines/skills/image/dalle.ts`
- Modify: `src/lib/engines/skills/image/midjourney.ts`
- Modify: `src/lib/engines/skills/image/flux.ts`
- Modify: `src/lib/engines/skills/image/imagen.ts`

### 4A — GPT Image (gpt-image-1)

- [ ] **Step 1: Update dalle.ts name**

Change `name: 'GPT Image / DALL-E'` → `name: 'GPT Image (gpt-image-1)'`

- [ ] **Step 2: Add 2 new examples to dalle.ts**

Append after the existing examples array (before the closing `]`):

```typescript
    {
      concept: 'פוסטר לסרט עם כותרת מרובת שורות',
      output: 'A dramatic movie poster for a thriller titled "THE LAST SIGNAL" in bold condensed white type stacked over a secondary line "NO ONE IS COMING" in smaller italic red text below. The background is a lone figure in a long coat standing on a rain-soaked rooftop at night, the city skyline behind them blurred and lit in cold blue tones. Official film billing block in tiny white text at the bottom. The typography is crisp, perfectly rendered, and fully legible. Cinematic noir, high contrast, photorealistic composition. [size: 1024x1792] [quality: hd]',
      category: 'commercial',
    },
    {
      concept: 'בקבוק בושם על רקע שקוף',
      output: 'An elegant crystal perfume bottle with a rose-gold cap, containing pale champagne liquid, photographed against a transparent background. The bottle casts a clean shadow to the lower right. Faceted glass surfaces refract a subtle spectrum of light. Product shot with studio lighting — a single soft box from the upper left, minimal fill. The image is suitable for e-commerce or packaging placement. Background: transparent PNG. [size: 1024x1024] [quality: hd]',
      category: 'product',
    },
```

- [ ] **Step 3: Update dalle.ts mistakes**

Replace the existing first mistake entry (the one about text rendering in DALL-E 3):

Old mistake (bad field contains something about text layout):
Find the mistake about text rendering — it will reference DALL-E 3's limitations. Replace with:

```typescript
    {
      bad: 'A poster with a lot of text saying SALE 50% OFF TODAY ONLY with product images and fine print at the bottom.',
      good: 'A clean retail promotional poster. Large centered headline text reading "SALE — 50% OFF" in bold white sans-serif on a deep red background. Below it, three product silhouettes arranged in a row. Fine print line at the bottom in small grey text. Vivid and eye-catching. [size: 1024x1024] [quality: hd]',
      why: 'gpt-image-1 handles multi-line text and complex layouts natively in one pass — no need for Canva post-processing. Describe the text content and layout clearly; the model renders it correctly.',
    },
```

- [ ] **Step 4: Add 2 scoring criteria to dalle.ts**

Append to `scoringCriteria` array:

```typescript
    'Transparent PNG: state "transparent background" or "transparent PNG" explicitly when needed',
    'For raw/imperfect look — state explicitly: "add film grain", "rough brush strokes", "hand-drawn feel"',
```

### 4B — Midjourney v7

- [ ] **Step 5: Update midjourney.ts name**

Change `name: 'Midjourney v7/v8'` → `name: 'Midjourney v7'`

- [ ] **Step 6: Update midjourney.ts examples to v7 sentence style**

Replace the existing first example output (the elderly man portrait) with a v7 sentence-style version:

```typescript
      output: 'An elderly man with a flowing white beard and deeply weathered skin, half his face in warm Rembrandt shadow, piercing blue eyes that hold a lifetime of stories. Intimate close-up, medium format film --ar 2:3 --s 750',
```

Replace the second example output (alpine lake) with a cleaner v7 version:

```typescript
      output: 'A pristine alpine lake at dawn perfectly mirroring snow-capped peaks, thin mist hovering above turquoise water, a lone wooden dock extending into the foreground. Ethereal pink and violet light breaking over jagged granite. --ar 16:9 --s 500',
```

- [ ] **Step 7: Add --cref and --sref example to midjourney.ts**

Add a new example to the examples array:

```typescript
    {
      concept: 'אופנה - דמות עקבית עם פלטת צבעים קבועה',
      output: 'A young woman with auburn hair and sharp cheekbones in an editorial fashion shoot, wearing a structured oversized blazer in terracotta, standing against a bleached concrete wall, late afternoon light. Street style meets Parisian elegance. --cref <character_image_url> --sref <style_image_url> --ar 4:5 --s 600',
      category: 'fashion',
    },
```

- [ ] **Step 8: Add --cref, --sref, --draft to midjourney.ts scoringCriteria**

Append to `scoringCriteria`:

```typescript
    '--cref <image_url> — character reference: locks face and clothing across generations',
    '--sref <image_url> — style reference: locks aesthetic, palette, and mood',
    '--draft — use for fast iteration before final render (10x faster, half GPU cost)',
```

- [ ] **Step 9: Add over-tagging mistake to midjourney.ts**

Append to `mistakes`:

```typescript
    {
      bad: 'ultra detailed, highly realistic, beautiful, stunning, amazing, gorgeous, perfect, cinematic, dramatic, professional photography, 8K, HDR, masterpiece',
      good: 'A fisherman casting a net at sunrise over a still river, golden light catching the water droplets in mid-air, Malick warmth. --ar 16:9 --s 600',
      why: 'Midjourney v7 responds to sentence-style prompts. Stacking comma-separated quality adjectives muddies the output. Describe the scene in natural sentences — fewer modifiers, more specific imagery.',
    },
```

### 4C — FLUX.2 Pro

- [ ] **Step 10: Update flux.ts name**

Change `name` to `'FLUX.2 Pro'`

- [ ] **Step 11: Add JSON prompt example to flux.ts**

Add new example:

```typescript
    {
      concept: 'בקבוק מוצר עם צבע מותג מדויק',
      output: '{"subject": "a cylindrical glass water bottle with matte brushed aluminum cap", "color": "bottle body in #1A6B4A forest green, cap in #C0C0C0 brushed silver", "lighting": "single soft diffused overhead key light, gentle fill from the left, clean white studio background", "camera": "slightly elevated 3/4 angle, 85mm equivalent lens, shallow depth of field", "style": "product photography, clean editorial, e-commerce ready"}',
      category: 'product',
    },
```

- [ ] **Step 12: Add JSON format and HEX criteria to flux.ts scoringCriteria**

Append:

```typescript
    'JSON format for precise multi-axis control: {"subject", "camera", "lighting", "style", "color"}',
    'HEX color matching: attach #RRGGBB hex codes to specific objects for exact brand colors',
    'Natural prose for creative freedom; JSON structure for product/commercial precision',
```

### 4D — Imagen 4

- [ ] **Step 13: Update imagen.ts name**

Change `name` to `'Imagen 4'`

- [ ] **Step 14: Add tier and 2K guidance to imagen.ts scoringCriteria**

Append:

```typescript
    'Model tier: Ultra ($0.06) for portraits and hero shots; Fast ($0.02) for iteration',
    'Supported aspect ratios: 1:1, 3:4, 4:3, 9:16, 16:9 — specify explicitly',
    '2K resolution available — mention "high resolution" or "2K" for detail-critical shots',
```

- [ ] **Step 15: Run tests**

```bash
npm run test -- --grep "image|skill"
npm run typecheck
```

Expected: passing tests, no type errors.

- [ ] **Step 16: Commit**

```bash
git add src/lib/engines/skills/image/
git commit -m "feat(engines): update image skills — GPT Image 1.5, Midjourney v7, FLUX.2, Imagen 4"
```

---

## Task 5: Runway Gen-4.5 Major Update

**Files:**
- Modify: `src/lib/engines/skills/video/runway.ts`

This is the largest single-file change. Runway Gen-4.5 adds native audio, multi-shot sequencing, and up to 60 seconds of video.

- [ ] **Step 1: Update runway.ts name**

Change `name: 'Runway Gen-4'` → `name: 'Runway Gen-4.5'`

- [ ] **Step 2: Add 2 audio examples to runway.ts**

Append after the existing examples (before closing `]`):

```typescript
    {
      concept: 'שף מכין סוּשי - עם שמע',
      output: `Medium shot: Slow dolly inward as a sushi chef in a pristine white uniform slices sashimi with deliberate strokes, fish glistening under a single warm overhead practical. The camera settles on a close-up of the knife contacting the fish, then pulls back to the full counter as he lifts a piece onto a dish.

Audio:
Dialogue: None.
SFX: "clean knife blade on hinoki wood, rhythmic, precise", "soft wooden tray set down on counter."
Ambient: "quiet restaurant murmur, soft ventilation hum."
Music: "sparse Japanese koto, slow tempo, contemplative."`,
      category: 'food',
    },
    {
      concept: 'סיקוונס רב-סצנה: פריחת עץ',
      output: `Multi-shot sequence across seasons — all from the same fixed wide angle looking up through the canopy of a cherry tree in a city park.

Scene 1 (0-15s): Bare winter branches against a pale grey sky, occasional snowflakes drifting. The tree is still.
Scene 2 (15-30s): Early spring — pale pink buds beginning to open on the tips of branches, soft morning light.
Scene 3 (30-45s): Full bloom — canopy exploded in deep pink blossoms, petals drifting through golden sunlight, pedestrians visible below.
Scene 4 (45-60s): Late summer — dense green leaves, dappled light, children playing beneath in warm afternoon shade.

Audio:
Dialogue: None.
SFX: "winter wind through bare branches", "spring birdsong emerging", "summer park ambience, distant laughter."
Ambient: "seasonal transition — each scene's natural environment layer."
Music: "slow minimalist piano, cycling through four quiet phrases matching each seasonal shift."`,
      category: 'nature',
    },
```

- [ ] **Step 3: Update runway.ts mistakes — add "No Audio block" and update duration mistake**

Replace the last mistake (about multi-scene narrative arc, mentioning "5s or 10s") with:

```typescript
    {
      bad: 'A wide shot of a kitchen where a chef is cooking. The kitchen is busy and loud.',
      good: `Medium shot: Static camera captures a chef tilting a copper pan over a gas flame as cognac ignites in a controlled flambe, fire erupting upward in blue and orange. The flame reflects off stainless counters.

Audio:
Dialogue: None.
SFX: "cognac igniting with a deep whoosh", "sizzling fat on hot metal."
Ambient: "busy kitchen clatter, extractor fans humming in the background."
Music: "None."`,
      why: 'Gen-4.5 supports native audio generation. Always include the Audio block with all four sub-keys (Dialogue, SFX, Ambient, Music). Prompts without an Audio block will produce silent video.',
    },
```

Also replace the "5s or 10s" mistake (about multi-scene narrative arc) with a better version that reflects Gen-4.5's 60s capability:

Add a new fourth mistake entry:

```typescript
    {
      bad: 'A woman walks into a bar, orders a drink, has a conversation, then leaves and drives home.',
      good: `Wide shot: A woman in a worn leather jacket pushes through a dimly lit bar door, smoke curling around her as warm amber light from vintage overhead fixtures catches her face. She pauses, scanning the room.

Audio:
Dialogue: None.
SFX: "bar door swinging open with a creak", "low murmur of conversation inside."
Ambient: "smoky bar ambience, low music from a jukebox."
Music: "slow blues guitar, melancholic, low in the mix."`,
      why: 'Even at 60s duration, Runway Gen-4.5 works best with one coherent cinematic beat per generation. Plan multi-scene stories as separate clips using the multi-shot sequencing format, not as a single narrative arc.',
    },
```

- [ ] **Step 4: Update runway.ts scoringCriteria**

Replace the existing array with an updated version that adds audio and updates duration:

```typescript
  scoringCriteria: [
    'Shot size stated first (wide, medium, close-up) to anchor framing',
    'Exactly one primary camera move; at most one subtle secondary move',
    'Subject motion + camera motion + environment motion each get a phrase',
    'For single-scene clips: one location / moment per generation',
    'For multi-shot sequences: use Scene N (start-end): format with temporal markers',
    '30-80 words of flowing English prose (not comma keywords) for single-scene; longer for multi-shot',
    'No negatives: Runway ignores "no blur" style exclusions — describe positives only',
    'Lens or film reference when it helps (anamorphic flare, 85mm portrait)',
    'Mood line at end (melancholic, urgent, serene)',
    'Duration: up to 60s — design motion arc accordingly',
    'Audio block required: Dialogue (exact quote or "None"), SFX (2+ descriptors), Ambient, Music',
    'Lighting vocabulary (neon bounce, golden side light, single practical)',
  ],
```

- [ ] **Step 5: Update runway.ts chainOfThoughtExamples**

Update the first chain-of-thought reasoning to mention audio:

```typescript
    {
      concept: 'מרדף לילי בעיר',
      reasoning:
        'Runway Gen-4.5: establish wide geography, camera move (tracking), vehicle motion, environment (rain, neon). One scene. No negatives. Then add Audio block: SFX for tire + engine sounds, ambient for rain and city, no dialogue.',
      output: `Wide shot: A tracking shot races beside a black coupe sliding through a rain-slicked alley, neon kanji reflections streaking across the hood. Steam rises from a grate; the camera whips slightly as the car drifts the corner. Anamorphic lens flares, Michael Mann night palette, urgent energy.

Audio:
Dialogue: None.
SFX: "tires screeching on wet asphalt", "engine roar peaking through the drift."
Ambient: "rain hammering the alley, distant city sirens."
Music: "pulsing synth bass, tense and rhythmic."`,
    },
```

- [ ] **Step 6: Run tests**

```bash
npm run test -- --grep "runway|visual-engine"
npm run typecheck
```

- [ ] **Step 7: Commit**

```bash
git add src/lib/engines/skills/video/runway.ts
git commit -m "feat(engines): update Runway to Gen-4.5 with audio blocks and multi-shot support"
```

---

## Task 6: Audio Scoring Dimension

**Files:**
- Modify: `src/lib/engines/scoring/prompt-dimensions.ts`
- Modify: `src/lib/engines/scoring/enhanced-scorer.ts`
- Modify: `src/lib/engines/scoring/input-scorer.ts`

- [ ] **Step 1: Write failing tests**

In `src/lib/engines/scoring/__tests__/enhanced-scorer.test.ts`, add:

```typescript
import { scoreEnhancedVisualDimensions } from '../prompt-dimensions';
import { CapabilityMode } from '@/lib/capability-mode';
import { EnhancedScorer } from '../enhanced-scorer';

describe('audio scoring dimension', () => {
  const RUNWAY_PROMPT_WITH_AUDIO = `Wide shot: A chef tilts a copper pan as cognac ignites.

Audio:
Dialogue: None.
SFX: "cognac igniting with a deep whoosh", "sizzling fat on hot metal."
Ambient: "busy kitchen clatter, extractor fans humming."
Music: "slow jazz piano, warm, melancholic."`;

  const RUNWAY_PROMPT_NO_AUDIO = 'Wide shot: A chef tilts a copper pan as cognac ignites in a controlled flambe, fire erupting upward in blue and orange.';

  it('runway with full Audio block scores 15/15 on audio dimension', () => {
    const chunks = scoreEnhancedVisualDimensions(RUNWAY_PROMPT_WITH_AUDIO, 40, true, 'runway');
    const audio = chunks.find(c => c.key === 'audio');
    expect(audio).toBeDefined();
    expect(audio!.score).toBe(15);
    expect(audio!.maxPoints).toBe(15);
  });

  it('runway without Audio block scores 0/15 on audio dimension', () => {
    const chunks = scoreEnhancedVisualDimensions(RUNWAY_PROMPT_NO_AUDIO, 20, true, 'runway');
    const audio = chunks.find(c => c.key === 'audio');
    expect(audio).toBeDefined();
    expect(audio!.score).toBe(0);
    expect(audio!.maxPoints).toBe(15);
  });

  it('non-audio platform (higgsfield) has no audio dimension', () => {
    const chunks = scoreEnhancedVisualDimensions(RUNWAY_PROMPT_WITH_AUDIO, 40, true, 'higgsfield');
    const audio = chunks.find(c => c.key === 'audio');
    expect(audio).toBeUndefined();
  });

  it('image platform has no audio dimension even when audio-capable platform key passed', () => {
    // Platform key doesn't matter for image mode — isVideo=false means no audio
    const chunks = scoreEnhancedVisualDimensions('A portrait of a woman', 5, false, 'runway');
    const audio = chunks.find(c => c.key === 'audio');
    expect(audio).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test -- --grep "audio scoring dimension"
```

Expected: FAIL — `scoreEnhancedVisualDimensions` doesn't accept a 4th argument yet.

- [ ] **Step 3: Add audio scoring to `prompt-dimensions.ts`**

After the `scoreVisualMotion` function (ends around line 1347) and BEFORE `scoreEnhancedVisualDimensions`, add:

```typescript
const AUDIO_CAPABLE_PLATFORMS = new Set(['runway', 'veo', 'kling']);

function scoreVideoAudio(t: string): DimensionScoreChunk {
  const key = 'audio';
  const maxPoints = 15;
  const tipHe = 'הוסף בלוק Audio עם Dialogue, SFX, Ambient ו-Music';
  const matched: string[] = [];
  const missing: string[] = [];
  let pts = 0;

  // Dialogue (4pts): present with exact quote or explicit "None"
  if (/^Dialogue:/m.test(t)) {
    if (/^Dialogue:\s*(None|[""].+[""]|\(.*\).*[""])/m.test(t)) {
      matched.push('Dialogue מוגדר');
      pts += 4;
    } else {
      matched.push('Dialogue קיים');
      pts += 2;
      missing.push('Dialogue — ציטוט מדויק או "None"');
    }
  } else {
    missing.push('Dialogue block חסר');
  }

  // SFX (4pts): present with 2+ quoted descriptors
  if (/^SFX:/m.test(t)) {
    const sfxLine = t.match(/^SFX:\s*(.+)/m)?.[1] ?? '';
    const count = (sfxLine.match(/[""][^""]+[""]/g) ?? []).length;
    if (count >= 2) {
      matched.push(`SFX (${count} צלילים)`);
      pts += 4;
    } else {
      matched.push('SFX קיים');
      pts += 2;
      missing.push('SFX — הוסף 2+ תיאורי צליל בגרשיים');
    }
  } else {
    missing.push('SFX block חסר');
  }

  // Ambient (4pts)
  if (/^Ambient:/m.test(t)) {
    matched.push('Ambient מוגדר');
    pts += 4;
  } else {
    missing.push('Ambient block חסר');
  }

  // Music (3pts)
  if (/^Music:/m.test(t)) {
    matched.push('Music מוגדר');
    pts += 3;
  } else {
    missing.push('Music block חסר');
  }

  return { key, maxPoints, tipHe, score: pts, matched, missing };
}
```

- [ ] **Step 4: Update `scoreEnhancedVisualDimensions` signature to accept `platform?`**

Find the function signature at line ~1349:

```typescript
export function scoreEnhancedVisualDimensions(
  t: string,
  wordCount: number,
  isVideo: boolean,
): DimensionScoreChunk[] {
```

Change to:

```typescript
export function scoreEnhancedVisualDimensions(
  t: string,
  wordCount: number,
  isVideo: boolean,
  platform?: string,
): DimensionScoreChunk[] {
```

- [ ] **Step 5: Add audio dimension call inside `scoreEnhancedVisualDimensions`**

Find the function body:

```typescript
  const dims = [
    scoreVisualLength(wordCount),
    scoreVisualSubject(t),
    scoreVisualStyle(t),
    scoreVisualComposition(t),
    scoreVisualLighting(t),
    scoreVisualColor(t),
    scoreVisualQuality(t),
  ];
  if (isVideo) dims.push(scoreVisualMotion(t));
  return dims;
```

Change to:

```typescript
  const dims = [
    scoreVisualLength(wordCount),
    scoreVisualSubject(t),
    scoreVisualStyle(t),
    scoreVisualComposition(t),
    scoreVisualLighting(t),
    scoreVisualColor(t),
    scoreVisualQuality(t),
  ];
  if (isVideo) dims.push(scoreVisualMotion(t));
  if (isVideo && platform && AUDIO_CAPABLE_PLATFORMS.has(platform)) {
    dims.push(scoreVideoAudio(t));
  }
  return dims;
```

- [ ] **Step 6: Add `audio` to `DIMENSION_LABEL_HE`**

In the `DIMENSION_LABEL_HE` object, after `motion: "תנועה",` add:

```typescript
  audio: "שמע",
```

- [ ] **Step 7: Add `audio` to `TIPS`**

In the `TIPS` object, add:

```typescript
  audio: "הוסף בלוק Audio עם Dialogue, SFX, Ambient ו-Music",
```

- [ ] **Step 8: Run tests to verify audio scoring passes**

```bash
npm run test -- --grep "audio scoring dimension"
```

Expected: PASS.

- [ ] **Step 9: Update `enhanced-scorer.ts` to accept and pass `platform?`**

In `src/lib/engines/scoring/enhanced-scorer.ts`, update `EnhancedScorer.score()` signature from:

```typescript
  static score(text: string, mode: CapabilityMode = CapabilityMode.STANDARD, domain?: PromptDomain): EnhancedScore {
```

to:

```typescript
  static score(text: string, mode: CapabilityMode = CapabilityMode.STANDARD, domain?: PromptDomain, platform?: string): EnhancedScore {
```

Then update the scoring call on line ~74:

```typescript
    const chunks = isVisual
      ? scoreEnhancedVisualDimensions(trimmed, wordCount, isVideo)
```

to:

```typescript
    const chunks = isVisual
      ? scoreEnhancedVisualDimensions(trimmed, wordCount, isVideo, platform)
```

- [ ] **Step 10: Update `input-scorer.ts` to pass platform through**

In `src/lib/engines/scoring/input-scorer.ts`, update `buildSharedChunkMap` signature from:

```typescript
function buildSharedChunkMap(mode: CapabilityMode, p: Parsed): Map<string, DimensionScoreChunk> {
```

to:

```typescript
function buildSharedChunkMap(mode: CapabilityMode, p: Parsed, platform?: string): Map<string, DimensionScoreChunk> {
```

Then update the `scoreEnhancedVisualDimensions` call inside it:

```typescript
    scoreEnhancedVisualDimensions(
      p.text,
      p.wordCount,
      mode === CapabilityMode.VIDEO_GENERATION,
    ).forEach((c) => m.set(c.key, c));
```

to:

```typescript
    scoreEnhancedVisualDimensions(
      p.text,
      p.wordCount,
      mode === CapabilityMode.VIDEO_GENERATION,
      platform,
    ).forEach((c) => m.set(c.key, c));
```

Also update `InputScorer.score()` (the main public method in input-scorer.ts) to accept and forward `platform?`. Search for where `buildSharedChunkMap` is called within `InputScorer.score` and pass platform through.

- [ ] **Step 11: Run all tests**

```bash
npm run test
npm run typecheck
```

Expected: all pass.

- [ ] **Step 12: Commit**

```bash
git add src/lib/engines/scoring/
git commit -m "feat(scoring): add audio dimension for Runway/Veo/Kling with 15-point scoring"
```

---

## Task 7: Update video-platforms.ts

**Files:**
- Modify: `src/lib/video-platforms.ts`

- [ ] **Step 1: Add `wan` to the `VideoPlatform` type and remove `sora`**

Current line 1:
```typescript
export type VideoPlatform = 'general' | 'runway' | 'kling' | 'sora' | 'veo' | 'higgsfield' | 'minimax';
```

Change to:
```typescript
export type VideoPlatform = 'general' | 'runway' | 'kling' | 'veo' | 'higgsfield' | 'minimax' | 'wan';
```

(Remove `'sora'` — it's deprecated and should no longer appear in the UI picker.)

- [ ] **Step 2: Update `VIDEO_PLATFORMS` array**

Replace the current array content with:

```typescript
export const VIDEO_PLATFORMS: VideoPlatformConfig[] = [
  { id: 'general', name: 'General', nameHe: 'כללי', description: 'פרומפט אופטימלי לכל פלטפורמת וידאו', icon: '🎬' },
  { id: 'runway', name: 'Runway Gen-4.5', nameHe: 'Runway', description: 'אודיו מקורי, multi-shot, עד 60 שניות, text-to-video', icon: 'runway' },
  { id: 'kling', name: 'Kling 3.0', nameHe: 'Kling', description: 'פיזיקה מתקדמת, 4K, אודיו מקורי, Motion Brush, 3-15 שניות', icon: 'kling' },
  { id: 'veo', name: 'Veo 3.1', nameHe: 'Veo', description: 'Google Veo - אודיו מקורי, דיאלוג, SFX, עקביות דמויות', icon: 'veo' },
  { id: 'higgsfield', name: 'Higgsfield Cinema', nameHe: 'Higgsfield', description: 'מערכת 3 שכבות, מולטי-מודל, תזמון מדויק', icon: 'higgsfield' },
  { id: 'minimax', name: 'Minimax Hailuo 2.3', nameHe: 'Minimax', description: 'תנועות גוף, הבעות פנים, סינטקס [מצלמה], אנימה', icon: 'minimax' },
  { id: 'wan', name: 'Wan 2.6', nameHe: 'Wan', description: 'Alibaba open-source, חינם, אסתטיקה קולנועית, נגטיב פרומפט', icon: '🎞️' },
];
```

- [ ] **Step 2a: Fix any TypeScript references to `'sora'` as a `VideoPlatform` type**

```bash
npm run typecheck
```

If there are type errors referencing `sora` as a `VideoPlatform` (e.g., in `video-engine.ts` PLATFORM_OVERRIDES or `platform-overrides.ts`), those references need `sora` removed from the typed union. The `skills/index.ts` still imports the sora skill (for the API grace period) so that's fine — only the `VideoPlatform` type and UI list change.

Check if `video-engine.ts` has `sora` in a `Record<VideoPlatform, string>`. If so, remove the `sora` key from that record.

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/video-platforms.ts
git commit -m "feat(ui): add Wan 2.6 to video platform picker, remove deprecated Sora"
```

---

## Task 8: Verification Tests

**Files:**
- Test: `src/lib/engines/scoring/__tests__/enhanced-scorer.test.ts`
- Read existing: `src/lib/engines/__tests__/visual-engine-templates.test.ts`

- [ ] **Step 1: Add isDeprecated verification test**

In an appropriate test file (e.g., create `src/lib/engines/skills/__tests__/registry.test.ts`):

```typescript
import { getVideoSkill, isDeprecated } from '../index';

describe('skills registry', () => {
  it('getVideoSkill("sora").deprecated is true', () => {
    const sora = getVideoSkill('sora');
    expect(sora).toBeDefined();
    expect(sora!.deprecated).toBe(true);
  });

  it('isDeprecated("video", "sora") returns true', () => {
    expect(isDeprecated('video', 'sora')).toBe(true);
  });

  it('isDeprecated("video", "runway") returns false', () => {
    expect(isDeprecated('video', 'runway')).toBe(false);
  });

  it('getVideoSkill("wan") returns examples', () => {
    const wan = getVideoSkill('wan');
    expect(wan).toBeDefined();
    expect(wan!.examples.length).toBeGreaterThan(0);
  });

  it('getVideoSkill("runway").name is "Runway Gen-4.5"', () => {
    const runway = getVideoSkill('runway');
    expect(runway!.name).toBe('Runway Gen-4.5');
  });

  it('getVideoSkill("veo").name is "Veo 3.1"', () => {
    const veo = getVideoSkill('veo');
    expect(veo!.name).toBe('Veo 3.1');
  });
});
```

- [ ] **Step 2: Run all tests**

```bash
npm run test
```

Expected: all pass.

- [ ] **Step 3: Full typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 4: Run lint**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 5: Final commit**

```bash
git add src/lib/engines/skills/__tests__/
git commit -m "test(engines): add registry and audio scoring verification tests"
```

---

## Verification Checklist

Run these after all tasks complete:

1. `npm run test` — all tests pass
2. `npm run typecheck` — no type errors
3. `getVideoSkill('sora').deprecated === true` — covered by Task 8 test
4. `getVideoSkill('wan')` returns examples — covered by Task 8 test
5. `isDeprecated('video', 'sora') === true` — covered by Task 8 test
6. Runway Gen-4.5 prompt WITH Audio block → `audio` dimension = 15/15 — covered by Task 6 test
7. Same prompt WITHOUT Audio block → `audio` dimension = 0/15 — covered by Task 6 test
8. `VIDEO_PLATFORMS` does not include `sora` — confirmed by Task 7 (type removed from union)
9. `VIDEO_PLATFORMS` includes `wan` — confirmed by Task 7
