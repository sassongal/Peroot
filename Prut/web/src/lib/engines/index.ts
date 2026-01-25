
import { CapabilityMode } from "../capability-mode";
import { PromptEngine, EngineConfig } from "./types";
import { StandardEngine } from "./standard-engine";
import { ResearchEngine } from "./research-engine";
import { ImageEngine } from "./image-engine";
import { AgentEngine } from "./agent-engine";
import { createClient } from "../supabase/server";

// Cache for engine configs to reduce DB hits
const engineCache: Record<string, { config: EngineConfig; timestamp: number }> = {};
const CACHE_TTL = 1000 * 60 * 5; // 5 minutes

export async function getEngine(mode: CapabilityMode): Promise<PromptEngine> {
  const now = Date.now();
  
  if (engineCache[mode] && (now - engineCache[mode].timestamp < CACHE_TTL)) {
    return createEngineInstance(mode, engineCache[mode].config);
  }

  const supabase = await createClient();
  
  // 1. Fetch Global Identity (Shared across all engines)
  const { data: globalIdentityRow } = await supabase
    .from('ai_prompts')
    .select('prompt')
    .eq('prompt_key', 'global_system_identity')
    .maybeSingle();
  
  const globalIdentity = globalIdentityRow?.prompt || "";

  // 2. Fetch Engine Specific Config
  const { data: config } = await supabase
    .from('prompt_engines')
    .select('*')
    .eq('mode', mode)
    .eq('is_active', true)
    .maybeSingle();

  const engineConfig: EngineConfig | undefined = config ? {
      mode: config.mode as CapabilityMode,
      name: config.name,
      description: config.description,
      system_prompt_template: config.system_prompt_template,
      user_prompt_template: config.user_prompt_template,
      output_format_instruction: config.output_format_instruction,
      default_params: config.default_params,
      is_active: config.is_active,
      id: config.id,
      global_system_identity: globalIdentity
  } : undefined;

  if (engineConfig) {
    engineCache[mode] = { config: engineConfig, timestamp: now };
  }

  return createEngineInstance(mode, engineConfig);
}

function createEngineInstance(mode: CapabilityMode, config?: EngineConfig): PromptEngine {
  switch (mode) {
    case CapabilityMode.DEEP_RESEARCH:
      return new ResearchEngine(config);
    case CapabilityMode.IMAGE_GENERATION:
      return new ImageEngine(config);
    case CapabilityMode.AGENT_BUILDER:
      return new AgentEngine(config);
    case CapabilityMode.STANDARD:
    default:
      return new StandardEngine(config);
  }
}

export function invalidateEngineCache(mode?: CapabilityMode) {
  if (mode) {
    delete engineCache[mode];
  } else {
    // Clear all
    Object.keys(engineCache).forEach(key => delete engineCache[key]);
  }
}

export * from "./types";
