import { CapabilityMode } from "@/lib/capability-mode";
import type { PersonalPrompt } from "@/lib/types";

export interface GraphNode {
  id: string;
  label: string;
  type: "prompt" | "category" | "library" | "tag";
  // prompt nodes only
  size?: number;
  capability?: CapabilityMode;
  isFavorite?: boolean;
  isTemplate?: boolean;
  isRecentlyUsed?: boolean;
  successRate?: number; // 0–1, from success_count / total
  score?: number; // 0–100, from client-side scoreInput
  prompt?: PersonalPrompt;
  // Spatial grouping hint for force layout — categories pull related prompts together
  // without needing a visible hub node.
  groupId?: string;
  // runtime — force-graph mutates these
  x?: number;
  y?: number;
  z?: number;
  vx?: number;
  vy?: number;
  vz?: number;
  fx?: number;
  fy?: number;
  fz?: number;
}

export interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  type: "tag" | "reference" | "template" | "similarity" | "capability" | "temporal";
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

export function tokenize(text: string): string[] {
  if (!text) return [];
  // Split on whitespace + punctuation; keep Hebrew (\u0590-\u05FF) and
  // Latin letters + digits. Strip Hebrew niqqud (\u05B0-\u05C7) first.
  return text
    .toLowerCase()
    .replace(/[\u05B0-\u05C7]/g, "")
    .split(/[^\u0590-\u05FFa-z0-9]+/i)
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
}

export function extractKeywords(p: PersonalPrompt, limit = 12): Set<string> {
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

export function buildGraphData(
  prompts: PersonalPrompt[],
  favoriteIds: Set<string>,
  scoreMap?: Map<string, number>,
): GraphData {
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
      score: scoreMap?.get(p.id),
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

  // Library reference hubs — one node per library grouping. Falls back to
  // the public-library `category` when the row has no explicit `reference`
  // (the DB column may not be populated). This makes library-derived
  // prompts cluster around a shared hub → visible purple edges.
  const libNodeIds = new Set<string>();
  prompts
    .filter((p) => p.source === "library")
    .forEach((p) => {
      const key = p.reference || p.category || "library";
      const refId = `lib:${key}`;
      if (!libNodeIds.has(refId)) {
        nodes.push({ id: refId, label: `ספרייה · ${key}`, type: "library" });
        libNodeIds.add(refId);
      }
      links.push({ source: p.id, target: refId, type: "reference" });
    });

  // Tag hub nodes — one node per unique tag used by ≥1 prompt. Every tagged
  // prompt gets an amber edge to its tag hub. Turns tags into visible
  // clusters (Obsidian-style) even when no two prompts happen to share the
  // exact same tag pair directly.
  const tagCount = new Map<string, number>();
  for (const p of prompts) {
    for (const t of p.tags ?? []) {
      const key = t.trim().toLowerCase();
      if (!key) continue;
      tagCount.set(key, (tagCount.get(key) ?? 0) + 1);
    }
  }
  const tagNodeIds = new Set<string>();
  for (const p of prompts) {
    for (const t of p.tags ?? []) {
      const key = t.trim().toLowerCase();
      if (!key) continue;
      const tagId = `tag:${key}`;
      if (!tagNodeIds.has(tagId)) {
        nodes.push({ id: tagId, label: `#${key}`, type: "tag" });
        tagNodeIds.add(tagId);
      }
      links.push({ source: p.id, target: tagId, type: "tag" });
    }
  }

  return { nodes, links };
}

// ────────────────────────────────────────────────────────────────────────────
// Cluster detection + convex hull for the Obsidian-style overlay
// ────────────────────────────────────────────────────────────────────────────

export interface GraphCluster {
  clusterId: string;
  nodeIds: string[];
  label: string;
  color: string;
  capability: CapabilityMode;
}

// Union-find (disjoint set) — tiny inline impl.
function makeUF(ids: string[]) {
  const parent = new Map<string, string>();
  for (const id of ids) parent.set(id, id);
  const find = (x: string): string => {
    let p = parent.get(x)!;
    while (p !== parent.get(p)!) p = parent.get(p)!;
    // path compression
    let cur = x;
    while (parent.get(cur) !== p) {
      const next = parent.get(cur)!;
      parent.set(cur, p);
      cur = next;
    }
    return p;
  };
  const union = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };
  return { find, union };
}

