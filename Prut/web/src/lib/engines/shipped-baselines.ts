import { StandardEngine } from "./standard-engine";
import { ResearchEngine } from "./research-engine";
import { AgentEngine } from "./agent-engine";
import { getShippedImageEngineBaseline } from "./image-engine";
import { getShippedVideoEngineBaseline } from "./video-engine";
import type { EngineConfig } from "./types";

export type ShippedTemplates = Pick<
  EngineConfig,
  "system_prompt_template" | "user_prompt_template"
>;

function fromEngine(engine: object): ShippedTemplates {
  const { config } = engine as unknown as { config: EngineConfig };
  return {
    system_prompt_template: config.system_prompt_template,
    user_prompt_template: config.user_prompt_template,
  };
}

/**
 * The engine templates as shipped in code, one per capability mode.
 *
 * `getEngine()` prefers the `prompt_engines` row when one exists, so what
 * users get is the row, and the row has to be kept in step with these.
 * `scripts/sync-prompt-engines.ts` writes the migration that does that; the
 * admin drift view compares a row against this map.
 */
export function shippedEngineBaselines(): Record<string, ShippedTemplates> {
  return {
    STANDARD: fromEngine(new StandardEngine()),
    DEEP_RESEARCH: fromEngine(new ResearchEngine()),
    AGENT_BUILDER: fromEngine(new AgentEngine()),
    IMAGE_GENERATION: getShippedImageEngineBaseline(),
    VIDEO_GENERATION: getShippedVideoEngineBaseline(),
  };
}
