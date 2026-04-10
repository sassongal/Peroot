import { describe, it, expect } from 'vitest';
import { resolveRole, renderRoleBlock, DOCUMENT_TYPE_TO_ROLE } from '../role-mapper';

describe('resolveRole', () => {
  it('returns the role for a single type', () => {
    expect(resolveRole(['מאמר אקדמי']).role).toBe('חוקר בתחום התוכן');
  });
  it('picks highest priority (legal > marketing)', () => {
    expect(resolveRole(['דף שיווקי', 'חוזה משפטי']).role).toBe('יועץ משפטי בכיר');
  });
  it('falls back to generic when nothing matches', () => {
    expect(resolveRole([]).role).toBe(DOCUMENT_TYPE_TO_ROLE['generic'].role);
  });
});

describe('renderRoleBlock', () => {
  it('returns a Hebrew pre-injection block', () => {
    const out = renderRoleBlock(['חוזה משפטי']);
    expect(out).toContain('התאמת מומחה');
    expect(out).toContain('יועץ משפטי בכיר');
  });
});
