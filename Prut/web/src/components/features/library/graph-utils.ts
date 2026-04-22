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
  // Spatial grouping hint for force layout — categories pull related prompts together
  // without needing a visible hub node.
  groupId?: string;
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
  type: "category" | "tag" | "reference" | "template" | "similarity" | "capability" | "temporal";
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

const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_EDGES_PER_PROMPT = 6;

// Stopwords we strip before building keyword similarity edges. Short Hebrew
// connectives + a handful of English fillers. Kept intentionally small — the
// ≥3-char filter removes most noise on its own.
const STOPWORDS = new Set([
  // Hebrew
  "של",
  "על",
  "עם",
  "כמו",
  "מה",
  "זה",
  "זו",
  "היא",
  "הוא",
  "הם",
  "הן",
  "אני",
  "אתה",
  "אתם",
  "אנחנו",
  "יש",
  "אין",
  "לא",
  "כן",
  "אבל",
  "אם",
  "כי",
  "גם",
  "רק",
  "עוד",
  "כל",
  "כמה",
  "איך",
  "איפה",
  "מתי",
  "למה",
  "את",
  "וגם",
  "אז",
  "לכן",
  "לפי",
  "בין",
  "כדי",
  "לפני",
  "אחרי",
  "מאוד",
  "צריך",
  "יכול",
  "פרומפט",
  "prompt",
  // English
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "your",
  "you",
  "have",
  "about",
  "into",
  "will",
  "are",
  "was",
  "were",
  "can",
  "any",
  "all",
  "not",
  "but",
  "please",
]);

function tokenize(text: string): string[] {
  if (!text) return [];
  // Split on whitespace + punctuation; keep Hebrew (\u0590-\u05FF) and
  // Latin letters + digits. Strip Hebrew niqqud (\u05B0-\u05C7) first.
  return text
    .toLowerCase()
    .replace(/[\u05B0-\u05C7]/g, "")
    .split(/[^\u0590-\u05FFa-z0-9]+/i)
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
}

function extractKeywords(p: PersonalPrompt, limit = 12): Set<string> {
  const title = tokenize(p.title ?? "");
  const body = tokenize(p.prompt ?? "");
  // Title tokens get weight 2 (duplicated) so title overlap scores higher.
  const counts = new Map<string, number>();
  for (const t of title) counts.set(t, (counts.get(t) ?? 0) + 2);
  for (const t of body) counts.set(t, (counts.get(t) ?? 0) + 1);
  return new Set(
    [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([w]) => w),
  );
}

function sharedCount<T>(a: Set<T>, b: Set<T>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let n = 0;
  const [small, large] = a.size < b.size ? [a, b] : [b, a];
  for (const v of small) if (large.has(v)) n++;
  return n;
}

interface CandidateEdge {
  a: string;
  b: string;
  type: GraphLink["type"];
  strength: number;
  // Higher weight = more important; used when pruning to MAX_EDGES_PER_PROMPT.
  weight: number;
}

export function buildGraphData(prompts: PersonalPrompt[], favoriteIds: Set<string>): GraphData {
  const now = Date.now();

  const nodes: GraphNode[] = prompts.map((p) => {
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
      // Combined grouping: capability + category. Same-capability prompts in the
      // same personal category cluster tightest; same-capability alone clusters
      // looser. Forces in the view use this for spatial grouping.
      groupId: `${p.capability_mode ?? CapabilityMode.STANDARD}:${p.personal_category || "כללי"}`,
    };
  });

  // Precompute keyword sets + normalized metadata
  const keywordsById = new Map<string, Set<string>>();
  const tagsById = new Map<string, Set<string>>();
  const varsById = new Map<string, Set<string>>();
  const createdById = new Map<string, number>();
  for (const p of prompts) {
    keywordsById.set(p.id, extractKeywords(p));
    tagsById.set(p.id, new Set((p.tags ?? []).map((t) => t.toLowerCase())));
    varsById.set(p.id, new Set(p.template_variables ?? []));
    createdById.set(p.id, p.created_at ? new Date(p.created_at).getTime() : 0);
  }

  const candidates: CandidateEdge[] = [];

  // Pairwise comparisons — O(n²), safe under 500 prompts (truncation cap elsewhere)
  for (let i = 0; i < prompts.length; i++) {
    for (let j = i + 1; j < prompts.length; j++) {
      const a = prompts[i];
      const b = prompts[j];
      const aId = a.id;
      const bId = b.id;

      // 1. Shared tags (user-declared) — strongest signal when present
      const tagShared = sharedCount(tagsById.get(aId)!, tagsById.get(bId)!);
      if (tagShared > 0) {
        candidates.push({
          a: aId,
          b: bId,
          type: "tag",
          strength: tagShared,
          weight: 100 + tagShared * 10,
        });
      }

      // 2. Shared template variables
      const varShared = sharedCount(varsById.get(aId)!, varsById.get(bId)!);
      if (varShared > 0) {
        candidates.push({
          a: aId,
          b: bId,
          type: "template",
          strength: varShared,
          weight: 80 + varShared * 8,
        });
      }

      // 3. Content keyword similarity (≥2 shared meaningful words)
      const kwShared = sharedCount(keywordsById.get(aId)!, keywordsById.get(bId)!);
      if (kwShared >= 2) {
        candidates.push({
          a: aId,
          b: bId,
          type: "similarity",
          strength: kwShared,
          weight: 50 + kwShared * 5,
        });
      }

      // 4. Temporal proximity — created within 48h window. Thin edge, lowest
      //    weight so it only survives pruning for otherwise-orphan prompts.
      const ta = createdById.get(aId)!;
      const tb = createdById.get(bId)!;
      if (ta > 0 && tb > 0 && Math.abs(ta - tb) < TWO_DAYS_MS) {
        candidates.push({
          a: aId,
          b: bId,
          type: "temporal",
          strength: 1,
          weight: 20,
        });
      }

      // 5. Capability fallback — same capability + same category, no other
      //    signal. Weak but prevents orphan dots floating in space.
      if (
        a.capability_mode === b.capability_mode &&
        (a.personal_category || "כללי") === (b.personal_category || "כללי") &&
        tagShared === 0 &&
        varShared === 0 &&
        kwShared < 2
      ) {
        candidates.push({
          a: aId,
          b: bId,
          type: "capability",
          strength: 1,
          weight: 10,
        });
      }
    }
  }

  // Prune: per prompt, keep at most MAX_EDGES_PER_PROMPT strongest edges.
  // Sort by weight desc globally, then accept greedily while respecting caps.
  candidates.sort((x, y) => y.weight - x.weight);
  const degreeCount = new Map<string, number>();
  const accepted: CandidateEdge[] = [];
  const seen = new Set<string>();
  for (const c of candidates) {
    const key = c.a < c.b ? `${c.a}|${c.b}|${c.type}` : `${c.b}|${c.a}|${c.type}`;
    if (seen.has(key)) continue;
    const da = degreeCount.get(c.a) ?? 0;
    const db = degreeCount.get(c.b) ?? 0;
    if (da >= MAX_EDGES_PER_PROMPT || db >= MAX_EDGES_PER_PROMPT) continue;
    accepted.push(c);
    seen.add(key);
    degreeCount.set(c.a, da + 1);
    degreeCount.set(c.b, db + 1);
  }

  const links: GraphLink[] = accepted.map((c) => ({
    source: c.a,
    target: c.b,
    type: c.type,
    strength: c.strength,
  }));

  // Library reference nodes (preserved — these create meaningful cross-prompt
  // groupings when multiple prompts spawn from the same public library item).
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
