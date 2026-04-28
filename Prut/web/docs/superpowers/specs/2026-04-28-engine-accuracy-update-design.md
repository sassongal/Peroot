# Engine Accuracy Update — Image & Video Generation Platforms
**Spec:** 2026-04-28 | **Approach:** C (Skill files + UI + Audio scoring)

---

## Context

Peroot's image and video generation engines were built against model capabilities from mid-2025. Since then, several platforms have shipped major updates, one has shut down entirely, and audio-in-video has become a standard capability across three platforms. This spec covers:

1. Updating 4 image platform skill files to reflect current model capabilities
2. Updating 2 video platform skill files (Runway Gen-4.5 + Veo 3.1)
3. Deprecating Sora (shut down April 26, 2026; API grace until September 2026)
4. Adding Wan 2.6 as a new video platform
5. Adding an `audio` scoring dimension to `scoreEnhancedVisualDimensions` for audio-capable video platforms (Runway, Veo, Kling)

---

## Section 1: Skill File Updates

### Image Platforms

#### `skills/image/dalle.ts` → GPT Image (gpt-image-1)

**What changed:** `gpt-image-1` (GPT Image 1.5) replaced DALL-E 3. Key differences:
- Text rendering: can handle paragraphs and complex layouts in one pass — no longer need Canva post-processing
- Transparent PNG: say "transparent background" or "transparent PNG" in prompt
- Conversational context: references prior messages in the same chat session
- More opinionated — needs explicit instruction for raw/gritty/imperfect looks ("add film grain, rough edges, hand-drawn feel")
- Still uses `[size: WxH]` and `[quality: hd]` — parameters unchanged
- Generation: 60-180s (was 20-45s for DALL-E 3)

**Updates:**
- `name`: "GPT Image / DALL-E" → "GPT Image (gpt-image-1)"
- Add 2 new examples: one showcasing text-in-image (multi-line poster), one showcasing transparent PNG product shot
- Update `mistakes`: replace DALL-E text rendering limitation with gpt-image-1 best practice
- Add scoring criterion: "transparent PNG — state 'transparent background' when needed"
- Add scoring criterion: "for raw/imperfect look — state explicitly ('add film grain', 'rough brush strokes')"

#### `skills/image/midjourney.ts` → Midjourney v7

**What changed:** v7 became the default on June 17, 2025.
- Write like sentences or story fragments — fewer technical tags
- Over-specifying muddies output
- New: `--cref <image_url>` — character reference (locks face/clothing across generations)
- New: `--sref <image_url>` — style reference (locks aesthetic/palette)
- New: `--draft` — 10x faster, half GPU cost (use for iteration before final render)
- Better hands, bodies, text

**Updates:**
- `name`: "Midjourney v7"
- Add `--cref` and `--sref` usage to scoring criteria and examples
- Add `--draft` guidance in chain-of-thought (when to use it)
- Update examples: replace over-tagged v6-style prompts with v7 sentence-style
- Add mistake: over-tagging with comma-separated adjectives

#### `skills/image/flux.ts` → FLUX.2

**What changed:**
- JSON-structured prompting: `{"subject": "...", "camera": "...", "lighting": "...", "style": "..."}` gives precise control
- HEX color matching: attach `#FF5733` to specific objects for exact color
- Single VLM text encoder — natural language works better than dual-encoder keyword tricks
- No negative prompts (already our guidance)
- New endpoint: `flux-2-pro-preview`

**Updates:**
- `name`: "FLUX.2 Pro"
- Add JSON prompt format to examples and scoring criteria
- Add HEX color matching example (product shot with brand color)
- Add scoring criterion: "JSON format for precise control; natural prose for creative freedom"
- Remove any legacy negative prompt references

#### `skills/image/imagen.ts` → Imagen 4

**What changed:**
- Released May 2025
- 2K resolution support
- Three model tiers: Fast ($0.02) / Standard ($0.04) / Ultra ($0.06)
- Better text rendering and prompt adherence
- Supported aspect ratios: 1:1, 3:4, 4:3, 9:16, 16:9

**Updates:**
- `name`: "Imagen 4"
- Add aspect ratio spec to scoring criteria
- Add model tier guidance: "Ultra for portraits/hero shots; Fast for iteration"
- Add 2K resolution mention where applicable in examples
- Update examples to reflect improved text handling

---

### Video Platforms

#### `skills/video/runway.ts` → Runway Gen-4.5

**What changed** (released December 2025):
- **Native audio generation**: SFX, dialogue, ambient, music — same structure as Veo
- **Multi-shot sequencing**: multiple scenes in one prompt with temporal markers
- **Videos up to 1 minute** (was 5-10s for Gen-4)
- Primary strength now **text-to-video** (Gen-4 was image-to-video focused)
- Prompting: clarity > strict structure; natural prose preferred

**Updates:**
- `name`: "Runway Gen-4.5"
- Add `Audio:` section to all examples (Dialogue, SFX, Ambient, Music)
- Add multi-shot example with sequential scene beats
- Update mistakes: add "No Audio block" as common mistake
- Update scoring criteria: add audio layer requirements
- Duration: update from "5s or 10s" to "up to 60s" guidance

**Example Audio structure (matching Veo pattern):**
```
Audio:
Dialogue: "Exact quoted text" or None.
SFX: "specific sound with texture descriptor", "second sound."
Ambient: "environmental layer 1, environmental layer 2."
Music: "genre, instruments, tempo, emotional function."
```

