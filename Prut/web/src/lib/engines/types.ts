
import { CapabilityMode } from "../capability-mode";

export type TargetModel = 'chatgpt' | 'claude' | 'gemini' | 'general';

export interface EngineConfig {
  id?: string;
  mode: CapabilityMode;
  name: string;
  description?: string;
  system_prompt_template: string;
  user_prompt_template: string;
  output_format_instruction?: string;
  default_params?: Record<string, unknown>;
  is_active?: boolean;
  global_system_identity?: string;
}

export interface EngineInput {
  prompt: string;
  tone: string;
  category: string;
  mode: CapabilityMode;
  modeParams?: Record<string, string>;
  previousResult?: string;
  refinementInstruction?: string;
  answers?: Record<string, string>;
  /**
   * Examples of prior prompts to seed the model with the user's style.
   * `enhanced` is the gold (post-Peroot) version when available — when
   * present we show the model "before → after" pairs, which teach the
   * desired transformation, not just the user's raw style.
   */
  userHistory?: { title: string; prompt: string; enhanced?: string }[];
  userPersonality?: { tokens: string[]; brief?: string; format?: string };
  /** Which refinement round this is (1 = first refinement, 2 = second, etc.) */
  iteration?: number;
  /** Target model for prompt optimization */
  targetModel?: TargetModel;
  /** Force output language — overrides the engine's default (Hebrew) */
  outputLanguage?: "hebrew" | "english";
  /** Context attachments (files, URLs, images) */
  context?: Array<{
    type: 'file' | 'url' | 'image';
    name: string;
    content: string;
    format?: string;
    filename?: string;
    url?: string;
    description?: string;
  }>;
}

/**
 * Telemetry about which personalization layers were injected into the
 * system prompt for a single enhance call. Logged to activity_logs.details
 * so we can A/B-test memory layers post-hoc and prove (or disprove) their
 * impact on the EnhancedScorer score before investing in pgvector.
 */
export interface InjectionStats {
  /** L3 — `user_style_personality` was injected */
  personalityInjected: boolean;
  /** L2 — number of historical examples injected (0-3) */
  historyCount: number;
  /** Whether the historical examples included before→after pairs */
  historyHasEnhanced: boolean;
  /** Source of the historical examples for A/B comparison */
  historySource: 'use_count' | 'recent_history' | 'none';
  /** Approximate added token cost (rough char/4 estimate) */
  approxAddedTokens: number;
}

export interface EngineOutput {
  systemPrompt: string;
  userPrompt: string;
  outputFormat: "json" | "markdown" | "text";
  requiredFields: string[];
  optionalInstructions?: string;
  /**
   * Optional telemetry about personalization layers injected. Set by
   * BaseEngine.injectContext; consumed by /api/enhance for activity_logs.
   */
  injectionStats?: InjectionStats;
}

export interface PromptEngine {
  mode: CapabilityMode;
  generate(input: EngineInput): EngineOutput;
  generateRefinement(input: EngineInput): EngineOutput;
}
