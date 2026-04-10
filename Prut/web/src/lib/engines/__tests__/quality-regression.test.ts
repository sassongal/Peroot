/**
 * Quality Regression Tests
 *
 * Lock in baseline quality for the Peroot prompt engines so that:
 * 1. Skill-file edits cannot silently regress prompt scoring.
 * 2. Engine system prompts always inject the expected skill blocks
 *    (ADDITIONAL EXAMPLES, COMMON MISTAKES, internal_quality_check).
 * 3. Smart category selection still routes Hebrew concepts to the right examples.
 *
 * Run with: pnpm vitest run src/lib/engines/__tests__/quality-regression.test.ts
 */

import { describe, it, expect } from 'vitest';

import { CapabilityMode } from '@/lib/capability-mode';
import { EnhancedScorer } from '@/lib/engines/scoring/enhanced-scorer';
import { StandardEngine } from '@/lib/engines/standard-engine';
import { ResearchEngine } from '@/lib/engines/research-engine';
import { AgentEngine } from '@/lib/engines/agent-engine';
import { ImageEngine } from '@/lib/engines/image-engine';
import { VideoEngine } from '@/lib/engines/video-engine';
import {
  getExamplesBlock,
  getImageSkill,
  getVideoSkill,
  type PlatformSkill,
} from '@/lib/engines/skills';
import { getTextQualityGateLines } from '@/lib/engines/scoring/prompt-dimensions';

// Skill registries (reach in directly so we can iterate every skill in one test)
import { skill as midjourney } from '@/lib/engines/skills/image/midjourney';
import { skill as dalle } from '@/lib/engines/skills/image/dalle';
import { skill as flux } from '@/lib/engines/skills/image/flux';
import { skill as stableDiffusion } from '@/lib/engines/skills/image/stable-diffusion';
import { skill as imagen } from '@/lib/engines/skills/image/imagen';
import { skill as geminiImage } from '@/lib/engines/skills/image/gemini-image';
import { skill as imageGeneral } from '@/lib/engines/skills/image/general';
import { skill as runway } from '@/lib/engines/skills/video/runway';
import { skill as kling } from '@/lib/engines/skills/video/kling';
import { skill as sora } from '@/lib/engines/skills/video/sora';
import { skill as veo } from '@/lib/engines/skills/video/veo';
import { skill as higgsfield } from '@/lib/engines/skills/video/higgsfield';
import { skill as minimax } from '@/lib/engines/skills/video/minimax';
import { skill as videoGeneral } from '@/lib/engines/skills/video/general';
import { skill as standardSkill } from '@/lib/engines/skills/text/standard';
import { skill as researchSkill } from '@/lib/engines/skills/text/research';
import { skill as agentSkill } from '@/lib/engines/skills/text/agent';

import {
  badTextFixtures,
  weakTextFixtures,
  mediumTextFixtures,
  strongTextFixtures,
  eliteTextFixtures,
  badVisualFixtures,
  strongVisualFixtures,
  strongVideoFixtures,
} from './quality-fixtures';

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

const ALL_SKILLS: Array<{ name: string; skill: PlatformSkill }> = [
  // image (7)
  { name: 'image/midjourney', skill: midjourney },
  { name: 'image/dalle', skill: dalle },
  { name: 'image/flux', skill: flux },
  { name: 'image/stable-diffusion', skill: stableDiffusion },
  { name: 'image/imagen', skill: imagen },
  { name: 'image/gemini-image', skill: geminiImage },
  { name: 'image/general', skill: imageGeneral },
  // video (7)
  { name: 'video/runway', skill: runway },
  { name: 'video/kling', skill: kling },
  { name: 'video/sora', skill: sora },
  { name: 'video/veo', skill: veo },
  { name: 'video/higgsfield', skill: higgsfield },
  { name: 'video/minimax', skill: minimax },
  { name: 'video/general', skill: videoGeneral },
  // text (3)
  { name: 'text/standard', skill: standardSkill },
  { name: 'text/research', skill: researchSkill },
  { name: 'text/agent', skill: agentSkill },
];

function makeInput(overrides: Record<string, unknown> = {}) {
  return {
    prompt: 'כתוב מייל שיווקי לקהל יעד של מנהלי IT',
    tone: 'מקצועי',
    category: 'Marketing',
    mode: CapabilityMode.STANDARD,
    ...overrides,
  } as const as Parameters<StandardEngine['generate']>[0];
}

