import { logger } from "@/lib/logger";
import { enqueueJob } from "@/lib/jobs/queue";
import type { createServiceClient } from "@/lib/supabase/service";
import type { ActivityLogDetails } from "./activity-log";

type QueryClient = ReturnType<typeof createServiceClient>;

export interface SaveEnhanceResultsParams {
  queryClient: QueryClient;
  userId: string;
  prompt: string;
  enhancedPrompt: string;
  tone: string;
  category: string;
  capabilityMode: string | undefined;
  inputSource: "text" | "file" | "url" | "image";
  /** 'api' = prk_ key, 'extension' = bearer JWT, 'web' = session cookie */
  source: "api" | "extension" | "web";
  isRefinement: boolean;
  activityLogDetails: ActivityLogDetails;
}

/**
 * Writes the enhance result to `history` and `activity_logs`.
 * Called from within `after()` so errors must be swallowed (best-effort).
 */
export async function saveEnhanceResults(params: SaveEnhanceResultsParams): Promise<void> {
  const {
    queryClient,
    userId,
    prompt,
    enhancedPrompt,
    tone,
    category,
    capabilityMode,
    inputSource,
    source,
    isRefinement,
    activityLogDetails,
  } = params;

  await queryClient
    .from("history")
    .insert({
      user_id: userId,
      prompt,
      enhanced_prompt: enhancedPrompt,
      tone,
      category,
      capability_mode: capabilityMode || "STANDARD",
      title: prompt.slice(0, 60),
      source,
      input_source: inputSource,
      updated_at: new Date().toISOString(),
    })
    .then(({ error: histErr }) => {
      if (histErr) logger.warn("[Enhance] History insert failed:", histErr.message);
    });

  await queryClient
    .from("activity_logs")
    .insert({
      user_id: userId,
      action: isRefinement ? "Prmpt Refine" : "Prmpt Enhance",
      entity_type: "prompt",
      details: activityLogDetails,
    })
    .then(({ error: actErr }) => {
      if (actErr) logger.warn("[Enhance] Activity log insert failed:", actErr.message);
    });
}

/**
 * Triggers background jobs after a successful enhance:
 * - style_analysis every 20 enhances
 * - achievement_check on every enhance
 */
export async function maybeEnqueueBackgroundJobs(
  queryClient: QueryClient,
  userId: string,
): Promise<void> {
  try {
    const { count } = await queryClient
      .from("activity_logs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .in("action", ["Prmpt Enhance", "Prmpt Refine"]);

    if (count && count % 20 === 0) {
      await enqueueJob("style_analysis", { userId });
    }

    await enqueueJob("achievement_check", { userId });
  } catch (bgError) {
    logger.error("[EnhanceAPI] Error enqueuing background jobs:", bgError);
  }
}
