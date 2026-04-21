import { CapabilityMode } from "@/lib/capability-mode";
import type { PersonalPrompt } from "@/lib/types";

export interface GraphNode {
  id: string;
  label: string;
  type: "prompt" | "category" | "library";
  // prompt nodes only
  size?: number;
  capability?: CapabilityMode;
  isFavorite?: boolean;
  isTemplate?: boolean;
  isRecentlyUsed?: boolean;
  successRate?: number; // 0–1, from success_count / total
  prompt?: PersonalPrompt;
  // runtime — force-graph mutates these
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number;
  fy?: number;
}

export interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  type: "category" | "tag" | "reference" | "template";
  strength?: number;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export const CAPABILITY_COLORS: Record<CapabilityMode, string> = {
  [CapabilityMode.STANDARD]: "#f59e0b", // amber
  [CapabilityMode.IMAGE_GENERATION]: "#a855f7", // purple
  [CapabilityMode.DEEP_RESEARCH]: "#3b82f6", // blue
  [CapabilityMode.AGENT_BUILDER]: "#22c55e", // green
  [CapabilityMode.VIDEO_GENERATION]: "#f97316", // orange
};

// Lighter highlight color for each capability (used in radial gradient)
export const CAPABILITY_HIGHLIGHT: Record<CapabilityMode, string> = {
  [CapabilityMode.STANDARD]: "#fde68a",
  [CapabilityMode.IMAGE_GENERATION]: "#d8b4fe",
  [CapabilityMode.DEEP_RESEARCH]: "#93c5fd",
  [CapabilityMode.AGENT_BUILDER]: "#86efac",
  [CapabilityMode.VIDEO_GENERATION]: "#fdba74",
};

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export function buildGraphData(prompts: PersonalPrompt[], favoriteIds: Set<string>): GraphData {
  const now = Date.now();
  const categorySet = new Set(prompts.map((p) => p.personal_category || "כללי"));
  const categories = [...categorySet];

  const nodes: GraphNode[] = [
    ...categories.map((cat) => ({
      id: `cat:${cat}`,
      label: cat,
      type: "category" as const,
    })),
    ...prompts.map((p) => {
      const lastUsed = p.last_used_at ? new Date(p.last_used_at).getTime() : null;
      const isRecentlyUsed = lastUsed !== null && now - lastUsed < SEVEN_DAYS_MS;
      const total = (p.success_count ?? 0) + (p.fail_count ?? 0);
      const successRate = total > 0 ? (p.success_count ?? 0) / total : undefined;
      return {
        id: p.id,
        label: p.title,
        type: "prompt" as const,
        size: Math.max(6, Math.min(16, (p.use_count ?? 0) + 6)),
        capability: p.capability_mode ?? CapabilityMode.STANDARD,
        isFavorite: favoriteIds.has(p.id) || !!p.is_pinned,
        isTemplate: !!p.is_template,
        isRecentlyUsed,
        successRate,
        prompt: p,
      };
    }),
  ];

  const links: GraphLink[] = [];

  // Prompt → category
  prompts.forEach((p) => {
    links.push({
      source: p.id,
      target: `cat:${p.personal_category || "כללי"}`,
      type: "category",
    });
  });

  // Shared-tag links — O(n²), fine for <500 prompts
  for (let i = 0; i < prompts.length; i++) {
    for (let j = i + 1; j < prompts.length; j++) {
      const tagsA = prompts[i].tags ?? [];
      const tagsB = prompts[j].tags ?? [];
      if (tagsA.length === 0 || tagsB.length === 0) continue;
      const sharedCount = tagsA.filter((t) => tagsB.includes(t)).length;
      if (sharedCount > 0) {
        links.push({
          source: prompts[i].id,
          target: prompts[j].id,
          type: "tag",
          strength: sharedCount,
        });
      }
    }
  }

  // Shared template variable links
  for (let i = 0; i < prompts.length; i++) {
    for (let j = i + 1; j < prompts.length; j++) {
      const varsA = prompts[i].template_variables ?? [];
      const varsB = prompts[j].template_variables ?? [];
      if (varsA.length === 0 || varsB.length === 0) continue;
      const sharedCount = varsA.filter((v) => varsB.includes(v)).length;
      if (sharedCount > 0) {
        links.push({
          source: prompts[i].id,
          target: prompts[j].id,
          type: "template",
          strength: sharedCount,
        });
      }
    }
  }

  // Library reference links
  const libNodeIds = new Set<string>();
  prompts
    .filter((p) => p.source === "library" && p.reference)
    .forEach((p) => {
      const refId = `lib:${p.reference}`;
      if (!libNodeIds.has(refId)) {
        nodes.push({ id: refId, label: "ספרייה", type: "library" });
        libNodeIds.add(refId);
      }
      links.push({ source: p.id, target: refId, type: "reference" });
    });

  return { nodes, links };
}
