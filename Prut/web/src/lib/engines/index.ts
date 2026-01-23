
import { CapabilityMode } from "../capability-mode";
import { PromptEngine, EngineConfig } from "./types";
import { StandardEngine } from "./standard-engine";
import { ResearchEngine } from "./research-engine";
import { ImageEngine } from "./image-engine";
import { AgentEngine } from "./agent-engine";
import { createClient } from "../supabase/server";

// We need a way to get the active engine config.
// Since this runs in an API route (server-side), we can use createClient.

export async function getEngine(mode: CapabilityMode): Promise<PromptEngine> {
  const supabase = await createClient();
  
  // Try to fetch active config from DB
  const { data: config } = await supabase
    .from('prompt_engines')
    .select('*')
    .eq('mode', mode)
    .eq('is_active', true)
    .single();

  // If found, verify it matches EngineConfig shape roughly and use it.
  // The BaseEngine constructor takes EngineConfig.
  
  const engineConfig: EngineConfig | undefined = config ? {
      mode: config.mode as CapabilityMode,
      name: config.name,
      description: config.description,
      system_prompt_template: config.system_prompt_template,
      user_prompt_template: config.user_prompt_template,
      output_format_instruction: config.output_format_instruction,
      default_params: config.default_params,
      is_active: config.is_active,
      id: config.id
  } : undefined;

  switch (mode) {
    case CapabilityMode.DEEP_RESEARCH:
      return new ResearchEngine(engineConfig);
    case CapabilityMode.IMAGE_GENERATION:
      return new ImageEngine(engineConfig);
    case CapabilityMode.AGENT_BUILDER:
      return new AgentEngine(engineConfig);
    case CapabilityMode.STANDARD:
    default:
      return new StandardEngine(engineConfig);
  }
}

export * from "./types";
