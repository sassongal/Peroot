/**
 * AgentEngine systemPrompt purity — regression tests.
 *
 * Ensures AgentEngine.generate() does NOT leak meta-text from the STANDARD
 * prompt-enhancement flow (CO-STAR / RISEN / DOCUMENT_INTELLIGENCE /
 * "Enhanced Format"). Previously AgentEngine inherited the base
 * [GENIUS_ANALYSIS] block by calling super.generate(), which contradicted
 * its own "Output ONLY the complete system instruction" rule and caused
 * the Agent Builder mode to render meta-instructions in its visible output.
 *
 * Run with: pnpm vitest run src/lib/engines/__tests__/agent-engine-purity.test.ts
 */

import { describe, it, expect } from 'vitest';

import { CapabilityMode } from '@/lib/capability-mode';
import { AgentEngine } from '@/lib/engines/agent-engine';
import type { EngineInput } from '@/lib/engines/types';

function agentInput(overrides: Partial<EngineInput> = {}): EngineInput {
  return {
    prompt: 'בנה לי סוכן שיעזור למורים להכין מבחנים לתלמידי תיכון',
    tone: 'מקצועי',
    category: 'education',
    mode: CapabilityMode.AGENT_BUILDER,
    ...overrides,
  };
}

// Leakage markers: these strings only appear in the base STANDARD
// [GENIUS_ANALYSIS] block. If any of them show up in an AgentEngine
// systemPrompt, the agent template's "Output ONLY ..." rule is being
// contradicted and users will see meta-text in the streamed output.
const LEAKAGE_MARKERS = [
  'CO-STAR VALIDATION',
  'RISEN VALIDATION',
  'ANTI-HALLUCINATION',
  'DOCUMENT INTELLIGENCE',
  'זיהוי אוטומטי של סוג המסמך',
  'Enhanced Format (include priority, category',
];

// Markers that SHOULD appear — proves we still emit a well-formed agent
// template that downstream parsers (HomeClient, /api/enhance) can consume.
const REQUIRED_AGENT_MARKERS = [
  'Elite AI Systems Architect',
  'AGENT ARCHITECTURE FRAMEWORK',
  '[PROMPT_TITLE]',
  '[GENIUS_QUESTIONS]',
];

describe('AgentEngine — systemPrompt purity (no STANDARD leakage)', () => {
  describe('without attached context', () => {
    const engine = new AgentEngine();
    const out = engine.generate(agentInput());

    for (const marker of LEAKAGE_MARKERS) {
      it(`must NOT contain leakage marker: "${marker}"`, () => {
        expect(out.systemPrompt).not.toContain(marker);
      });
    }

    for (const marker of REQUIRED_AGENT_MARKERS) {
      it(`must contain agent marker: "${marker}"`, () => {
        expect(out.systemPrompt).toContain(marker);
      });
    }

    it('outputFormat is markdown', () => {
      expect(out.outputFormat).toBe('markdown');
    });

    it('TONE is filled in — no dangling "TONE: ." from empty tone', () => {
      expect(out.systemPrompt).not.toMatch(/TONE:\s*\.\s*$/m);
    });
  });

  describe('with empty tone (defensive default)', () => {
    const engine = new AgentEngine();
    const out = engine.generate(agentInput({ tone: '   ' }));

    it('does not leave "TONE: ." — applies a default tone instead', () => {
      expect(out.systemPrompt).not.toContain('TONE: .');
      expect(out.systemPrompt).toMatch(/TONE:\s*\S/);
    });
  });

  describe('with attached context (knowledge base)', () => {
    const engine = new AgentEngine();
    const out = engine.generate(
      agentInput({
        context: [
          {
            type: 'file',
            name: 'geography-syllabus.pdf',
            content: 'Chapter 1: Plate tectonics. Chapter 2: Climate zones.',
            format: 'pdf',
          },
        ],
      }),
    );

    for (const marker of LEAKAGE_MARKERS) {
      it(`context case — must NOT contain leakage marker: "${marker}"`, () => {
        expect(out.systemPrompt).not.toContain(marker);
      });
    }

    it('uses the agent-specific AGENT_KNOWLEDGE_BASE framing, not DOCUMENT_INTELLIGENCE', () => {
      expect(out.systemPrompt).toContain('AGENT_KNOWLEDGE_BASE');
      expect(out.systemPrompt).not.toContain('ATTACHED_CONTEXT —');
    });

    it('embeds the file content', () => {
      expect(out.systemPrompt).toContain('Plate tectonics');
    });

    it('still emits PROMPT_TITLE and GENIUS_QUESTIONS markers', () => {
      expect(out.systemPrompt).toContain('[PROMPT_TITLE]');
      expect(out.systemPrompt).toContain('[GENIUS_QUESTIONS]');
    });
  });
});
