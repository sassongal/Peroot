import { getApiPath } from "@/lib/api-path";

/**
 * Stable hash used as the dedup key for /api/prompt-usage telemetry.
 * Normalises whitespace and caps at 500 chars so hashes are consistent
 * across minor formatting differences.
 */
function getPromptKey(text: string): string {
  const normalized = text.trim().slice(0, 500);
  if (!normalized) return "empty";
  let hash = 0;
  for (let i = 0; i < normalized.length; i += 1) {
    hash = (hash * 31 + normalized.charCodeAt(i)) | 0;
  }
  return `${Math.abs(hash)}:${normalized.length}`;
}

/**
 * Fire-and-forget POST to /api/prompt-usage.
 * Records how users interact with prompts (copy / save / refine / enhance)
 * to inform content and scoring improvements.
 */
export function recordUsageSignal(
  type: "copy" | "save" | "refine" | "enhance",
  text: string,
): void {
  const target = text.trim();
  if (!target) return;
  const key = getPromptKey(target);
  void fetch(getApiPath("/api/prompt-usage"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt_key: key,
      event_type: type,
      prompt_length: target.length,
    }),
  }).catch(() => {});
}
