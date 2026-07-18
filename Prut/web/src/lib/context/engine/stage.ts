import type { ProcessingStage } from "./types";

/**
 * The coarse readiness a ProcessingStage projects to — the single home of the
 * "warning counts as ready" rule (an enrich failure still yields a usable block).
 *
 * Client-safe: this module imports only a type, so React can import it directly
 * (the engine's index.ts pulls node:crypto / redis and cannot be imported there).
 * Before this existed, the stage→readiness mapping was re-derived in three UI
 * places (useContextAttachments ×2, StageProgressBar) plus cache.ts.
 */
export function blockStatus(stage: ProcessingStage): "pending" | "ready" | "error" {
  switch (stage) {
    case "error":
      return "error";
    case "ready":
    case "warning":
      return "ready";
    default: // "uploading" | "extracting" | "enriching"
      return "pending";
  }
}
