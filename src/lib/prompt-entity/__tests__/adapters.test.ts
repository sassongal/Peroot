import { describe, it, expect } from 'vitest';
import {
  fromHistoryRow,
  fromSharedPromptRow,
  fromPersonalLibraryRow,
  fromAiPromptRow,
  fromPublicLibraryRow,
} from '../adapters';

describe('PromptEntity adapters', () => {
  it('fromHistoryRow maps every required field', () => {
    const row = {
      id: '11111111-1111-1111-1111-111111111111',
      user_id: 'user-1',
      prompt: 'original text',
      enhanced_prompt: 'enhanced text',
      tone: 'formal',
      category: 'Marketing',
      title: 'My prompt',
      source: 'web',
      capability_mode: 'STANDARD',
      created_at: '2026-04-07T10:00:00.000Z',
      updated_at: '2026-04-07T10:05:00.000Z',
      last_used_at: '2026-04-07T11:00:00.000Z',
    };
    const entity = fromHistoryRow(row);
    expect(entity.id).toBe(row.id);
    expect(entity.title).toBe('My prompt');
    expect(entity.original).toBe('original text');
    expect(entity.enhanced).toBe('enhanced text');
    expect(entity.table).toBe('history');
    expect(entity.createdAt).toBe(row.created_at);
    expect(entity.updatedAt).toBe(row.updated_at);
    expect(entity.lastUsedAt).toBe(row.last_used_at);
    expect(entity.source).toBe('web');
    expect(entity.mode).toBe('STANDARD');
    expect(entity.category).toBe('Marketing');
    expect(entity.tone).toBe('formal');
    expect(entity.visibility).toBe('private');
  });

  it('fromHistoryRow tolerates missing optional fields', () => {
    const row = {
      id: '11111111-1111-1111-1111-111111111111',
      prompt: 'x',
      enhanced_prompt: 'y',
      created_at: '2026-04-07T10:00:00.000Z',
      updated_at: '2026-04-07T10:00:00.000Z',
    };
    const entity = fromHistoryRow(row);
    expect(entity.title).toBe('');
    expect(entity.tone).toBeNull();
    expect(entity.lastUsedAt).toBeNull();
    expect(entity.source).toBe('unknown');
    expect(entity.mode).toBe('STANDARD');
  });

  it('fromSharedPromptRow marks visibility as shared', () => {
    const row = {
      id: '22222222-2222-2222-2222-222222222222',
      prompt: 'final',
      original_input: 'orig',
      category: 'Sales',
      capability_mode: 'STANDARD',
      created_at: '2026-04-07T10:00:00.000Z',
      updated_at: '2026-04-07T10:00:00.000Z',
      last_used_at: null,
    };
    const entity = fromSharedPromptRow(row);
    expect(entity.table).toBe('shared_prompts');
    expect(entity.visibility).toBe('shared');
    expect(entity.original).toBe('orig');
    expect(entity.enhanced).toBe('final');
  });

  it('fromPersonalLibraryRow uses prompt as enhanced and empty as original', () => {
    const row = {
      id: '33333333-3333-3333-3333-333333333333',
      title: 'Saved',
      prompt: 'p',
      category: 'General',
      capability_mode: 'STANDARD',
      created_at: '2026-04-07T10:00:00.000Z',
      updated_at: '2026-04-07T10:00:00.000Z',
      last_used_at: '2026-04-07T11:00:00.000Z',
    };
    const entity = fromPersonalLibraryRow(row);
    expect(entity.table).toBe('personal_library');
    expect(entity.enhanced).toBe('p');
    expect(entity.original).toBe('');
    expect(entity.lastUsedAt).toBe(row.last_used_at);
  });

  it('fromPublicLibraryRow returns visibility public', () => {
    const row = {
      id: '44444444-4444-4444-4444-444444444444',
      title: 'Pub',
      prompt: 'p',
      category_id: 'cat',
      capability_mode: 'STANDARD',
      variables: ['x', 'y'],
      created_at: '2026-04-07T10:00:00.000Z',
      updated_at: '2026-04-07T10:00:00.000Z',
      last_used_at: null,
    };
    const entity = fromPublicLibraryRow(row);
    expect(entity.table).toBe('public_library_prompts');
    expect(entity.visibility).toBe('public');
    expect(entity.variables).toEqual(['x', 'y']);
  });

  it('fromAiPromptRow sets source admin', () => {
    const row = {
      id: '55555555-5555-5555-5555-555555555555',
      prompt_key: 'enhance.system.he',
      prompt: 'You are...',
      created_at: '2026-04-07T10:00:00.000Z',
      updated_at: '2026-04-07T10:00:00.000Z',
      last_used_at: null,
    };
    const entity = fromAiPromptRow(row);
    expect(entity.table).toBe('ai_prompts');
    expect(entity.source).toBe('admin');
    expect(entity.title).toBe('enhance.system.he');
  });
});
