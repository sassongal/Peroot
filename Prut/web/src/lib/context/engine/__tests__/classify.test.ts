import { describe, it, expect } from 'vitest';
import { computeSha256, detectDocumentType } from '../classify';

describe('computeSha256', () => {
  it('returns stable hex for the same input', () => {
    const a = computeSha256('hello world');
    const b = computeSha256('hello world');
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });
  it('differs for different inputs', () => {
    expect(computeSha256('a')).not.toBe(computeSha256('b'));
  });
});

describe('detectDocumentType', () => {
  it('detects contract', () => {
    const t = 'הסכם בין הצדדים. סעיף 1: תשלום. סעיף 2: סודיות. כפוף לחוק הישראלי.';
    expect(detectDocumentType(t, 'contract.pdf', 'file')).toBe('חוזה משפטי');
  });
  it('detects academic paper', () => {
    const t = 'תקציר. מתודולוגיה. ממצאים. ביבליוגרפיה. מסקנות ועבודה עתידית.';
    expect(detectDocumentType(t, 'paper.pdf', 'file')).toBe('מאמר אקדמי');
  });
  it('detects marketing', () => {
    const t = 'קנה עכשיו. הצעה מוגבלת. הירשם היום. call to action. המוצר שישנה את חייך.';
    expect(detectDocumentType(t, 'landing.html', 'url')).toBe('דף שיווקי');
  });
  it('detects data table', () => {
    const t = 'CSV with 120 rows and 8 columns\nColumns: id, name, value';
    expect(detectDocumentType(t, 'data.csv', 'file')).toBe('טבלת נתונים');
  });
  it('detects source code', () => {
    const t = 'function foo() { return 42; }\nclass Bar extends Baz { }\nimport { x } from "y";';
    expect(detectDocumentType(t, 'code.ts', 'file')).toBe('קוד מקור');
  });
  it('detects image type for image inputs regardless of text', () => {
    expect(detectDocumentType('', 'photo.png', 'image')).toBe('תמונה');
  });
  it('falls back to generic for ambiguous text', () => {
    expect(detectDocumentType('שלום עולם זה טקסט רגיל', 'notes.txt', 'file')).toBe('generic');
  });
});
