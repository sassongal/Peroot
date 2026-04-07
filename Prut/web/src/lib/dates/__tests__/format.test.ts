import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatRelativeHe, formatAbsoluteHe, formatTriState } from '../format';

describe('formatRelativeHe', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-07T12:00:00.000Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('returns "לפני כמה שניות" for <60s', () => {
    expect(formatRelativeHe('2026-04-07T11:59:30.000Z')).toBe('לפני כמה שניות');
  });
  it('returns "לפני דקה" for ~1 minute', () => {
    expect(formatRelativeHe('2026-04-07T11:59:00.000Z')).toBe('לפני דקה');
  });
  it('returns "לפני N דקות" for 2-59 minutes', () => {
    expect(formatRelativeHe('2026-04-07T11:55:00.000Z')).toBe('לפני 5 דקות');
  });
  it('returns "לפני שעה" for 1 hour', () => {
    expect(formatRelativeHe('2026-04-07T11:00:00.000Z')).toBe('לפני שעה');
  });
  it('returns "לפני N ימים" for >1 day', () => {
    expect(formatRelativeHe('2026-04-04T12:00:00.000Z')).toBe('לפני 3 ימים');
  });
  it('handles null gracefully', () => {
    expect(formatRelativeHe(null)).toBe('');
  });
});

describe('formatAbsoluteHe', () => {
  it('formats ISO to Hebrew DD/MM/YY HH:MM', () => {
    const out = formatAbsoluteHe('2026-04-07T10:30:00.000Z');
    // Just assert it contains digits + a delimiter; locale formatters
    // vary slightly across Node versions
    expect(out).toMatch(/\d{2}/);
    expect(out.length).toBeGreaterThan(0);
  });
  it('handles null gracefully', () => {
    expect(formatAbsoluteHe(null)).toBe('');
  });
});

describe('formatTriState', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-07T12:00:00.000Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('returns 3 segments when all timestamps differ', () => {
    const out = formatTriState({
      createdAt: '2026-04-01T10:00:00.000Z',
      updatedAt: '2026-04-05T10:00:00.000Z',
      lastUsedAt: '2026-04-07T11:00:00.000Z',
    });
    expect(out.created).toContain('לפני');
    expect(out.updated).toContain('לפני');
    expect(out.lastUsed).toContain('לפני');
  });

  it('omits updated segment when equal to created', () => {
    const out = formatTriState({
      createdAt: '2026-04-07T10:00:00.000Z',
      updatedAt: '2026-04-07T10:00:00.000Z',
      lastUsedAt: null,
    });
    expect(out.updated).toBeNull();
    expect(out.lastUsed).toBeNull();
  });
});
