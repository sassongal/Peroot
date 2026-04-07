import { describe, it, expect } from 'vitest';
import { StandardEngine } from '@/lib/engines/standard-engine';
import { ResearchEngine } from '@/lib/engines/research-engine';
import { ImageEngine } from '@/lib/engines/image-engine';
import { AgentEngine } from '@/lib/engines/agent-engine';
import { CapabilityMode } from '@/lib/capability-mode';
import { EngineInput, EngineOutput } from '@/lib/engines/types';

// ── Helpers ──

function makeInput(overrides: Partial<EngineInput> = {}): EngineInput {
  return {
    prompt: 'כתוב מייל שיווקי לקהל יעד של מנהלי IT',
    tone: 'מקצועי',
    category: 'Marketing',
    mode: CapabilityMode.STANDARD,
    ...overrides,
  };
}

function containsHebrew(text: string): boolean {
  return /[\u0590-\u05FF]/.test(text);
}

// ── StandardEngine ──

describe('StandardEngine', () => {
  const engine = new StandardEngine();

  it('has STANDARD mode', () => {
    expect(engine.mode).toBe(CapabilityMode.STANDARD);
  });

  it('generate() returns systemPrompt and userPrompt', () => {
    const result = engine.generate(makeInput());
    expect(result.systemPrompt).toBeTruthy();
    expect(result.userPrompt).toBeTruthy();
  });

  it('generate() returns outputFormat "text"', () => {
    const result = engine.generate(makeInput());
    expect(result.outputFormat).toBe('text');
  });

  it('systemPrompt contains Hebrew text', () => {
    const result = engine.generate(makeInput());
    expect(containsHebrew(result.systemPrompt)).toBe(true);
  });

  it('userPrompt contains the user input', () => {
    const input = makeInput({ prompt: 'בדיקת טקסט ייחודי' });
    const result = engine.generate(input);
    expect(result.userPrompt).toContain('בדיקת טקסט ייחודי');
  });

  it('systemPrompt contains GENIUS_ANALYSIS section', () => {
    const result = engine.generate(makeInput());
    expect(result.systemPrompt).toContain('GENIUS_ANALYSIS');
  });

  it('systemPrompt contains GENIUS_QUESTIONS section', () => {
    const result = engine.generate(makeInput());
    expect(result.systemPrompt).toContain('GENIUS_QUESTIONS');
  });

  it('substitutes tone and category into templates', () => {
    const result = engine.generate(makeInput({ tone: 'ידידותי', category: 'Sales' }));
    expect(result.systemPrompt).toContain('ידידותי');
    expect(result.systemPrompt).toContain('Sales');
  });

  it('handles different tones', () => {
    const tones = ['מקצועי', 'ידידותי', 'רשמי', 'שיווקי'];
    for (const tone of tones) {
      const result = engine.generate(makeInput({ tone }));
      expect(result.systemPrompt).toContain(tone);
    }
  });

  it('handles different categories', () => {
    const categories = ['Marketing', 'Sales', 'Dev', 'HR', 'Education'];
    for (const category of categories) {
      const result = engine.generate(makeInput({ category }));
      expect(result.systemPrompt).toContain(category);
    }
  });
});

// ── ResearchEngine ──