// ────────────────────────────────────────────────────────────────────────────
// EnhancedScorer — baseline regression
// ────────────────────────────────────────────────────────────────────────────

describe('EnhancedScorer — baseline prompts', () => {
  describe('known-bad prompts (must score VERY low)', () => {
    for (const fx of badTextFixtures) {
      it(`"${fx.name}" stays in [${fx.minScore}, ${fx.maxScore}]`, () => {
        const result = EnhancedScorer.score(fx.prompt, CapabilityMode.STANDARD);
        expect(result.total).toBeGreaterThanOrEqual(fx.minScore);
        expect(result.total).toBeLessThanOrEqual(fx.maxScore);
      });
    }

    it('empty prompt returns level "low" with no breakdown', () => {
      const result = EnhancedScorer.score('', CapabilityMode.STANDARD);
      expect(result.total).toBe(0);
      expect(result.level).toBe('low');
      expect(result.breakdown).toHaveLength(0);
      expect(result.strengths).toHaveLength(0);
    });
  });

  describe('weak prompts (some signal but missing core dimensions)', () => {
    for (const fx of weakTextFixtures) {
      it(`"${fx.name}" stays in [${fx.minScore}, ${fx.maxScore}]`, () => {
        const result = EnhancedScorer.score(fx.prompt, CapabilityMode.STANDARD);
        expect(result.total).toBeGreaterThanOrEqual(fx.minScore);
        expect(result.total).toBeLessThanOrEqual(fx.maxScore);
        expect(result.level === 'low' || result.level === 'medium').toBe(true);
      });
    }
  });

  describe('medium prompts (3-5 dimensions populated)', () => {
    for (const fx of mediumTextFixtures) {
      it(`"${fx.name}" stays in [${fx.minScore}, ${fx.maxScore}]`, () => {
        const result = EnhancedScorer.score(fx.prompt, CapabilityMode.STANDARD);
        expect(result.total).toBeGreaterThanOrEqual(fx.minScore);
        expect(result.total).toBeLessThanOrEqual(fx.maxScore);
      });
    }
  });

  describe('strong RISEN prompts (must score high)', () => {
    for (const fx of strongTextFixtures) {
      it(`"${fx.name}" reaches >= ${fx.minScore}`, () => {
        const result = EnhancedScorer.score(fx.prompt, CapabilityMode.STANDARD);
        expect(result.total).toBeGreaterThanOrEqual(fx.minScore);
        expect(['high', 'elite']).toContain(result.level);
        expect(result.strengths.length).toBeGreaterThan(0);
      });
    }
  });

  describe('elite CO-STAR prompts (must reach elite tier)', () => {
    for (const fx of eliteTextFixtures) {
      it(`"${fx.name}" reaches >= ${fx.minScore}`, () => {
        const result = EnhancedScorer.score(fx.prompt, CapabilityMode.STANDARD);
        expect(result.total).toBeGreaterThanOrEqual(fx.minScore);
        // Elite or high — at minimum the strongest tier should activate
        expect(['high', 'elite']).toContain(result.level);
        expect(result.strengths.length).toBeGreaterThanOrEqual(2);
      });
    }
  });
});

// ────────────────────────────────────────────────────────────────────────────
// EnhancedScorer — visual mode baseline
// ────────────────────────────────────────────────────────────────────────────

