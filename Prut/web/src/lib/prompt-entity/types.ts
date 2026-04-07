/**
 * PromptEntity — unified contract for any prompt-shaped record across Peroot.
 * Every UI surface that displays a prompt should consume this interface,
 * never raw Supabase rows. Adapters in ./adapters.ts convert table rows.
 */

export type PromptSource =
  | 'web'
  | 'extension'
  | 'api'
  | 'cron'
  | 'admin'
  | 'shared'
  | 'unknown';

export type PromptVisibility = 'private' | 'shared' | 'public';

/**
 * Optional score snapshot for a prompt. ScoreDelta uses `before`/`after`
 * to render the value-proof pill. `improvements` is an optional bullet list.
 */
export interface PromptScoreSnapshot {
  before: number | null;
  after: number;
  improvements?: string[];
}

export interface PromptEntity {
  /** Stable UUID across the source table. */
  id: string;
  /** Best human-readable label, e.g. "Marketing copy for X". May be empty. */
  title: string;
  /** Original user input before enhancement. May be empty for system prompts. */
  original: string;
  /** Enhanced/final prompt text. Required. */
  enhanced: string;
  /** Source table key — used by `bump_prompt_last_used` RPC whitelist. */
  table: 'history' | 'shared_prompts' | 'personal_library' | 'public_library_prompts' | 'ai_prompts';
  /** ISO timestamp when the row was created. Always present. */
  createdAt: string;
  /** ISO timestamp when the row was last mutated. May equal createdAt. */
  updatedAt: string;
  /** ISO timestamp when the row was last accessed/used. Null if never. */
  lastUsedAt: string | null;
  /** How the prompt entered the system. */
  source: PromptSource;
  /** Capability mode (STANDARD, DEEP_RESEARCH, IMAGE_GENERATION, ...). */
  mode: string;
  category: string;
  tone: string | null;
  /** Variable placeholders this prompt expects. */
  variables: string[];
  visibility: PromptVisibility;
  /** Optional score data for BeforeAfterSplit / ScoreDelta. */
  score?: PromptScoreSnapshot;
}
