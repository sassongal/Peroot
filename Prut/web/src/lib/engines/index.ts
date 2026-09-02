import { CapabilityMode, parseCapabilityMode } from "../capability-mode";
import { PromptEngine, EngineConfig } from "./types";
import { StandardEngine } from "./standard-engine";
import { ResearchEngine } from "./research-engine";
import { ImageEngine } from "./image-engine";
import { AgentEngine } from "./agent-engine";
import { VideoEngine } from "./video-engine";
import { createClient } from "../supabase/server";
import { buildStandardTemplates, hasNativeStandardTemplate } from "./standard-locales";

// Cache for engine configs to reduce DB hits
const engineCache: Record<string, { config: EngineConfig; timestamp: number }> = {};
const CACHE_TTL = 1000 * 60 * 5; // 5 minutes

/**
 * The engine for a mode, with the templates for the requested output
 * language.
 *
 * Hebrew (the default) uses the `prompt_engines` row. For the standard
 * engine in English, Arabic or Russian the row's Hebrew demonstrations are
 * replaced by the native templates in `standard-locales.ts` (languages spec
 * B3.5); the row's other fields, and the global identity, still apply. The
 * research and agent engines keep the Hebrew template plus the override.
 */
export async function getEngine(
  mode: CapabilityMode,
  outputLanguage?: string,
): Promise<PromptEngine> {
  const now = Date.now();
  const useNative = mode === CapabilityMode.STANDARD && hasNativeStandardTemplate(outputLanguage);
  const cacheKey = useNative ? `${mode}:${outputLanguage}` : mode;

  if (engineCache[cacheKey] && now - engineCache[cacheKey].timestamp < CACHE_TTL) {
    return createEngineInstance(mode, engineCache[cacheKey].config);
  }

  const supabase = await createClient();

  // 1. Fetch Global Identity (Shared across all engines)
  const { data: globalIdentityRow } = await supabase
    .from("ai_prompts")
    .select("prompt")
    .eq("prompt_key", "global_system_identity")
    .maybeSingle();

  const globalIdentity = globalIdentityRow?.prompt || "";

  // 2. Fetch Engine Specific Config
  //
  // The rows are keyed by the enum value itself ("STANDARD"), not the
  // lowercased form used for usage logging. This lookup used
  // capabilityModeToDbMode() until 2026-09-02, matched nothing, and every
  // engine silently ran on its code default while the admin editor edited
  // rows nobody read. scripts/sync-prompt-engines.ts keeps the rows in step
  // with the shipped templates so switching the lookup on changed nothing
  // for users except the global identity finally being injected.
  const { data: config } = await supabase
    .from("prompt_engines")
    .select("*")
    .eq("mode", mode)
    .eq("is_active", true)
    .maybeSingle();

  const nativeTemplates = useNative ? buildStandardTemplates(outputLanguage) : null;

  let engineConfig: EngineConfig | undefined = config
    ? {
        mode: parseCapabilityMode(config.mode),
        name: config.name,
        description: config.description,
        system_prompt_template:
          nativeTemplates?.system_prompt_template ?? config.system_prompt_template,
        user_prompt_template: nativeTemplates?.user_prompt_template ?? config.user_prompt_template,
        output_format_instruction: config.output_format_instruction,
        default_params: config.default_params,
        is_active: config.is_active,
        id: config.id,
        global_system_identity: globalIdentity,
      }
    : undefined;

  // No row (or the DB is unreachable): the native templates still apply on
  // top of the code default, so a Russian request never falls back to the
  // Hebrew demonstrations by accident.
  if (!engineConfig && nativeTemplates) {
    const fallback = createEngineInstance(mode) as unknown as { config: EngineConfig };
    engineConfig = {
      ...fallback.config,
      ...nativeTemplates,
      global_system_identity: globalIdentity,
    };
  }

  if (engineConfig) {
    engineCache[cacheKey] = { config: engineConfig, timestamp: now };
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
    case CapabilityMode.VIDEO_GENERATION:
      return new VideoEngine(config);
    case CapabilityMode.STANDARD:
    default:
      return new StandardEngine(config);
  }
}

export function invalidateEngineCache(mode?: CapabilityMode) {
  if (mode) {
    for (const key of Object.keys(engineCache)) {
      if (key === mode || key.startsWith(`${mode}:`)) delete engineCache[key];
    }
  } else {
    // Clear all
    Object.keys(engineCache).forEach((key) => delete engineCache[key]);
  }
}

export * from "./types";
export * from "./platform-overrides";