/**
 * Community detection over "strong" edges only. Returns one entry per
 * component with ≥ 3 prompt nodes. Used to draw translucent hull overlays
 * behind topical clusters — the Obsidian signature look.
 */
export function computeClusters(prompts: PersonalPrompt[], links: GraphLink[]): GraphCluster[] {
  if (prompts.length === 0) return [];
  const ids = prompts.map((p) => p.id);
  const uf = makeUF(ids);

  for (const l of links) {
    const s = typeof l.source === "string" ? l.source : l.source.id;
    const t = typeof l.target === "string" ? l.target : l.target.id;
    // Strong edges only — temporal + capability are too noisy for grouping.
    const isStrong =
      l.type === "tag" ||
      l.type === "template" ||
      l.type === "reference" ||
      (l.type === "similarity" && (l.strength ?? 0) >= 2);
    if (!isStrong) continue;
    // Skip edges that touch non-prompt nodes (e.g. library reference nodes).
    if (!ids.includes(s) || !ids.includes(t)) continue;
    uf.union(s, t);
  }

  const groups = new Map<string, string[]>();
  for (const id of ids) {
    const root = uf.find(id);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root)!.push(id);
  }

  const promptById = new Map(prompts.map((p) => [p.id, p]));
  const clusters: GraphCluster[] = [];
  for (const [root, nodeIds] of groups) {
    if (nodeIds.length < 3) continue;

    // Dominant capability
    const capCounts = new Map<CapabilityMode, number>();
    for (const id of nodeIds) {
      const cap = promptById.get(id)?.capability_mode ?? CapabilityMode.STANDARD;
      capCounts.set(cap, (capCounts.get(cap) ?? 0) + 1);
    }
    let dominantCap = CapabilityMode.STANDARD;
    let best = 0;
    for (const [cap, n] of capCounts) {
      if (n > best) {
        best = n;
        dominantCap = cap;
      }
    }

    // Label: top keyword across members
    const keywordTally = new Map<string, number>();
    for (const id of nodeIds) {
      const p = promptById.get(id);
      if (!p) continue;
      for (const kw of extractKeywords(p, 6)) {
        keywordTally.set(kw, (keywordTally.get(kw) ?? 0) + 1);
      }
    }
    const topKw = [...keywordTally.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([w]) => w)
      .join(" · ");
    const label = topKw || "קבוצה";

    clusters.push({
      clusterId: root,
      nodeIds,
      label,
      color: CAPABILITY_COLORS[dominantCap],
      capability: dominantCap,
    });
  }
  return clusters;
}

/**
 * Andrew's monotone chain convex hull. Returns points in CCW order.
 * O(n log n). Tiny — ~25 lines.
 */
export function convexHull(
  points: Array<{ x: number; y: number }>,
): Array<{ x: number; y: number }> {
  if (points.length < 3) return points.slice();
  const pts = points.slice().sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x));
  const cross = (
    o: { x: number; y: number },
    a: { x: number; y: number },
    b: { x: number; y: number },
  ) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

  const lower: Array<{ x: number; y: number }> = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }
  const upper: Array<{ x: number; y: number }> = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

/**
 * Expand a convex hull outward by `padding` pixels along each vertex's
 * outward normal. Good enough for the soft blob look — no need for a true
 * Minkowski sum.
 */
export function expandHull(
  hull: Array<{ x: number; y: number }>,
  padding: number,
): Array<{ x: number; y: number }> {
  if (hull.length === 0) return hull;
  // Centroid
  let cx = 0;
  let cy = 0;
  for (const p of hull) {
    cx += p.x;
    cy += p.y;
  }
  cx /= hull.length;
  cy /= hull.length;
  return hull.map((p) => {
    const dx = p.x - cx;
    const dy = p.y - cy;
    const len = Math.hypot(dx, dy) || 1;
    return { x: p.x + (dx / len) * padding, y: p.y + (dy / len) * padding };
  });
}