describe('ResearchEngine', () => {
  const engine = new ResearchEngine();

  it('has DEEP_RESEARCH mode', () => {
    expect(engine.mode).toBe(CapabilityMode.DEEP_RESEARCH);
  });

  it('generate() returns outputFormat "markdown"', () => {
    const result = engine.generate(makeInput({ mode: CapabilityMode.DEEP_RESEARCH }));
    expect(result.outputFormat).toBe('markdown');
  });

  it('generate() returns required fields including citations and summary', () => {
    const result = engine.generate(makeInput({ mode: CapabilityMode.DEEP_RESEARCH }));
    expect(result.requiredFields).toContain('citations');
    expect(result.requiredFields).toContain('summary');
  });

  it('systemPrompt contains Hebrew text', () => {
    const result = engine.generate(makeInput({ mode: CapabilityMode.DEEP_RESEARCH }));
    expect(containsHebrew(result.systemPrompt)).toBe(true);
  });

  it('userPrompt contains user input', () => {
    const input = makeInput({ prompt: 'מחקר על בינה מלאכותית', mode: CapabilityMode.DEEP_RESEARCH });
    const result = engine.generate(input);
    expect(result.userPrompt).toContain('מחקר על בינה מלאכותית');
  });

  it('systemPrompt contains GENIUS_ANALYSIS section', () => {
    const result = engine.generate(makeInput({ mode: CapabilityMode.DEEP_RESEARCH }));
    expect(result.systemPrompt).toContain('GENIUS_ANALYSIS');
  });
});

// ── ImageEngine ──

describe('ImageEngine', () => {
  const engine = new ImageEngine();

  it('has IMAGE_GENERATION mode', () => {
    expect(engine.mode).toBe(CapabilityMode.IMAGE_GENERATION);
  });

  it('generate() returns outputFormat "text"', () => {
    const result = engine.generate(makeInput({ mode: CapabilityMode.IMAGE_GENERATION }));
    expect(result.outputFormat).toBe('text');
  });

  it('systemPrompt contains Hebrew text', () => {
    const result = engine.generate(makeInput({ mode: CapabilityMode.IMAGE_GENERATION }));
    expect(containsHebrew(result.systemPrompt)).toBe(true);
  });

  it('userPrompt contains user input', () => {
    const input = makeInput({ prompt: 'צור תמונה של נוף הרים', mode: CapabilityMode.IMAGE_GENERATION });
    const result = engine.generate(input);
    expect(result.userPrompt).toContain('צור תמונה של נוף הרים');
  });

  it('systemPrompt contains an internal quality-check section', () => {
    // ImageEngine uses a hidden <internal_quality_check> block instead of
    // the text-engine [GENIUS_ANALYSIS] marker. The purpose is identical:
    // force a silent pre-generation self-review. Image prompts are fed to
    // image models that would leak the marker into the rendered image.
    const result = engine.generate(makeInput({ mode: CapabilityMode.IMAGE_GENERATION }));
    expect(result.systemPrompt).toMatch(/internal_quality_check|GENIUS_ANALYSIS/);
  });
});

// ── AgentEngine ──

describe('AgentEngine', () => {
  const engine = new AgentEngine();

  it('has AGENT_BUILDER mode', () => {
    expect(engine.mode).toBe(CapabilityMode.AGENT_BUILDER);
  });

  it('generate() returns outputFormat "markdown"', () => {
    const result = engine.generate(makeInput({ mode: CapabilityMode.AGENT_BUILDER }));
    expect(result.outputFormat).toBe('markdown');
  });

  it('systemPrompt contains Hebrew text', () => {
    const result = engine.generate(makeInput({ mode: CapabilityMode.AGENT_BUILDER }));
    expect(containsHebrew(result.systemPrompt)).toBe(true);
  });

  it('userPrompt contains user input', () => {
    const input = makeInput({ prompt: 'בנה סוכן AI לשירות לקוחות', mode: CapabilityMode.AGENT_BUILDER });
    const result = engine.generate(input);
    expect(result.userPrompt).toContain('בנה סוכן AI לשירות לקוחות');
  });

  it('systemPrompt contains GENIUS_ANALYSIS section', () => {
    const result = engine.generate(makeInput({ mode: CapabilityMode.AGENT_BUILDER }));
    expect(result.systemPrompt).toContain('GENIUS_ANALYSIS');
  });
});

// ── Cross-Engine Tests ──

