export type UsageSource = "library" | "graph" | "search" | "chain";

export interface PromptUsageEvent {
  id: string;
  user_id: string;
  prompt_id: string;
  used_at: string;
  session_id: string | null;
  source: UsageSource;
}

export interface TrackUsagePayload {
  source: UsageSource;
  session_id?: string;
}
