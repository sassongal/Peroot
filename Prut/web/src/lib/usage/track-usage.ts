import type { UsageSource } from "./usage-types";

const SESSION_KEY = "peroot_palace_session_id";

export function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

/**
 * Custom event dispatched after a successful usage track. Memory Palace
 * components listen for this to invalidate their cached `usageEvents` and
 * recompute neighborhoods without requiring a full remount.
 */
export const USAGE_TRACKED_EVENT = "peroot:usage-tracked";

/**
 * Fire-and-forget usage tracker. Errors are swallowed: usage tracking must
 * never break a user-facing flow.
 */
export async function trackUsage(promptId: string, source: UsageSource): Promise<void> {
  try {
    const res = await fetch(`/api/prompts/${promptId}/track-usage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source, session_id: getSessionId() }),
      keepalive: true,
    });
    if (res.ok && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(USAGE_TRACKED_EVENT, { detail: { promptId, source } }));
    }
  } catch {
    // intentional: usage tracking is best-effort
  }
}
