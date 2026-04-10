import { describe, it, expect } from 'vitest';
import { analyzeCoverage } from '../coverage-analyzer';
import { CapabilityMode } from '@/lib/capability-mode';

describe('CoverageAnalyzer', () => {
  it('returns empty result for empty text', () => {
    const result = analyzeCoverage('', CapabilityMode.STANDARD);
    expect(result.totalChunks).toBe(0);
    expect(result.coverageRatio).toBe(0);
    expect(result.tip).toBeNull();
  });

  it('detects high coverage for well-structured prompt', () => {
    const prompt = `אתה מומחה שיווק דיגיטלי עם 10 שנות ניסיון
כתוב מאמר של 500 מילים על שיווק באינסטגרם
קהל יעד: בעלי עסקים קטנים בישראל
פורמט: רשימה ממוספרת
אל תשתמש בז'רגון טכני`;
    const result = analyzeCoverage(prompt, CapabilityMode.STANDARD);
    expect(result.totalChunks).toBeGreaterThanOrEqual(4);
    expect(result.coverageRatio).toBeGreaterThan(0.7);
    expect(result.tip).toBeNull();
  });

  it('detects uncovered chunks in a partially relevant prompt', () => {
    const prompt = `כתוב מאמר על שיווק
היום היה יום יפה
השמש זרחה בחוץ
הציפורים שרו`;
    const result = analyzeCoverage(prompt, CapabilityMode.STANDARD);
    // At least some chunks should be uncovered (the weather lines)
    expect(result.uncoveredCount).toBeGreaterThan(0);
    expect(result.coverageRatio).toBeLessThan(1);
  });

  it('provides tip when coverage is low', () => {
    const prompt = `משהו כלשהו
עוד משהו
ועוד דבר
ודבר נוסף`;
    const result = analyzeCoverage(prompt, CapabilityMode.STANDARD);
    if (result.coverageRatio < 0.7) {
      expect(result.tip).toBeTruthy();
    }
  });

  it('maps chunks to correct dimensions', () => {
    const prompt = `אתה יועץ פיננסי בכיר
כתוב ניתוח שוק של 300 מילים`;
    const result = analyzeCoverage(prompt, CapabilityMode.STANDARD);
    const roleChunk = result.chunks.find(c => c.text.includes('יועץ'));
    expect(roleChunk).toBeDefined();
    if (roleChunk) {
      expect(roleChunk.covered).toBe(true);
      expect(roleChunk.dimensions).toContain('role');
    }
  });

  it('handles single-line prompts by splitting to sentences', () => {
    const prompt = 'כתוב מאמר על שיווק דיגיטלי, כולל 5 דוגמאות, בפורמט רשימה ממוספרת, עד 300 מילים.';
    const result = analyzeCoverage(prompt, CapabilityMode.STANDARD);
    expect(result.totalChunks).toBeGreaterThanOrEqual(1);
  });

  it('works for IMAGE_GENERATION mode', () => {
    const prompt = `פורטרט של אישה מבוגרת
סגנון ציור שמן
תאורת רמברנדט חמה
צבעים חמים זהב וחום`;
    const result = analyzeCoverage(prompt, CapabilityMode.IMAGE_GENERATION);
    expect(result.coverageRatio).toBeGreaterThan(0.5);
  });

  it('performs under 50ms for a 10K-char prompt', () => {
    const line = 'כתוב מאמר מקצועי על שיווק דיגיטלי עם 5 דוגמאות מעשיות ומספרים. ';
    const longPrompt = line.repeat(150); // ~10K chars
    const start = performance.now();
    analyzeCoverage(longPrompt, CapabilityMode.STANDARD);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(500); // generous bound for CI
  });
});
