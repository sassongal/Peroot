/**
 * Extended chain types for Auto Chain Builder.
 * These extend the base ChainStep/PromptChain from useChains.ts
 * with AI-generated metadata (variables, input_from_step, mode, etc.)
 */

export interface ChainVariable {
  name: string;
  label: string;
  default?: string;
}

export type ChainStepMode = "text" | "research" | "image" | "video" | "agent";

export interface GeneratedChainStep {
  step_number: number;
  title: string;
  mode: ChainStepMode;
  prompt: string;
  variables: ChainVariable[];
  input_from_step: number | null;
  output_description: string;
}

export interface GeneratedChain {
  chain_id: string;
  title: string;
  description: string;
  steps: GeneratedChainStep[];
}

export interface ChainGenerateRequest {
  goal: string;
  max_steps?: number;
  user_context?: {
    role?: string;
    recent_categories?: string[];
  };
}
