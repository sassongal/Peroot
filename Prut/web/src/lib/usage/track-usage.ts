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
 * Fire-and-forget usage tracker. Errors are swallowed: usage tracking must
 * never break a user-facing flow.
 */
export async function trackUsage(promptId: string, source: UsageSource): Promise<void> {
  try {
    await fetch(`/api/prompts/${promptId}/track-usage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source, session_id: getSessionId() }),
      keepalive: true,
    });
  } catch {
    // intentional: usage tracking is best-effort
  }
}
