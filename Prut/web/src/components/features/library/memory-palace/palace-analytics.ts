import { analytics } from "@/lib/analytics";

type Viewport = "desktop" | "mobile";
type EdgeType = "similarity" | "cooccurrence" | "both";

function capture(event: string, props: Record<string, unknown>): void {
  if (typeof window !== "undefined" && analytics) {
    analytics.capture(event, props);
  }
}

export function trackPalaceOpened(opts: { viewport: Viewport; promptCount: number }): void {
  capture("palace_sidebar_opened", {
    viewport: opts.viewport,
    prompt_count: opts.promptCount,
  });
}

export function trackPalaceCollapsed(): void {
  capture("palace_sidebar_collapsed", {});
}

export function trackPalaceDrawerOpened(opts: { promptId: string }): void {
  capture("palace_drawer_opened", {
    prompt_id: opts.promptId,
    entry: "card_button",
  });
}

export function trackPalaceNodeClicked(opts: {
  fromId: string;
  toId: string;
  edgeType: EdgeType;
  hopIndex: number;
}): void {
  capture("palace_node_clicked", {
    from_id: opts.fromId,
    to_id: opts.toId,
    edge_type: opts.edgeType,
    hop_index: opts.hopIndex,
  });
}

export function trackPalaceNodeDoubleClicked(opts: { promptId: string }): void {
  capture("palace_node_double_clicked", { prompt_id: opts.promptId });
}

export function trackPalaceNavigated(opts: { promptId: string; fromNeighbor: boolean }): void {
  capture("palace_navigated_to_prompt", {
    via: "palace",
    from_neighbor: opts.fromNeighbor,
    prompt_id: opts.promptId,
  });
}

export function trackPalaceEmpty(
  reason: "no_selection" | "no_neighbors" | "too_few_prompts",
): void {
  capture("palace_empty_state_shown", { reason });
}