#### `skills/video/veo.ts` → Veo 3.1

**What changed:** Minor update. Audio block structure already correct.

**Updates:**
- `name`: "Veo 3" → "Veo 3.1"
- No structural changes

#### `skills/video/sora.ts` → Deprecated

**Reason:** Sora app shut down April 26, 2026. API grace period until September 24, 2026.

**Updates:**
- Add `deprecated: true` to the skill object (requires interface update — see Section 2)
- Keep all content intact for the API grace period

---

### New Platform

#### `skills/video/wan.ts` — Wan 2.6 (New)

**About Wan 2.6:**
Alibaba's open-source video model. Free tier available. Uses MoE (Mixture of Experts) architecture. Strong cinematic aesthetic control with multi-dimensional visual parameters (lighting, color, composition). Supports negative prompts.

**Prompt formula:** Subject + subject description + movement + scene + scene description + (camera language + lighting + atmosphere)

**Negative prompts:** Required for artifact control (morphing, warping, flickering).

**Key differentiators vs Kling:** More style-forward, cinematic aesthetic as first-class; less physics-simulation focused. Good for commercial/fashion/editorial video.

**File structure:** Same as other platform skills with examples, mistakes, scoringCriteria, chainOfThoughtExamples, refinementExamples.

---

## Section 2: Skills Registry (`skills/index.ts`)

### Interface change
```typescript
export interface PlatformSkill {
  platform: string;
  name: string;
  deprecated?: boolean;  // ← new
  examples: SkillExample[];
  // ... rest unchanged
}
```

### Registry changes
```typescript
// Add import:
import { skill as wan } from './video/wan';

// VIDEO_SKILLS:
const VIDEO_SKILLS: Record<string, PlatformSkill> = {
  runway,
  kling,
  sora,     // ← skill has deprecated: true; kept for API grace period
  veo,
  higgsfield,
  minimax,
  wan,      // ← new
  general: videoGeneral,
};
```

### Helper function (new)
```typescript
export function isDeprecated(type: 'image' | 'video' | 'text', platform: string): boolean {
  const skills = type === 'image' ? IMAGE_SKILLS : type === 'video' ? VIDEO_SKILLS : TEXT_SKILLS;
  return skills[platform]?.deprecated === true;
}
```

---

## Section 3: Audio Scoring Dimension

### New function in `scoring/prompt-dimensions.ts`

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

  // SFX (4pts): present with 2+ specific descriptors
  if (/^SFX:/m.test(t)) {
    const sfxLine = t.match(/^SFX:\s*(.+)/m)?.[1] ?? '';
    const count = (sfxLine.match(/[""][^""]+[""]/g) ?? []).length;
    if (count >= 2) { matched.push(`SFX (${count} צלילים)`); pts += 4; }
    else { matched.push('SFX קיים'); pts += 2; missing.push('SFX — הוסף 2+ תיאורי צליל'); }
  } else missing.push('SFX block חסר');

  // Ambient (4pts)
  if (/^Ambient:/m.test(t)) {
    matched.push('Ambient מוגדר');
    pts += 4;
  } else missing.push('Ambient block חסר');

  // Music (3pts)
  if (/^Music:/m.test(t)) {
    matched.push('Music מוגדר');
    pts += 3;
  } else missing.push('Music block חסר');

  return { key, maxPoints, tipHe, score: pts, matched, missing };
}
```

### Update `scoreEnhancedVisualDimensions`

```typescript
export function scoreEnhancedVisualDimensions(
  t: string,
  wordCount: number,
  isVideo: boolean,
  platform?: string,   // ← new optional param
): DimensionScoreChunk[] {
  const dims = [/* existing dims */];
  if (isVideo) dims.push(scoreVisualMotion(t));
  if (isVideo && platform && AUDIO_CAPABLE_PLATFORMS.has(platform)) {
    dims.push(scoreVideoAudio(t));
  }
  return dims;
}
```

### Label additions
```typescript
// In DIMENSION_LABEL_HE:
audio: "שמע",

// In TIPS:
audio: "הוסף בלוק Audio עם Dialogue, SFX, Ambient ו-Music",
```

---

## Section 4: Platform Engine / UI

Find where `scoreEnhancedVisualDimensions` is called in `image-engine.ts` / `video-engine.ts` and pass `platform` as the new optional argument. Also find the platform picker component and filter out deprecated platforms using `isDeprecated()`.

Specific changes:
- `video-engine.ts`: pass `platform` to scoring calls
- Platform picker UI: call `isDeprecated('video', platform)` to exclude Sora from selection
- Platform picker UI: include `wan` in the video platform list

---

## Verification

1. `npm run test` — `visual-engine-templates.test.ts` and `enhanced-scorer.test.ts` pass
2. `npm run typecheck` — no type errors (especially `deprecated?` field)
3. New test case in `enhanced-scorer.test.ts`:
   - Runway Gen-4.5 prompt WITH Audio block → `audio` dimension = 15/15
   - Same prompt WITHOUT Audio block → `audio` dimension = 0/15
4. `getVideoSkill('sora').deprecated === true`
5. `getVideoSkill('wan')` returns examples
6. Sora absent from video platform picker; Wan present
7. Midjourney prompts with `--cref` score correctly on composition dimension
