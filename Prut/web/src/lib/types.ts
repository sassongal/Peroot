import { CapabilityMode } from "./capability-mode";

type PromptUsage = {
  copies?: number;
  saves?: number;
  refinements?: number;
};

export interface Question {
  id: number;
  question: string;
  description: string;
  examples: string[];
}

/** Mode-specific parameters for IMAGE_GENERATION */
export interface ImageGenerationParams {
  aspect_ratio?: "1:1" | "16:9" | "9:16" | "4:3";
  style?: "natural" | "vivid" | "artistic";
}

/** Mode-specific parameters for AGENT_BUILDER */
export interface AgentBuilderParams {
  system_instructions: string;
}

/** Union type for all mode-specific parameters */
export type ModeParams = ImageGenerationParams | AgentBuilderParams;

export type PersonalPrompt = {
  id: string;
  title: string;
  prompt: string;
  category: string;
  personal_category: string | null;
  /** Defaults to STANDARD if not specified */
  capability_mode?: CapabilityMode;
  mode_params?: ModeParams;
  use_case: string;
  created_at: number | string; // Handle legacy numbers or ISO strings
  updated_at: number | string;
  use_count: number;
  source: "manual" | "library" | "imported";
  reference?: string; // ID if from library
  sort_index?: number;
  prompt_style?: string; // HTML with style tokens
  tags?: string[];
  last_used_at?: number | string | null;
  is_pinned?: boolean;
  success_count?: number;
  fail_count?: number;
  is_template?: boolean;
  template_description?: string;
  template_variables?: string[];
  original_prompt?: string;
  source_history_id?: string;
};

export type LibraryPrompt = {
  id: string;
  title: string;
  category: string;
  /** Defaults to STANDARD if not specified */
  capability_mode?: CapabilityMode;
  use_case: string;
  prompt: string;
  variables: string[];
  output_format: string;
  quality_checks: string[];
  preview_image_url?: string;
  source: {
    name: string;
    url: string;
    license: string;
    license_url: string;
    restricted: boolean;
    reference: string;
  };
  created_at?: string;
  updated_at?: string;
  last_used_at?: string | null;
};

interface Achievement {
  id: string;
  name_he: string;
  description_he: string;
  icon: string;
  category: string;
  points: number;
}

interface UserAchievement {
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
  achievement?: Achievement;
}
