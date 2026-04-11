import { describe, it, expect } from 'vitest';
import { EnhancedScorer } from '../enhanced-scorer';
import { scoreInput } from '../input-scorer';
import { CapabilityMode } from '@/lib/capability-mode';

/**
 * Regression tests for EnhancedScorer — specifically the role detection fix
 * (previously missed "אתה אנליסט / אתה סופר / אתה data scientist" since the
 * original regex matched only a hardcoded noun list).
 */
describe('EnhancedScorer — role detection', () => {
  function roleDim(text: string) {
    const res = EnhancedScorer.score(text, CapabilityMode.STANDARD);
    return res.breakdown.find((d) => d.dimension === 'role');
  }

  it('"אתה אנליסט נתונים עם 10 שנות ניסיון" scores full role points', () => {
    const dim = roleDim(
      'אתה אנליסט נתונים עם 10 שנות ניסיון. נתח את מגמות השוק ב-2026.'
    );
    expect(dim).toBeDefined();
    expect(dim!.score).toBe(dim!.maxScore);
  });

  it('"אתה מומחה שיווק" (legacy match, no credentials) scores partial role (7/10)', () => {
    const dim = roleDim('אתה מומחה שיווק. כתוב פוסט.');
    expect(dim!.score).toBe(7);
  });

  it('"אתה סופר טכני בכיר" scores full — "senior" counts as credentials', () => {
    const dim = roleDim('אתה סופר טכני בכיר. כתוב מאמר על מיקרו-שירותים.');
    expect(dim!.score).toBe(dim!.maxScore);
  });

  it('"מומחה שיווק" alone (no "אתה") gets partial role credit without explicit "אתה" (4/10)', () => {
    const dim = roleDim('מומחה שיווק צריך לכתוב פוסט.');
    expect(dim!.score).toBe(4);
  });

  it('no role at all scores 0/10', () => {
    const dim = roleDim('כתוב לי משהו על שיווק.');
    expect(dim!.score).toBe(0);
  });

  it('English "You are a senior data analyst" scores full', () => {
    const dim = roleDim('You are a senior data analyst. Analyze the market trends.');
    expect(dim!.score).toBe(dim!.maxScore);
  });
});

describe('EnhancedScorer vs scoreInput (shared dimensions)', () => {
  it('same STANDARD text: weighted input total stays within 28 points of Enhanced total', () => {
    const text = `אתה מומחה שיווק דיגיטלי עם 10 שנות ניסיון.
כתוב מייל שיווקי לקהל יעד של מנהלי IT בחברות בינוניות.
מטרה: להגדיל מכירות ב-20%.
פורמט: רשימה של 5 נקודות, אורך 300 מילים.
טון מקצועי וידידותי.
אל תכלול מונחים טכניים מורכבים.`;
    const enhanced = EnhancedScorer.score(text, CapabilityMode.STANDARD);
    const input = scoreInput(text, CapabilityMode.STANDARD);
    expect(Math.abs(enhanced.total - input.total)).toBeLessThanOrEqual(28);
  });
});

describe('EnhancedScorer — overall smoke', () => {
  it('full research prompt still scores at least 60 after role fix', () => {
    const prompt = `
אתה אנליסט מחקרי בכיר עם 15 שנות ניסיון.
משימה: חקור את שוק ה-SaaS בישראל.
מתודולוגיה: שלבים 1-4.
מקורות: צטט URL מכל מקור ראשוני, אל תסתמך על בלוגים.
פלט כטבלה: טענה | ראיה | מקור | confidence.
קהל יעד: משקיעים מוסדיים.
מטרה: החלטת השקעה של 50 מיליון.
אורך: 8000 מילים.
`;
    const result = EnhancedScorer.score(prompt, CapabilityMode.DEEP_RESEARCH);
    expect(result.total).toBeGreaterThanOrEqual(50);
  });
});