describe('EnhancedScorer — visual mode prompts', () => {
  for (const fx of badVisualFixtures) {
    it(`weak visual "${fx.name}" stays below ${fx.maxScore + 1}`, () => {
      const result = EnhancedScorer.score(fx.prompt, CapabilityMode.IMAGE_GENERATION);
      expect(result.total).toBeLessThanOrEqual(fx.maxScore);
      expect(result.level).toBe('low');
    });
  }

  for (const fx of strongVisualFixtures) {
    it(`detailed visual "${fx.name}" reaches >= ${fx.minScore}`, () => {
      const result = EnhancedScorer.score(fx.prompt, CapabilityMode.IMAGE_GENERATION);
      expect(result.total).toBeGreaterThanOrEqual(fx.minScore);
      expect(['high', 'elite']).toContain(result.level);
    });
  }

  for (const fx of strongVideoFixtures) {
    it(`detailed video "${fx.name}" reaches >= ${fx.minScore} and exercises motion dim`, () => {
      const result = EnhancedScorer.score(fx.prompt, CapabilityMode.VIDEO_GENERATION);
      expect(result.total).toBeGreaterThanOrEqual(fx.minScore);
      // Video mode must include the video-only motion dimension
      const motionDim = result.breakdown.find(d => d.dimension === 'motion');
      expect(motionDim).toBeDefined();
      expect(motionDim!.score).toBeGreaterThan(0);
    });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// EnhancedScorer — dimension-level regressions
// ────────────────────────────────────────────────────────────────────────────

describe('EnhancedScorer — dimension behaviour', () => {
  it('penalises hedge words on the clarity dimension', () => {
    const hedged = EnhancedScorer.score(
      'אולי תכתוב מייל. נסה להיות מקצועי. אפשר ייתכן לפעמים maybe perhaps',
      CapabilityMode.STANDARD,
    );
    const direct = EnhancedScorer.score(
      'כתוב מייל מקצועי לקהל יעד של מנהלי IT',
      CapabilityMode.STANDARD,
    );
    const hedgedClarity = hedged.breakdown.find(d => d.dimension === 'clarity')!;
    const directClarity = direct.breakdown.find(d => d.dimension === 'clarity')!;
    expect(hedgedClarity.score).toBeLessThan(directClarity.score);
    expect(hedgedClarity.missing.some(m => m.includes('hedge'))).toBe(true);
  });

  it('detects the CO-STAR framework when its keywords are present', () => {
    const costar = EnhancedScorer.score(
      'Context: SaaS startup. Objective: write a marketing email. Style: persuasive narrative. Tone: friendly. Audience: CTOs at fintech. Response format: 200 word markdown bullet list with subject line.',
      CapabilityMode.STANDARD,
    );
    const frameworkDim = costar.breakdown.find(d => d.dimension === 'framework')!;
    expect(frameworkDim.score).toBeGreaterThanOrEqual(7);
    expect(frameworkDim.matched.some(m => m.includes('CO-STAR'))).toBe(true);
  });

  it('returns populated strengths and weaknesses for a mid-tier prompt', () => {
    const result = EnhancedScorer.score(
      'אתה מומחה שיווק עם 10 שנות ניסיון. כתוב מייל שיווקי לקהל יעד של מנהלי IT, פורמט bullet list, אורך 200 מילים, טון מקצועי.',
      CapabilityMode.STANDARD,
    );
    expect(result.breakdown.length).toBeGreaterThan(0);
    expect(result.strengths.length).toBeGreaterThan(0);
    expect(result.topWeaknesses.length).toBeGreaterThan(0);
    expect(result.estimatedImpact).toBeTruthy();
  });

  it('text mode exposes 15 dimensions, visual mode exposes 7-8 visual ones', () => {
    const textScore = EnhancedScorer.score('כתוב מייל מקצועי', CapabilityMode.STANDARD);
    const imageScore = EnhancedScorer.score('a portrait of a woman', CapabilityMode.IMAGE_GENERATION);
    const videoScore = EnhancedScorer.score('a portrait of a woman walking', CapabilityMode.VIDEO_GENERATION);

    expect(textScore.breakdown).toHaveLength(15);
    // Image mode = visual dims minus video-only "motion" = 7
    expect(imageScore.breakdown).toHaveLength(7);
    // Video mode includes the motion dim = 8
    expect(videoScore.breakdown).toHaveLength(8);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// EnhancedScorer — anti-gaming signals (added 2026-04-08)
// These tests prove that the 3 new penalty signals fire on prompts that
// would have looked artificially strong under the old scorer.
// ────────────────────────────────────────────────────────────────────────────

describe('EnhancedScorer — anti-gaming penalties', () => {
  it('penalizes buzzword inflation when 3+ vague superlatives appear without concrete specs', () => {
    const bloated = `אתה מומחה מקצועי ברמה הגבוהה ביותר. כתוב תוכן מקיף, איכותי ומצוין שיהיה world-class ו-premium. צור משהו innovative ו-comprehensive שיהיה state-of-the-art.`;
    const concrete = `אתה מומחה. כתוב תוכן ב-200 מילים בדיוק, ב-5 נקודות, עם מספרים ספציפיים.`;

    const bloatedScore = EnhancedScorer.score(bloated, CapabilityMode.STANDARD);
    const concreteScore = EnhancedScorer.score(concrete, CapabilityMode.STANDARD);

    const bloatedClarity = bloatedScore.breakdown.find(d => d.dimension === 'clarity');
    const concreteClarity = concreteScore.breakdown.find(d => d.dimension === 'clarity');

    expect(bloatedClarity).toBeDefined();
    expect(concreteClarity).toBeDefined();
    // The bloated version (5+ buzzwords, no concrete spec) must score
    // strictly LOWER on clarity than the concrete version (zero buzzwords).
    expect(bloatedClarity!.score).toBeLessThan(concreteClarity!.score);
    // And the bloated version should explicitly call out the inflation.
    expect(bloatedClarity!.missing.some(m => m.includes('buzzword inflation'))).toBe(true);
  });

  it('penalizes contradictions: brevity + high word count', () => {
    // Both prompts have the SAME safety scaffolding (out-of-scope marker
    // + edge-case marker + fallback) so the safety dim has a non-zero
    // base. The contradictory version then has its base reduced by the
    // brevity-vs-1500 contradiction.
    const safetyBase = 'מחוץ לתחום: לא לעסוק בפוליטיקה. מקרה קצה: אם המידע חסר, אם אין נתון אז ציין.';
    const contradictory = `אתה כותב מאמרים. כתוב פוסט קצר מאוד, בדיוק 1500 מילים. ${safetyBase}`;
    const consistent = `אתה כותב מאמרים. כתוב פוסט מפורט של 1500 מילים. ${safetyBase}`;

    const contradictoryScore = EnhancedScorer.score(contradictory, CapabilityMode.STANDARD);
    const consistentScore = EnhancedScorer.score(consistent, CapabilityMode.STANDARD);

    const contradictorySafety = contradictoryScore.breakdown.find(d => d.dimension === 'safety');
    const consistentSafety = consistentScore.breakdown.find(d => d.dimension === 'safety');

    expect(contradictorySafety!.score).toBeLessThan(consistentSafety!.score);
    expect(contradictorySafety!.missing.some(m => m.includes('contradiction'))).toBe(true);
  });

  it('rewards task-relevant numbers more than free-floating numbers in specificity', () => {
    const taskRelevant = 'אתה מומחה. כתוב 200 מילים על הנושא, ב-5 נקודות. למשל: "כותרת". Apple Inc.';
    const freeFloating = 'אתה מומחה. כתוב על הנושא בשנת 2026. למשל: "כותרת". Apple Inc.';

    const taskScore = EnhancedScorer.score(taskRelevant, CapabilityMode.STANDARD);
    const freeScore = EnhancedScorer.score(freeFloating, CapabilityMode.STANDARD);

    const taskSpec = taskScore.breakdown.find(d => d.dimension === 'specificity');
    const freeSpec = freeScore.breakdown.find(d => d.dimension === 'specificity');

    expect(taskSpec!.score).toBeGreaterThan(freeSpec!.score);
    // Task-relevant should report the new label
    expect(taskSpec!.matched.some(m => m.includes('task-relevant'))).toBe(true);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Engine system prompts — must always inject skill blocks
// ────────────────────────────────────────────────────────────────────────────

describe('Engine system prompts — skill block injection', () => {
  describe('StandardEngine', () => {
    const engine = new StandardEngine();
    const out = engine.generate(makeInput());

    it('injects ADDITIONAL EXAMPLES block', () => {
      expect(out.systemPrompt).toContain('ADDITIONAL EXAMPLES');
    });
    it('injects COMMON MISTAKES block', () => {
      expect(out.systemPrompt).toContain('COMMON MISTAKES');
    });
    it('wraps scoring criteria in <internal_quality_check>', () => {
      expect(out.systemPrompt).toContain('<internal_quality_check');
      expect(out.systemPrompt).toContain('UNIFIED PROMPT QUALITY CHECKLIST');
    });
  });

  describe('ResearchEngine', () => {
    const engine = new ResearchEngine();
    const out = engine.generate(makeInput({
      mode: CapabilityMode.DEEP_RESEARCH,
      prompt: 'מחקר על שוק ה-AI בישראל',
    }));

    it('injects ADDITIONAL EXAMPLES block', () => {
      expect(out.systemPrompt).toContain('ADDITIONAL EXAMPLES');
    });
    it('injects COMMON MISTAKES block', () => {
      expect(out.systemPrompt).toContain('COMMON MISTAKES');
    });
    it('wraps scoring criteria in <internal_quality_check>', () => {
      expect(out.systemPrompt).toContain('<internal_quality_check');
    });
  });

  describe('AgentEngine', () => {
    const engine = new AgentEngine();
    const out = engine.generate(makeInput({
      mode: CapabilityMode.AGENT_BUILDER,
      prompt: 'בנה סוכן AI לשירות לקוחות',
    }));

    it('injects ADDITIONAL EXAMPLES block', () => {
      expect(out.systemPrompt).toContain('ADDITIONAL EXAMPLES');
    });
    it('injects COMMON MISTAKES block', () => {
      expect(out.systemPrompt).toContain('COMMON MISTAKES');
    });
    it('wraps scoring criteria in <internal_quality_check>', () => {
      expect(out.systemPrompt).toContain('<internal_quality_check');
    });
  });

  describe('ImageEngine — platform-specific markers', () => {
    const engine = new ImageEngine();

    it('Midjourney prompt contains --ar parameter guidance', () => {
      const out = engine.generate(makeInput({
        mode: CapabilityMode.IMAGE_GENERATION,
        prompt: 'a portrait of a woman',
        modeParams: { image_platform: 'midjourney' },
      }));
      expect(out.systemPrompt).toContain('--ar');
      expect(out.systemPrompt).toContain('Midjourney');
      expect(out.systemPrompt).toContain('ADDITIONAL EXAMPLES');
      expect(out.systemPrompt).toContain('COMMON MISTAKES');
    });

    it('DALL-E prompt mentions GPT Image / DALL-E branding', () => {
      const out = engine.generate(makeInput({
        mode: CapabilityMode.IMAGE_GENERATION,
        prompt: 'a portrait of a woman',
        modeParams: { image_platform: 'dalle' },
      }));
      expect(out.systemPrompt).toMatch(/DALL-E|GPT Image/);
      expect(out.systemPrompt).toContain('ADDITIONAL EXAMPLES');
      expect(out.systemPrompt).toContain('COMMON MISTAKES');
    });

    it('Flux prompt mentions FLUX-specific guidance', () => {
      const out = engine.generate(makeInput({
        mode: CapabilityMode.IMAGE_GENERATION,
        prompt: 'a portrait of a woman',
        modeParams: { image_platform: 'flux' },
      }));
      expect(out.systemPrompt).toMatch(/FLUX/);
      expect(out.systemPrompt).toContain('ADDITIONAL EXAMPLES');
    });

    it('General image prompt contains GENIUS_QUESTIONS scaffold', () => {
      const out = engine.generate(makeInput({
        mode: CapabilityMode.IMAGE_GENERATION,
        prompt: 'a portrait of a woman',
      }));
      expect(out.systemPrompt).toContain('GENIUS_QUESTIONS');
      expect(out.systemPrompt).toContain('<internal_quality_check');
    });
  });

  describe('VideoEngine — platform-specific markers', () => {
    const engine = new VideoEngine();

    it('Veo prompt covers required Audio section guidance', () => {
      const out = engine.generate(makeInput({
        mode: CapabilityMode.VIDEO_GENERATION,
        prompt: 'cooking show',
        modeParams: { video_platform: 'veo' },
      }));
      expect(out.systemPrompt).toContain('Audio');
      expect(out.systemPrompt).toContain('ADDITIONAL EXAMPLES');
      expect(out.systemPrompt).toContain('COMMON MISTAKES');
    });

    it('Sora prompt mentions structured cinematography format', () => {
      const out = engine.generate(makeInput({
        mode: CapabilityMode.VIDEO_GENERATION,
        prompt: 'cinematic chase scene',
        modeParams: { video_platform: 'sora' },
      }));
      expect(out.systemPrompt).toMatch(/Sora|Cinematography|cinematic/i);
      expect(out.systemPrompt).toContain('ADDITIONAL EXAMPLES');
    });

    it('Runway prompt mentions camera movement directive', () => {
      const out = engine.generate(makeInput({
        mode: CapabilityMode.VIDEO_GENERATION,
        prompt: 'a person walking through a city',
        modeParams: { video_platform: 'runway' },
      }));
      expect(out.systemPrompt).toMatch(/camera|movement/i);
      expect(out.systemPrompt).toContain('<internal_quality_check');
    });

    it('General video prompt always includes quality check + GENIUS_QUESTIONS', () => {
      const out = engine.generate(makeInput({
        mode: CapabilityMode.VIDEO_GENERATION,
        prompt: 'a sunset timelapse',
      }));
      expect(out.systemPrompt).toContain('<internal_quality_check');
      expect(out.systemPrompt).toContain('GENIUS_QUESTIONS');
    });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Skill integrity — quick sanity checks across every skill file
// ────────────────────────────────────────────────────────────────────────────

describe('Skill integrity — every registered skill', () => {
  it('registers exactly 17 skills (7 image + 7 video + 3 text)', () => {
    expect(ALL_SKILLS).toHaveLength(17);
  });

  for (const { name, skill } of ALL_SKILLS) {
    describe(name, () => {
      it('has at least 5 examples', () => {
        expect(skill.examples.length).toBeGreaterThanOrEqual(5);
      });

      it('has at least 3 mistakes', () => {
        expect(skill.mistakes).toBeDefined();
        expect(skill.mistakes!.length).toBeGreaterThanOrEqual(3);
      });

      it('has at least 4 scoring criteria (file + canonical lines for text modes)', () => {
        expect(skill.scoringCriteria).toBeDefined();
        const isText = name.startsWith('text/');
        if (isText) {
          const merged = getTextQualityGateLines().length + (skill.scoringCriteria?.length ?? 0);
          expect(merged).toBeGreaterThanOrEqual(4);
        } else {
          expect(skill.scoringCriteria!.length).toBeGreaterThanOrEqual(4);
        }
      });

      it('every example has non-empty concept and output', () => {
        for (const ex of skill.examples) {
          expect(ex.concept.trim().length).toBeGreaterThan(0);
          expect(ex.output.trim().length).toBeGreaterThan(0);
        }
      });

      it('every mistake has non-empty bad/good/why fields', () => {
        for (const m of skill.mistakes!) {
          expect(m.bad.trim().length).toBeGreaterThan(0);
          expect(m.good.trim().length).toBeGreaterThan(0);
          expect(m.why.trim().length).toBeGreaterThan(0);
        }
      });

      it('exposes platform identifier and display name', () => {
        expect(skill.platform).toBeTruthy();
        expect(skill.name).toBeTruthy();
      });
    });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// Smart category selection — Hebrew concepts must route to the right examples
// ────────────────────────────────────────────────────────────────────────────

describe('Smart example selection', () => {
  it('Hebrew "פורטרט" routes to portrait-tagged examples for midjourney', () => {
    const block = getExamplesBlock('image', 'midjourney', 'פורטרט של אישה צעירה', 3);
    expect(block).toContain('ADDITIONAL EXAMPLES');

    // Verify the actually-selected examples skew toward portrait
    const skill = getImageSkill('midjourney')!;
    const portraitExamples = skill.examples.filter(ex => ex.category === 'portrait');
    expect(portraitExamples.length).toBeGreaterThan(0);

    // The selected block must mention at least one of the portrait concepts
    const matchedAny = portraitExamples.some(ex => block.includes(ex.concept));
    expect(matchedAny).toBe(true);
  });

  it('Hebrew "מחקר שוק" routes to research-market examples for the research engine', () => {
    const block = getExamplesBlock('text', 'research', 'מחקר שוק על הקוסמטיקה הישראלית', 3);
    expect(block).toContain('ADDITIONAL EXAMPLES');

    // The research skill must contain at least one research-market example AND
    // it should appear in the selected block.
    const marketKeywords = ['שוק', 'market'];
    const hasMarketContent = marketKeywords.some(kw => block.includes(kw));
    expect(hasMarketContent).toBe(true);
  });

  it('Hebrew "ינשוף" without category match still returns a diverse fallback sample', () => {
    // No CATEGORY_KEYWORDS entry covers "ינשוף" (owl) directly, so this should
    // exercise the fallback path. It must not throw and must return 3 examples.
    const block = getExamplesBlock('video', 'veo', 'ינשוף לבן צד עכבר בשדה', 3);
    expect(block).toContain('ADDITIONAL EXAMPLES');

    // The block should contain exactly 3 example markers ("Example 1:", "Example 2:", "Example 3:")
    expect(block.match(/Example 1:/g)?.length).toBe(1);
    expect(block.match(/Example 2:/g)?.length).toBe(1);
    expect(block.match(/Example 3:/g)?.length).toBe(1);
  });

  it('every video skill resolves via getVideoSkill helper', () => {
    const platforms = ['runway', 'kling', 'sora', 'veo', 'higgsfield', 'minimax', 'general'];
    for (const p of platforms) {
      const skill = getVideoSkill(p);
      expect(skill, `getVideoSkill("${p}") returned undefined`).toBeDefined();
      expect(skill!.examples.length).toBeGreaterThanOrEqual(5);
    }
  });
});