describe('All engines - common behavior', () => {
  const engines = [
    { name: 'StandardEngine', engine: new StandardEngine(), mode: CapabilityMode.STANDARD },
    { name: 'ResearchEngine', engine: new ResearchEngine(), mode: CapabilityMode.DEEP_RESEARCH },
    { name: 'ImageEngine', engine: new ImageEngine(), mode: CapabilityMode.IMAGE_GENERATION },
    { name: 'AgentEngine', engine: new AgentEngine(), mode: CapabilityMode.AGENT_BUILDER },
  ];

  for (const { name, engine, mode } of engines) {
    describe(name, () => {
      it('returns all required EngineOutput fields', () => {
        const result = engine.generate(makeInput({ mode }));
        expect(result).toHaveProperty('systemPrompt');
        expect(result).toHaveProperty('userPrompt');
        expect(result).toHaveProperty('outputFormat');
        expect(result).toHaveProperty('requiredFields');
        expect(typeof result.systemPrompt).toBe('string');
        expect(typeof result.userPrompt).toBe('string');
        expect(['json', 'markdown', 'text']).toContain(result.outputFormat);
        expect(Array.isArray(result.requiredFields)).toBe(true);
      });

      it('includes an internal quality-check section in systemPrompt', () => {
        // Text engines use [GENIUS_ANALYSIS]; image/video engines use
        // <internal_quality_check hidden="true"> because the prompt is fed
        // to a visual model that would render the marker literally.
        const result = engine.generate(makeInput({ mode }));
        expect(result.systemPrompt).toMatch(/GENIUS_ANALYSIS|internal_quality_check/);
      });

      it('includes GENIUS_QUESTIONS in systemPrompt', () => {
        const result = engine.generate(makeInput({ mode }));
        expect(result.systemPrompt).toContain('GENIUS_QUESTIONS');
      });

      it('systemPrompt contains Hebrew characters', () => {
        const result = engine.generate(makeInput({ mode }));
        expect(containsHebrew(result.systemPrompt)).toBe(true);
      });

      it('userPrompt contains the user input text', () => {
        const uniqueText = `טקסט_ייחודי_${name}_${Date.now()}`;
        const result = engine.generate(makeInput({ prompt: uniqueText, mode }));
        expect(result.userPrompt).toContain(uniqueText);
      });
    });
  }
});

// ── generateRefinement Tests ──

describe('generateRefinement()', () => {
  const engines = [
    { name: 'StandardEngine', engine: new StandardEngine() },
    { name: 'ResearchEngine', engine: new ResearchEngine() },
    { name: 'ImageEngine', engine: new ImageEngine() },
    { name: 'AgentEngine', engine: new AgentEngine() },
  ];

  for (const { name, engine } of engines) {
    describe(name, () => {
      it('returns valid output with previousResult', () => {
        const input = makeInput({
          previousResult: 'תוצאה קודמת: פרומפט ראשוני לבדיקה',
          refinementInstruction: 'שפר את הטון להיות יותר מקצועי',
        });
        const result = engine.generateRefinement(input);
        expect(result.systemPrompt).toBeTruthy();
        expect(result.userPrompt).toBeTruthy();
        expect(result.userPrompt).toContain('תוצאה קודמת');
      });

      it('throws error without previousResult', () => {
        const input = makeInput();
        expect(() => engine.generateRefinement(input)).toThrow('Previous result required');
      });

      it('includes answers in the userPrompt when provided', () => {
        const input = makeInput({
          previousResult: 'פרומפט קודם',
          answers: {
            '1': 'קהל היעד הוא מנהלי IT',
            '2': 'התקציב הוא 50,000 שקל',
          },
        });
        const result = engine.generateRefinement(input);
        expect(result.userPrompt).toContain('קהל היעד הוא מנהלי IT');
        expect(result.userPrompt).toContain('התקציב הוא 50,000 שקל');
      });

      it('uses default instruction when refinementInstruction is not provided', () => {
        const input = makeInput({
          previousResult: 'פרומפט קודם',
        });
        const result = engine.generateRefinement(input);
        // Should not crash and should return valid output
        expect(result.systemPrompt).toBeTruthy();
        expect(result.userPrompt).toBeTruthy();
      });

      it('includes GENIUS_QUESTIONS in systemPrompt', () => {
        const input = makeInput({
          previousResult: 'פרומפט קודם',
        });
        const result = engine.generateRefinement(input);
        expect(result.systemPrompt).toContain('GENIUS_QUESTIONS');
      });
    });
  }
});

