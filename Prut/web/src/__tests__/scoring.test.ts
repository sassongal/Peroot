import { describe, it, expect } from 'vitest';
import { BaseEngine } from '@/lib/engines/base-engine';

describe('BaseEngine.scorePrompt()', () => {
  // ── Empty Input ──
  it('returns score 0 and level "empty" for empty string', () => {
    const result = BaseEngine.scorePrompt('');
    expect(result.score).toBe(0);
    expect(result.level).toBe('empty');
  });

  it('returns score 0 and level "empty" for whitespace-only string', () => {
    const result = BaseEngine.scorePrompt('   \n\t  ');
    expect(result.score).toBe(0);
    expect(result.level).toBe('empty');
  });

  // ── Low Score (under 30) ──
  it('scores low (under 30) for a very short Hebrew prompt', () => {
    const result = BaseEngine.scorePrompt('כתוב מייל');
    expect(result.score).toBeLessThan(30);
    expect(result.level).toBe('low');
  });

  it('scores low for a minimal English prompt', () => {
    const result = BaseEngine.scorePrompt('write email');
    expect(result.score).toBeLessThan(30);
    expect(result.level).toBe('low');
  });

  // ── Medium Score (40-70) ──
  it('scores medium for a Hebrew prompt with task, audience, and specificity', () => {
    // A prompt needs task + audience + more detail to reach medium (40+)
    const result = BaseEngine.scorePrompt('כתוב מייל שיווקי לקהל יעד של מנהלי IT בחברות טכנולוגיה, כולל 3 נקודות מפתח בטון מקצועי');
    expect(result.score).toBeGreaterThanOrEqual(40);
    expect(result.score).toBeLessThan(70);
    expect(result.level).toBe('medium');
  });

  it('scores low-to-borderline for a short Hebrew prompt with task + audience only', () => {
    // Without format, constraints, specificity -- stays low even with task + audience
    const result = BaseEngine.scorePrompt('כתוב מייל שיווקי לקהל יעד של מנהלי IT');
    expect(result.score).toBeGreaterThanOrEqual(25);
    expect(result.score).toBeLessThan(45);
    expect(result.level).toBe('low');
  });

  // ── High Score (70+) ──
  it('scores high for a full prompt with role, task, context, format, constraints', () => {
    const fullPrompt = `אתה מומחה שיווק דיגיטלי עם 10 שנות ניסיון.
כתוב מייל שיווקי לקהל יעד של מנהלי IT בחברות בינוניות.
המטרה היא להגדיל מכירות ב-20%.
הפורמט: רשימה של 5 נקודות מפתח, אורך 300 מילים.
טון מקצועי וידידותי.
אל תכלול מונחים טכניים מורכבים.
דוגמה לפלט: "שלום [שם], אנחנו שמחים להציג..."`;

    const result = BaseEngine.scorePrompt(fullPrompt);
    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(result.level).toBe('high');
  });

  it('scores well for a detailed English prompt', () => {
    const result = BaseEngine.scorePrompt(
      'Write a marketing email for IT managers, 500 words, professional tone, include CTA, avoid jargon'
    );
    expect(result.score).toBeGreaterThanOrEqual(30);
    // Should hit: task, context (audience), specificity (numbers), format (words), constraints (tone, avoid)
  });

  // ── Specificity Points (numbers) ──
  it('awards specificity points for prompts with numbers', () => {
    const withNumbers = BaseEngine.scorePrompt('כתוב רשימה של 5 טיפים לשיפור מכירות ב-2024');
    const withoutNumbers = BaseEngine.scorePrompt('כתוב רשימה של טיפים לשיפור מכירות');
    expect(withNumbers.score).toBeGreaterThan(withoutNumbers.score);
  });

  // ── Constraint Points (negative constraints) ──
  it('awards constraint points for negative constraints', () => {
    const withConstraints = BaseEngine.scorePrompt('כתוב מאמר על שיווק דיגיטלי. אל תכלול מונחים טכניים');
    const withoutConstraints = BaseEngine.scorePrompt('כתוב מאמר על שיווק דיגיטלי');
    expect(withConstraints.score).toBeGreaterThan(withoutConstraints.score);
  });

  // ── Format Points ──
  it('awards format points for format specifications like "טבלה" or "רשימה"', () => {
    const withFormat = BaseEngine.scorePrompt('כתוב סיכום בפורמט טבלה עם 3 עמודות');
    const withoutFormat = BaseEngine.scorePrompt('כתוב סיכום');
    expect(withFormat.score).toBeGreaterThan(withoutFormat.score);
  });

  it('awards format points for length specifications', () => {
    const withLength = BaseEngine.scorePrompt('כתוב מאמר קצר של 200 מילים');
    const withoutLength = BaseEngine.scorePrompt('כתוב מאמר');
    expect(withLength.score).toBeGreaterThan(withoutLength.score);
  });

  // ── Channel Points ──
  it('awards channel points for platform mentions like "אינסטגרם"', () => {
    const withChannel = BaseEngine.scorePrompt('כתוב פוסט לאינסטגרם על מוצר חדש');
    const withoutChannel = BaseEngine.scorePrompt('כתוב פוסט על מוצר חדש');
    expect(withChannel.score).toBeGreaterThan(withoutChannel.score);
  });

  it('awards channel points for "מייל"', () => {
    const result = BaseEngine.scorePrompt('כתוב מייל מקצועי ללקוח');
    // "מייל" triggers both the channel dimension and potentially the task dimension
    expect(result.score).toBeGreaterThan(0);
  });

  it('awards channel points for English platform names', () => {
    const withLinkedIn = BaseEngine.scorePrompt('write a linkedin post about AI trends');
    const withoutPlatform = BaseEngine.scorePrompt('write a post about AI trends');
    expect(withLinkedIn.score).toBeGreaterThan(withoutPlatform.score);
  });

  // ── Tips ──
  it('returns at most 3 tips', () => {
    const result = BaseEngine.scorePrompt('כתוב מייל');
    expect(result.tips.length).toBeLessThanOrEqual(3);
    expect(result.tips.length).toBeGreaterThan(0);
  });

  it('returns no tips for empty input', () => {
    const result = BaseEngine.scorePrompt('');
    expect(result.tips).toHaveLength(0);
  });

  // ── Score Cap ──
  it('never exceeds 100', () => {
    const massivePrompt = `אתה מומחה שיווק דיגיטלי בכיר עם 15 שנות ניסיון בקמפיינים B2B SaaS.
כתוב מייל שיווקי לקהל יעד של מנהלי IT בחברות Fortune 500.
המטרה היא להגדיל מכירות ב-30% ברבעון הקרוב.
הפורמט: טבלה עם 5 סעיפים, אורך 500 מילים, כולל כותרת ותקציר.
טון מקצועי, ידידותי, סמכותי. שפה: בעברית.
אל תכלול מונחים טכניים מורכבים, אסור להשתמש בסלנג.
דוגמה לפלט: "שלום [שם], אנחנו שמחים להציג..."
---
1. פתיחה חזקה
2. הצעת ערך
3. הוכחה חברתית
לאינסטגרם ולינקדאין`;

    const result = BaseEngine.scorePrompt(massivePrompt);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  // ── Usage Boost ──
  it('returns usageBoost based on word count', () => {
    const short = BaseEngine.scorePrompt('כתוב מייל');
    expect(short.usageBoost).toBe(0);

    const medium = BaseEngine.scorePrompt(
      'כתוב מייל שיווקי מקצועי לקהל יעד של מנהלי IT בחברות טכנולוגיה עם דגש על חדשנות ופתרונות ענן'
    );
    expect(medium.usageBoost).toBeGreaterThanOrEqual(1);
  });

  // ── Labels ──
  it('returns correct Hebrew labels per level', () => {
    const empty = BaseEngine.scorePrompt('');
    expect(empty.label).toBe('חסר');

    const low = BaseEngine.scorePrompt('כתוב מייל');
    expect(low.label).toBe('חלש');
  });

  // ── Role Detection ──
  it('awards role points for explicit role assignment', () => {
    const withRole = BaseEngine.scorePrompt('אתה מומחה שיווק. כתוב פוסט');
    const withoutRole = BaseEngine.scorePrompt('כתוב פוסט');
    expect(withRole.score).toBeGreaterThan(withoutRole.score);
  });

  it('awards role points for English role patterns', () => {
    const withRole = BaseEngine.scorePrompt('You are a marketing expert. Write an email for customers');
    const withoutRole = BaseEngine.scorePrompt('Write an email for customers');
    expect(withRole.score).toBeGreaterThan(withoutRole.score);
  });

  // ── Context Detection ──
  it('awards context points for audience mentions', () => {
    const withAudience = BaseEngine.scorePrompt('כתוב מאמר עבור לקוחות חדשים');
    const withoutAudience = BaseEngine.scorePrompt('כתוב מאמר');
    expect(withAudience.score).toBeGreaterThan(withoutAudience.score);
  });

  it('awards context points for goal/purpose mentions', () => {
    const withGoal = BaseEngine.scorePrompt('כתוב מאמר כדי להגדיל מכירות');
    const withoutGoal = BaseEngine.scorePrompt('כתוב מאמר');
    expect(withGoal.score).toBeGreaterThan(withoutGoal.score);
  });

  // ── Structure Detection ──
  it('awards structure points for prompts with line breaks and lists', () => {
    const structured = BaseEngine.scorePrompt(`כתוב מאמר על שיווק:
1. מבוא
2. גוף
3. סיכום`);
    const flat = BaseEngine.scorePrompt('כתוב מאמר על שיווק עם מבוא גוף וסיכום');
    expect(structured.score).toBeGreaterThan(flat.score);
  });

  // ── Examples Detection ──
  it('awards example points for prompts mentioning examples', () => {
    const withExample = BaseEngine.scorePrompt('כתוב מאמר על שיווק. דוגמה לפלט: "שיווק דיגיטלי הוא..."');
    const withoutExample = BaseEngine.scorePrompt('כתוב מאמר על שיווק');
    expect(withExample.score).toBeGreaterThan(withoutExample.score);
  });
});
