
import { CapabilityMode } from "../capability-mode";

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
  modeParams?: Record<string, unknown>;
  previousResult?: string;
  refinementInstruction?: string;
  userHistory?: { title: string; prompt: string }[];
  userPersonality?: { tokens: string[]; brief?: string; format?: string };
}

export interface EngineOutput {
  systemPrompt: string;
  userPrompt: string;
  outputFormat: "json" | "markdown" | "text";
  requiredFields: string[];
  optionalInstructions?: string;
}

export interface PromptEngine {
  mode: CapabilityMode;
  generate(input: EngineInput): EngineOutput;
  generateRefinement(input: EngineInput): EngineOutput;
}
