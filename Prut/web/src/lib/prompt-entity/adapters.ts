import type { PromptEntity, PromptSource } from './types';

type Row = Record<string, unknown>;

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

function strOrNull(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null;
}

function arr(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

function asSource(v: unknown): PromptSource {
  const allowed: PromptSource[] = ['web', 'extension', 'api', 'cron', 'admin', 'shared', 'unknown'];
  return (allowed as readonly string[]).includes(v as string) ? (v as PromptSource) : 'unknown';
}

export function fromHistoryRow(row: Row): PromptEntity {
  return {
    id: str(row.id),
    title: str(row.title),
    original: str(row.prompt),
    enhanced: str(row.enhanced_prompt),
    table: 'history',
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at, str(row.created_at)),
    lastUsedAt: strOrNull(row.last_used_at),
    source: asSource(row.source),
    mode: str(row.capability_mode, 'STANDARD'),
    category: str(row.category),
    tone: strOrNull(row.tone),
    variables: arr(row.variables),
    visibility: 'private',
  };
}

export function fromSharedPromptRow(row: Row): PromptEntity {
  return {
    id: str(row.id),
    title: str(row.title),
    original: str(row.original_input),
    enhanced: str(row.prompt),
    table: 'shared_prompts',
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at, str(row.created_at)),
    lastUsedAt: strOrNull(row.last_used_at),
    source: 'shared',
    mode: str(row.capability_mode, 'STANDARD'),
    category: str(row.category),
    tone: null,
    variables: [],
    visibility: 'shared',
  };
}

export function fromPersonalLibraryRow(row: Row): PromptEntity {
  return {
    id: str(row.id),
    title: str(row.title),
    original: '',
    enhanced: str(row.prompt),
    table: 'personal_library',
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at, str(row.created_at)),
    lastUsedAt: strOrNull(row.last_used_at),
    source: asSource(row.source),
    mode: str(row.capability_mode, 'STANDARD'),
    category: str(row.category),
    tone: null,
    variables: arr(row.template_variables ?? row.variables),
    visibility: 'private',
  };
}

export function fromPublicLibraryRow(row: Row): PromptEntity {
  return {
    id: str(row.id),
    title: str(row.title),
    original: '',
    enhanced: str(row.prompt),
    table: 'public_library_prompts',
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at, str(row.created_at)),
    lastUsedAt: strOrNull(row.last_used_at),
    source: 'admin',
    mode: str(row.capability_mode, 'STANDARD'),
    category: str(row.category_id ?? row.category),
    tone: null,
    variables: arr(row.variables),
    visibility: 'public',
  };
}

export function fromAiPromptRow(row: Row): PromptEntity {
  return {
    id: str(row.id),
    title: str(row.prompt_key),
    original: '',
    enhanced: str(row.prompt),
    table: 'ai_prompts',
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at, str(row.created_at)),
    lastUsedAt: strOrNull(row.last_used_at),
    source: 'admin',
    mode: 'STANDARD',
    category: 'system',
    tone: null,
    variables: [],
    visibility: 'private',
  };
}