// ── User History and Personality Injection ──

describe('User context injection', () => {
  const engine = new StandardEngine();

  it('injects user history into systemPrompt when provided', () => {
    const input = makeInput({
      userHistory: [
        { title: 'מייל שיווקי', prompt: 'כתוב מייל שיווקי מקצועי' },
        { title: 'פוסט לאינסטגרם', prompt: 'צור פוסט מעניין לאינסטגרם' },
      ],
    });
    const result = engine.generate(input);
    expect(result.systemPrompt).toContain('USER_STYLE_CONTEXT');
    expect(result.systemPrompt).toContain('מייל שיווקי');
    expect(result.systemPrompt).toContain('פוסט לאינסטגרם');
  });

  it('does not inject user history when empty', () => {
    const input = makeInput({ userHistory: [] });
    const result = engine.generate(input);
    expect(result.systemPrompt).not.toContain('USER_STYLE_CONTEXT');
  });

  it('injects user personality traits when provided', () => {
    const input = makeInput({
      userPersonality: {
        tokens: ['מקצועי', 'תמציתי', 'ממוקד'],
        brief: 'משתמש שמעדיף תוכן קצר וממוקד',
        format: 'רשימות עם כותרות',
      },
    });
    const result = engine.generate(input);
    expect(result.systemPrompt).toContain('USER_PERSONALITY_TRAITS');
    expect(result.systemPrompt).toContain('מקצועי');
    expect(result.systemPrompt).toContain('תמציתי');
    expect(result.systemPrompt).toContain('רשימות עם כותרות');
  });

  it('does not inject personality when not provided', () => {
    const input = makeInput();
    const result = engine.generate(input);
    expect(result.systemPrompt).not.toContain('USER_PERSONALITY_TRAITS');
  });
});

// ── Custom EngineConfig ──

describe('Custom EngineConfig', () => {
  it('uses custom templates when config is provided', () => {
    const customEngine = new StandardEngine({
      mode: CapabilityMode.STANDARD,
      name: 'Custom Engine',
      system_prompt_template: 'CUSTOM_SYSTEM: {{tone}} - {{category}}',
      user_prompt_template: 'CUSTOM_USER: {{input}}',
      global_system_identity: 'CUSTOM_IDENTITY',
    });

    const result = customEngine.generate(makeInput({ tone: 'רשמי', category: 'Legal' }));
    expect(result.systemPrompt).toContain('CUSTOM_SYSTEM: רשמי - Legal');
    expect(result.systemPrompt).toContain('CUSTOM_IDENTITY');
    expect(result.userPrompt).toContain('CUSTOM_USER:');
  });
});

// ── extractVariables ──

describe('BaseEngine.extractVariables()', () => {
  // We test via StandardEngine since BaseEngine is abstract
  const engine = new StandardEngine();

  it('extracts template variables correctly', () => {
    const vars = engine.extractVariables('Hello {{name}}, your {{role}} is {{task}}');
    expect(vars).toContain('name');
    expect(vars).toContain('role');
    expect(vars).toContain('task');
    expect(vars).toHaveLength(3);
  });

  it('deduplicates repeated variables', () => {
    const vars = engine.extractVariables('{{name}} and {{name}} again');
    expect(vars).toHaveLength(1);
    expect(vars).toContain('name');
  });

  it('returns empty array for no variables', () => {
    const vars = engine.extractVariables('No variables here');
    expect(vars).toHaveLength(0);
  });
});
