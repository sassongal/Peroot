"use client";

import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { X, Zap, Tag, Clock, BarChart2, Star, BookTemplate, Check, Plus } from "lucide-react";
import type { PersonalPrompt, LibraryPrompt } from "@/lib/types";
import { CapabilityMode } from "@/lib/capability-mode";
import {
  buildGraphData,
  computeClusters,
  convexHull,
  expandHull,
  CAPABILITY_COLORS,
  CAPABILITY_HIGHLIGHT,
  type GraphNode,
  type GraphLink,
  type GraphCluster,
} from "./graph-utils";
import { cn } from "@/lib/utils";
import { useLibraryContext } from "@/context/LibraryContext";

// Safari < 15.4 doesn't support roundRect — polyfill before any canvas code runs.
if (typeof window !== "undefined") {
  const proto = CanvasRenderingContext2D.prototype as CanvasRenderingContext2D & {
    roundRect?: (x: number, y: number, w: number, h: number, r: number | number[]) => void;
  };
  if (!proto.roundRect) {
    proto.roundRect = function (x, y, w, h, r) {
      const radius = typeof r === "number" ? r : Array.isArray(r) ? ((r as number[])[0] ?? 0) : 0;
      const rx = Math.min(radius, w / 2, h / 2);
      this.beginPath();
      this.moveTo(x + rx, y);
      this.lineTo(x + w - rx, y);
      this.arcTo(x + w, y, x + w, y + rx, rx);
      this.lineTo(x + w, y + h - rx);
      this.arcTo(x + w, y + h, x + w - rx, y + h, rx);
      this.lineTo(x + rx, y + h);
      this.arcTo(x, y + h, x, y + h - rx, rx);
      this.lineTo(x, y + rx);
      this.arcTo(x, y, x + rx, y, rx);
      this.closePath();
    };
  }
}

// SSR-safe — canvas APIs require browser.
// Import directly from `react-force-graph-2d` — the meta `react-force-graph`
// package bundles 3D/VR/AR variants that reference THREE and AFRAME globals
// at module-eval, which crashes the bundle. The 2D-only entry has no
// THREE/AFRAME deps.
const ForceGraph2D = dynamic(() => import("react-force-graph-2d").then((m) => m.default), {
  ssr: false,
});
// Same SSR-safe pattern for the 3D variant. `react-force-graph-3d` bundles
// THREE at module-eval, so it must be loaded client-only.
const ForceGraph3D = dynamic(() => import("react-force-graph-3d").then((m) => m.default), {
  ssr: false,
});

interface Props {
  prompts: PersonalPrompt[];
  favoriteIds: Set<string>;
  onUsePrompt: (p: PersonalPrompt) => void;
  isLoading?: boolean;
  /** When the library exceeds the row cap, describe how many were omitted. */
  truncatedAt?: { shown: number; total: number } | null;
}

const CAPABILITY_LABELS: Record<CapabilityMode, string> = {
  [CapabilityMode.STANDARD]: "רגיל",
  [CapabilityMode.IMAGE_GENERATION]: "תמונות",
  [CapabilityMode.DEEP_RESEARCH]: "מחקר",
  [CapabilityMode.AGENT_BUILDER]: "סוכן",
  [CapabilityMode.VIDEO_GENERATION]: "וידאו",
};

// Convert a 3/6-char hex color to rgba() with the given alpha.
function hexToRgba(hex: string, alpha: number): string {
  let h = hex.replace("#", "");
  if (h.length === 3)
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  const n = parseInt(h, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Draw a hexagon path (flat-top)
function hexPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

// Draw a camera icon inside a node at (cx,cy) with given radius
function drawCameraIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  const s = r * 0.5;
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.8)";
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.lineWidth = r * 0.1;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  // Body
  const bw = s * 1.6;
  const bh = s * 1.1;
  ctx.beginPath();
  ctx.roundRect(cx - bw / 2, cy - bh / 2 + s * 0.15, bw, bh, s * 0.2);
  ctx.stroke();
  // Lens
  ctx.beginPath();
  ctx.arc(cx, cy + s * 0.15, s * 0.38, 0, 2 * Math.PI);
  ctx.stroke();
  // Viewfinder bump
  ctx.beginPath();
  ctx.roundRect(cx - s * 0.3, cy - bh / 2 - s * 0.1, s * 0.6, s * 0.28, s * 0.1);
  ctx.fill();
  ctx.restore();
}

// Draw video play triangle
function drawPlayIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  const s = r * 0.45;
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.4, cy - s * 0.6);
  ctx.lineTo(cx + s * 0.7, cy);
  ctx.lineTo(cx - s * 0.4, cy + s * 0.6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// Draw a magnifying glass for research
function drawSearchIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  const s = r * 0.45;
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.8)";
  ctx.lineWidth = r * 0.12;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(cx - s * 0.1, cy - s * 0.1, s * 0.5, 0, 2 * Math.PI);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx + s * 0.28, cy + s * 0.28);
  ctx.lineTo(cx + s * 0.7, cy + s * 0.7);
  ctx.stroke();
  ctx.restore();
}

// Draw robot/agent icon
function drawAgentIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  const s = r * 0.45;
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.8)";
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.lineWidth = r * 0.1;
  ctx.lineCap = "round";
  // Head
  ctx.beginPath();
  ctx.roundRect(cx - s * 0.55, cy - s * 0.65, s * 1.1, s * 0.9, s * 0.2);
  ctx.stroke();
  // Eyes
  ctx.beginPath();
  ctx.arc(cx - s * 0.22, cy - s * 0.2, s * 0.12, 0, 2 * Math.PI);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + s * 0.22, cy - s * 0.2, s * 0.12, 0, 2 * Math.PI);
  ctx.fill();
  // Antenna
  ctx.beginPath();
  ctx.moveTo(cx, cy - s * 0.65);
  ctx.lineTo(cx, cy - s * 1.0);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy - s * 1.0, s * 0.1, 0, 2 * Math.PI);
  ctx.fill();
  ctx.restore();
}

function drawCapabilityIcon(
  ctx: CanvasRenderingContext2D,
  cap: CapabilityMode,
  cx: number,
  cy: number,
  r: number,
) {
  if (cap === CapabilityMode.IMAGE_GENERATION) drawCameraIcon(ctx, cx, cy, r);
  else if (cap === CapabilityMode.VIDEO_GENERATION) drawPlayIcon(ctx, cx, cy, r);
  else if (cap === CapabilityMode.DEEP_RESEARCH) drawSearchIcon(ctx, cx, cy, r);
  else if (cap === CapabilityMode.AGENT_BUILDER) drawAgentIcon(ctx, cx, cy, r);
}

export function PromptGraphView({
  prompts,
  favoriteIds,
  onUsePrompt,
  isLoading = false,
  truncatedAt = null,
}: Props) {
  const { updateTags, updatePrompt, libraryPrompts } = useLibraryContext();
  const libraryPromptsTyped = libraryPrompts as LibraryPrompt[] | undefined;
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [selectedPrompt, setSelectedPrompt] = useState<PersonalPrompt | null>(null);
  const [hoverNode, setHoverNode] = useState<GraphNode | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const [mobileLegendOpen, setMobileLegendOpen] = useState(false);
  const tickRef = useRef(0);
  const rafRef = useRef<number>(0);
  // Cache of loaded HTMLImageElement keyed by library reference id
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const [, forceRepaint] = useState(0);

  // Build a map of reference-id → preview image URL from the library
  const previewUrlByRef = useMemo(() => {
    const map = new Map<string, string>();
    (libraryPromptsTyped ?? []).forEach((lp) => {
      const ref = lp.source?.reference ?? lp.id;
      if (ref && lp.preview_image_url) map.set(ref, lp.preview_image_url);
    });
    return map;
  }, [libraryPromptsTyped]);

  // Preload images for image-generation prompts sourced from library.
  // Guarded against setState-after-unmount by a mount flag captured in the
  // effect closure and checked before every forceRepaint.
  useEffect(() => {
    let mounted = true;
    prompts.forEach((p) => {
      if (
        p.capability_mode === CapabilityMode.IMAGE_GENERATION &&
        p.source === "library" &&
        p.reference
      ) {
        const url = previewUrlByRef.get(p.reference);
        if (!url || imageCacheRef.current.has(p.reference)) return;
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.referrerPolicy = "no-referrer";
        img.onload = () => {
          if (mounted) forceRepaint((n) => n + 1);
        };
        img.onerror = () => {
          // Drop broken entries so fallback icon renders and we don't retry.
          if (p.reference) imageCacheRef.current.delete(p.reference);
        };
        img.src = url;
        imageCacheRef.current.set(p.reference, img);
      }
    });
    return () => {
      mounted = false;
    };
  }, [prompts, previewUrlByRef]);
  // Preserve node positions across graphData rebuilds so the simulation doesn't restart
  const positionMapRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const fgRef = useRef<{
    d3Force?: (
      name: string,
    ) => { strength?: (v: number) => unknown; distance?: (v: number) => unknown } | undefined;
    centerAt?: (x: number, y: number, ms?: number) => void;
    zoom?: (k: number, ms?: number) => void;
    zoomToFit?: (ms?: number, padding?: number) => void;
    d3ReheatSimulation?: () => void;
  } | null>(null);

  // Feature 2 — search + filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [capabilityFilter, setCapabilityFilter] = useState<Set<CapabilityMode>>(new Set());
  const [favOnly, setFavOnly] = useState(false);
  const [viewMode, setViewMode] = useState<"2d" | "3d">("2d");
  const searchInputRef = useRef<HTMLInputElement>(null);
  // Feature 3 — focused node for cinematic zoom
  const [focusedId, setFocusedId] = useState<string | null>(null);
  // Feature 5 — edge hover tooltip
  const [hoverLink, setHoverLink] = useState<GraphLink | null>(null);
  const [hoverLinkPos, setHoverLinkPos] = useState<{ x: number; y: number } | null>(null);
  // Feature 6 — first-visit hint
  const [showHint, setShowHint] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (!localStorage.getItem("peroot:graph-hint-seen")) {
        setShowHint(true);
        const t = setTimeout(() => setShowHint(false), 8000);
        return () => clearTimeout(t);
      }
    } catch {}
  }, []);
  const dismissHint = useCallback(() => {
    setShowHint(false);
    try {
      localStorage.setItem("peroot:graph-hint-seen", "1");
    } catch {}
  }, []);

  // Track animation tick for pulsing effects
  useEffect(() => {
    const tick = () => {
      tickRef.current = Date.now();
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafRef.current);
      document.body.style.cursor = "default";
    };
  }, []);

  // Measure container with debounce
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let timer: ReturnType<typeof setTimeout>;
    const ro = new ResizeObserver((entries) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const { width, height } = entries[0].contentRect;
        if (width > 0 && height > 0) setDimensions({ width, height });
      }, 50);
    });
    ro.observe(el);
    // Init size immediately
    const rect = el.getBoundingClientRect();
    if (rect.width > 0) setDimensions({ width: rect.width, height: rect.height || 520 });
    return () => {
      ro.disconnect();
      clearTimeout(timer);
    };
  }, []);

  const graphData = useMemo(() => {
    const data = buildGraphData(prompts, favoriteIds);
    // Restore saved positions so the simulation doesn't restart from scratch
    data.nodes.forEach((n) => {
      const saved = positionMapRef.current.get(n.id);
      if (saved) {
        n.x = saved.x;
        n.y = saved.y;
      }
    });
    return data;
  }, [prompts, favoriteIds]);

  // Community clusters — colored hulls in the backdrop layer.
  const clusters = useMemo<GraphCluster[]>(
    () => computeClusters(prompts, graphData.links),
    [prompts, graphData.links],
  );
  const nodeById = useMemo(() => {
    const m = new Map<string, GraphNode>();
    for (const n of graphData.nodes) m.set(n.id, n);
    return m;
  }, [graphData.nodes]);
  // Indexed lookup — avoids O(n) .find() per edge hover on large libraries.
  const promptById = useMemo(() => {
    const m = new Map<string, PersonalPrompt>();
    for (const p of prompts) m.set(p.id, p);
    return m;
  }, [prompts]);

  // Render hulls BEHIND nodes/links. `onRenderFramePre` runs before the
  // built-in link+node passes, which is exactly what we want for a backdrop.
  const onRenderFramePre = useCallback(
    (ctx: CanvasRenderingContext2D, globalScale: number) => {
      if (clusters.length === 0) return;
      for (const c of clusters) {
        const pts: Array<{ x: number; y: number }> = [];
        for (const id of c.nodeIds) {
          const n = nodeById.get(id);
          if (n && n.x !== undefined && n.y !== undefined) {
            pts.push({ x: n.x, y: n.y });
          }
        }
        if (pts.length < 3) continue;
        const hull = expandHull(convexHull(pts), 28);
        if (hull.length === 0) continue;

        // Fill
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(hull[0].x, hull[0].y);
        for (let i = 1; i < hull.length; i++) ctx.lineTo(hull[i].x, hull[i].y);
        ctx.closePath();
        ctx.fillStyle = hexToRgba(c.color, 0.09);
        ctx.fill();
        ctx.lineWidth = 1.5 / globalScale;
        ctx.strokeStyle = hexToRgba(c.color, 0.35);
        ctx.stroke();

        // Cluster label — centroid-anchored, small and quiet.
        let cx = 0;
        let minY = Infinity;
        for (const p of hull) {
          cx += p.x;
          if (p.y < minY) minY = p.y;
        }
        cx /= hull.length;
        const labelY = minY - 10 / globalScale;
        const fontSize = Math.max(9, 11 / globalScale);
        ctx.font = `600 ${fontSize}px ui-sans-serif, system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillStyle = hexToRgba(c.color, 0.85);
        ctx.fillText(c.label, cx, labelY);
        ctx.restore();
      }
    },
    [clusters, nodeById],
  );

  // Strip Hebrew niqqud + lowercase for case/niqqud-insensitive search.
  const normalize = useCallback(
    (s: string) => (s ?? "").toLowerCase().replace(/[\u05B0-\u05C7]/g, ""),
    [],
  );

  // IDs of prompts matching the search + filters. `null` = no filter active.
  const matchedIds = useMemo<Set<string> | null>(() => {
    const q = normalize(searchQuery).trim();
    const capActive = capabilityFilter.size > 0;
    if (!q && !capActive && !favOnly) return null;
    const ids = new Set<string>();
    for (const p of prompts) {
      const cap = p.capability_mode ?? CapabilityMode.STANDARD;
      if (capActive && !capabilityFilter.has(cap)) continue;
      if (favOnly && !(favoriteIds.has(p.id) || p.is_pinned)) continue;
      if (q) {
        const hay = normalize(
          [p.title, p.personal_category, p.prompt, ...(p.tags ?? [])].filter(Boolean).join(" "),
        );
        if (!hay.includes(q)) continue;
      }
      ids.add(p.id);
    }
    return ids;
  }, [normalize, searchQuery, capabilityFilter, favOnly, prompts, favoriteIds]);

  // Focused node + 1-hop neighbors — drives the cinematic dim effect.
  const focusIds = useMemo<Set<string> | null>(() => {
    if (!focusedId) return null;
    const ids = new Set<string>([focusedId]);
    for (const l of graphData.links) {
      const src = typeof l.source === "object" ? l.source.id : l.source;
      const tgt = typeof l.target === "object" ? l.target.id : l.target;
      if (src === focusedId) ids.add(tgt);
      if (tgt === focusedId) ids.add(src);
    }
    return ids;
  }, [focusedId, graphData.links]);

  // Connected node IDs for hover-dim effect
  const connectedIds = useMemo(() => {
    if (!hoverNode) return null;
    const ids = new Set<string>();
    ids.add(hoverNode.id);
    graphData.links.forEach((l) => {
      const src = typeof l.source === "object" ? l.source.id : l.source;
      const tgt = typeof l.target === "object" ? l.target.id : l.target;
      if (src === hoverNode.id) ids.add(tgt);
      if (tgt === hoverNode.id) ids.add(src);
    });
    return ids;
  }, [hoverNode, graphData.links]);

  // Unified "is this node dimmed?" check — hover takes precedence,
  // then focus, then search/filter.
  const isNodeVisible = useCallback(
    (id: string): boolean => {
      if (connectedIds) return connectedIds.has(id);
      if (focusIds) return focusIds.has(id);
      if (matchedIds) return matchedIds.has(id);
      return true;
    },
    [connectedIds, focusIds, matchedIds],
  );
  const isNodeMatch = useCallback(
    (id: string): boolean => (matchedIds ? matchedIds.has(id) : false),
    [matchedIds],
  );

  // Save current positions so we can restore them on next graphData rebuild
  const savePositions = useCallback(() => {
    graphData.nodes.forEach((n) => {
      if (n.x !== undefined && n.y !== undefined) {
        positionMapRef.current.set(n.id, { x: n.x, y: n.y });
      }
    });
  }, [graphData.nodes]);

  const handleNodeClick = useCallback(
    (node: GraphNode) => {
      savePositions();
      if (node.type === "prompt" && node.prompt) {
        setSelectedPrompt((prev) => (prev?.id === node.prompt!.id ? null : node.prompt!));
        setFocusedId((prev) => (prev === node.id ? null : node.id));
        // Cinematic dolly-in on the clicked node.
        const nx = node.x ?? 0;
        const ny = node.y ?? 0;
        try {
          fgRef.current?.centerAt?.(nx, ny, 600);
          fgRef.current?.zoom?.(2.2, 600);
        } catch {}
      }
    },
    [savePositions],
  );

  const handleNodeHover = useCallback((node: GraphNode | null) => {
    setHoverNode(node);
    if (typeof document !== "undefined") {
      document.body.style.cursor = node ? "pointer" : "default";
    }
    if (!node) setHoverPos(null);
  }, []);

  // Track pointer over the container so hover tooltip can follow
  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
      const p = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      if (hoverNode) setHoverPos(p);
      if (hoverLink) setHoverLinkPos(p);
    },
    [hoverNode, hoverLink],
  );

  const nodeCanvasObject = useCallback(
    (node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const nx = node.x ?? 0;
      const ny = node.y ?? 0;
      const isHovered = hoverNode?.id === node.id;
      const isSelected = selectedPrompt?.id === node.id;
      const isConnected = connectedIds ? connectedIds.has(node.id) : true;
      const visible = isNodeVisible(node.id);
      const isSearchMatch = isNodeMatch(node.id);
      const dimAlpha = !visible ? 0.08 : connectedIds && !isConnected ? 0.18 : 1;

      ctx.save();
      ctx.globalAlpha = dimAlpha;

      // ── Category node ──────────────────────────────────────────────────────
      if (node.type === "category") {
        const r = isHovered ? 15 : 13;

        // Glow
        if (isHovered) {
          ctx.shadowColor = "rgba(255,255,255,0.5)";
          ctx.shadowBlur = 12;
        }

        // Hex shape
        hexPath(ctx, nx, ny, r);
        const grad = ctx.createRadialGradient(nx - r * 0.3, ny - r * 0.3, 1, nx, ny, r);
        grad.addColorStop(0, "#f8fafc");
        grad.addColorStop(1, isHovered ? "#94a3b8" : "#cbd5e1");
        ctx.fillStyle = grad;
        ctx.fill();

        if (isSelected) {
          ctx.shadowColor = "#f59e0b";
          ctx.shadowBlur = 10;
          hexPath(ctx, nx, ny, r);
          ctx.strokeStyle = "#f59e0b";
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        ctx.shadowBlur = 0;
        const label = node.label.length > 12 ? node.label.slice(0, 12) + "…" : node.label;
        const fontSize = Math.max(8, 10 / Math.max(globalScale, 0.5));
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#0f172a";
        ctx.fillText(label, nx, ny);
        ctx.restore();
        return;
      }

      // ── Library node ───────────────────────────────────────────────────────
      if (node.type === "library") {
        const r = 11;
        ctx.shadowColor = "rgba(168,85,247,0.6)";
        ctx.shadowBlur = isHovered ? 14 : 6;

        // Diamond
        ctx.beginPath();
        ctx.moveTo(nx, ny - r);
        ctx.lineTo(nx + r, ny);
        ctx.lineTo(nx, ny + r);
        ctx.lineTo(nx - r, ny);
        ctx.closePath();

        const grad = ctx.createRadialGradient(nx - r * 0.3, ny - r * 0.3, 1, nx, ny, r);
        grad.addColorStop(0, "#d8b4fe");
        grad.addColorStop(1, "#7c3aed");
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.shadowBlur = 0;
        const fontSize = Math.max(7, 8 / Math.max(globalScale, 0.5));
        ctx.font = `${fontSize}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        if (globalScale > 1.5 || isHovered) ctx.fillText("ספרייה", nx, ny + r + 2);
        ctx.restore();
        return;
      }

      // ── Prompt node ────────────────────────────────────────────────────────
      const radius = (node.size ?? 8) * (isHovered ? 1.15 : 1);
      const cap = node.capability ?? CapabilityMode.STANDARD;
      const color = CAPABILITY_COLORS[cap];
      const highlight = CAPABILITY_HIGHLIGHT[cap];

      // Pulse ring for recently used nodes
      if (node.isRecentlyUsed && !connectedIds) {
        const pulse = 0.4 + 0.3 * Math.sin(tickRef.current / 600);
        ctx.beginPath();
        ctx.arc(nx, ny, radius + 5 + pulse * 4, 0, 2 * Math.PI);
        ctx.strokeStyle = `${color}55`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Animated expanding ripple on hover — world-class polish
      if (isHovered) {
        const t = (tickRef.current % 1400) / 1400;
        for (let i = 0; i < 2; i++) {
          const phase = (t + i * 0.5) % 1;
          const ringR = radius + phase * 22;
          const a = (1 - phase) * 0.5;
          ctx.beginPath();
          ctx.arc(nx, ny, ringR, 0, 2 * Math.PI);
          ctx.strokeStyle = `${highlight}${Math.floor(a * 255)
            .toString(16)
            .padStart(2, "0")}`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }

      // Outer glow (selected or hovered)
      if (isSelected || isHovered) {
        ctx.shadowColor = isSelected ? "#f59e0b" : color;
        ctx.shadowBlur = isSelected ? 22 : 16;
      }

      // Gold favorite ring
      if (node.isFavorite) {
        ctx.beginPath();
        ctx.arc(nx, ny, radius + 3, 0, 2 * Math.PI);
        ctx.strokeStyle = "#f59e0b";
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Template ring (dashed cyan)
      if (node.isTemplate) {
        ctx.save();
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.arc(nx, ny, radius + (node.isFavorite ? 5.5 : 2.5), 0, 2 * Math.PI);
        ctx.strokeStyle = "#22d3ee";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
      }

      // Search-match gold halo (Feature 2)
      if (isSearchMatch) {
        ctx.save();
        ctx.shadowColor = "#fbbf24";
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(nx, ny, radius + 4, 0, 2 * Math.PI);
        ctx.strokeStyle = "#fbbf24";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      }

      // Success-rate arc (Feature 4) — thin ring from 12 o'clock clockwise.
      if (node.successRate !== undefined) {
        const sr = node.successRate;
        const ringColor = sr > 0.7 ? "#34d399" : sr >= 0.4 ? "#fbbf24" : "#fb7185";
        const arcR = radius + 2.5;
        // Background track
        ctx.beginPath();
        ctx.arc(nx, ny, arcR, 0, 2 * Math.PI);
        ctx.strokeStyle = "rgba(148,163,184,0.18)";
        ctx.lineWidth = 2;
        ctx.stroke();
        // Filled portion — start at -π/2 (12 o'clock), clockwise.
        if (sr > 0) {
          ctx.beginPath();
          ctx.arc(nx, ny, arcR, -Math.PI / 2, -Math.PI / 2 + sr * 2 * Math.PI);
          ctx.strokeStyle = ringColor;
          ctx.lineWidth = 2;
          ctx.lineCap = "round";
          ctx.stroke();
          ctx.lineCap = "butt";
        }
      }

      // Focused-node pulse (Feature 3)
      if (focusedId === node.id) {
        const pulse = 0.5 + 0.5 * Math.sin(tickRef.current / 350);
        ctx.beginPath();
        ctx.arc(nx, ny, radius + 6 + pulse * 3, 0, 2 * Math.PI);
        ctx.strokeStyle = `rgba(251,191,36,${0.35 + pulse * 0.4})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Main sphere with radial gradient (3D look)
      ctx.beginPath();
      ctx.arc(nx, ny, radius, 0, 2 * Math.PI);
      const grad = ctx.createRadialGradient(
        nx - radius * 0.35,
        ny - radius * 0.35,
        radius * 0.05,
        nx,
        ny,
        radius,
      );
      grad.addColorStop(0, highlight);
      grad.addColorStop(0.4, color);
      grad.addColorStop(1, color + "bb");
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.shadowBlur = 0;

      // For image-generation prompts sourced from the library, clip the preview
      // image inside the node circle. Falls back to the camera icon if the
      // image hasn't loaded or isn't available.
      let drewImage = false;
      if (cap === CapabilityMode.IMAGE_GENERATION && node.prompt?.reference) {
        const img = imageCacheRef.current.get(node.prompt.reference);
        if (img && img.complete && img.naturalWidth > 0) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(nx, ny, radius - 1, 0, 2 * Math.PI);
          ctx.clip();
          const side = (radius - 1) * 2;
          // cover-fit
          const ar = img.naturalWidth / img.naturalHeight;
          let dw = side;
          let dh = side;
          if (ar > 1) dw = side * ar;
          else dh = side / ar;
          ctx.drawImage(img, nx - dw / 2, ny - dh / 2, dw, dh);
          // Vignette for readability
          const vg = ctx.createRadialGradient(nx, ny, radius * 0.2, nx, ny, radius);
          vg.addColorStop(0, "rgba(0,0,0,0)");
          vg.addColorStop(1, "rgba(0,0,0,0.55)");
          ctx.fillStyle = vg;
          ctx.fillRect(nx - radius, ny - radius, radius * 2, radius * 2);
          ctx.restore();
          // Crisp colored outline so category color stays readable
          ctx.beginPath();
          ctx.arc(nx, ny, radius - 0.5, 0, 2 * Math.PI);
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.5;
          ctx.stroke();
          drewImage = true;
        }
      }

      // Capability icon inside the node (only at sufficient size, no image)
      if (!drewImage && radius > 9) {
        drawCapabilityIcon(ctx, cap, nx, ny, radius);
      }

      // Label: always on hover, on zoom > 2.2, or if selected
      if (isHovered || isSelected || globalScale > 2.2) {
        const label = node.label.length > 22 ? node.label.slice(0, 22) + "…" : node.label;
        const fontSize = Math.max(8, 11 / Math.max(globalScale, 0.5));
        ctx.font = `${isSelected ? "bold " : ""}${fontSize}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";

        // Label background pill
        const tw = ctx.measureText(label).width;
        const pad = 3;
        ctx.fillStyle = "rgba(2,6,23,0.75)";
        ctx.beginPath();
        const lx = nx - tw / 2 - pad;
        const ly = ny + radius + 3;
        ctx.roundRect(lx, ly, tw + pad * 2, fontSize + pad * 2, 3);
        ctx.fill();

        ctx.fillStyle = isSelected ? "#fde68a" : "rgba(255,255,255,0.95)";
        ctx.fillText(label, nx, ny + radius + 3 + pad);
      }

      ctx.restore();
    },
    [hoverNode, selectedPrompt, connectedIds, isNodeVisible, isNodeMatch, focusedId],
  );

  const linkColor = useCallback(
    (link: GraphLink) => {
      const src = typeof link.source === "object" ? link.source.id : link.source;
      const tgt = typeof link.target === "object" ? link.target.id : link.target;
      const isConnectedLink = !connectedIds || connectedIds.has(src) || connectedIds.has(tgt);
      const bothVisible = isNodeVisible(src) && isNodeVisible(tgt);
      const baseAlpha = !bothVisible ? 0.05 : isConnectedLink ? 1 : 0.08;

      if (link.type === "tag") return `rgba(245,158,11,${0.75 * baseAlpha})`;
      if (link.type === "reference") return `rgba(168,85,247,${0.65 * baseAlpha})`;
      if (link.type === "template") return `rgba(34,211,238,${0.55 * baseAlpha})`;
      if (link.type === "similarity") {
        // Emerald teal — scale alpha with shared-keyword strength
        const s = Math.min(1, 0.35 + (link.strength ?? 1) * 0.12);
        return `rgba(45,212,191,${s * baseAlpha})`;
      }
      if (link.type === "temporal") return `rgba(148,163,184,${0.2 * baseAlpha})`;
      if (link.type === "capability") return `rgba(148,163,184,${0.12 * baseAlpha})`;
      // category (legacy — no longer emitted)
      return `rgba(148,163,184,${0.15 * baseAlpha})`;
    },
    [connectedIds, isNodeVisible],
  );

  const linkWidth = useCallback((link: GraphLink) => {
    if (link.type === "tag") return Math.min(3.5, 1 + (link.strength ?? 1) * 0.6);
    if (link.type === "similarity") return Math.min(3, 1.1 + (link.strength ?? 1) * 0.35);
    if (link.type === "template") return 1.5;
    if (link.type === "reference") return 1.5;
    if (link.type === "temporal") return 0.6;
    return 0.8;
  }, []);

  const linkLineDash = useCallback((link: GraphLink) => {
    if (link.type === "template") return [4, 3];
    if (link.type === "temporal") return [2, 4];
    return null;
  }, []);

  const linkDirectionalParticles = useCallback((link: GraphLink) => {
    if (link.type === "reference") return 3;
    if (link.type === "similarity" && (link.strength ?? 0) >= 3) return 2;
    if (link.type === "tag" && (link.strength ?? 0) > 1) return 2;
    return 0;
  }, []);

  const linkDirectionalParticleColor = useCallback((link: GraphLink) => {
    if (link.type === "reference") return "rgba(192,132,252,0.9)";
    if (link.type === "similarity") return "rgba(94,234,212,0.95)";
    return "rgba(251,191,36,0.9)";
  }, []);

  // Per-edge force strength — strong semantic links pull tighter; temporal /
  // capability fallbacks barely pull at all so they don't collapse clusters.
  const linkStrength = useCallback((link: GraphLink) => {
    if (link.type === "tag") return Math.min(0.9, 0.35 + (link.strength ?? 1) * 0.15);
    if (link.type === "similarity") return Math.min(0.8, 0.25 + (link.strength ?? 1) * 0.1);
    if (link.type === "template") return 0.4;
    if (link.type === "reference") return 0.5;
    if (link.type === "temporal") return 0.05;
    if (link.type === "capability") return 0.03;
    return 0.1;
  }, []);

  const linkDistance = useCallback((link: GraphLink) => {
    if (link.type === "tag") return 60;
    if (link.type === "similarity") return 70;
    if (link.type === "template") return 80;
    if (link.type === "reference") return 55;
    if (link.type === "temporal") return 140;
    if (link.type === "capability") return 160;
    return 100;
  }, []);

  // D3 force engine config — run once per graphData change so the link force
  // picks up per-edge strength/distance for the newly-built links.
  useEffect(() => {
    const link = fgRef.current?.d3Force?.("link") as
      | {
          strength?: (fn: (l: GraphLink) => number) => unknown;
          distance?: (fn: (l: GraphLink) => number) => unknown;
        }
      | undefined;
    link?.strength?.(linkStrength);
    link?.distance?.(linkDistance);
    const charge = fgRef.current?.d3Force?.("charge") as
      | { strength?: (v: number) => unknown }
      | undefined;
    // Stronger repulsion prevents the "tangled ball" look at high node counts.
    charge?.strength?.(-120);
  }, [graphData, linkStrength, linkDistance]);

  const handleEngineStop = useCallback(() => {
    // no-op
  }, []);

  // Feature 3 — click on empty canvas clears focus and fits the graph.
  // Guard: only reset when something is actually focused/selected, so casual
  // pan-clicks on the background don't constantly refit the camera.
  const handleBackgroundClick = useCallback(() => {
    if (!focusedId && !selectedPrompt) return;
    setFocusedId(null);
    setSelectedPrompt(null);
    try {
      fgRef.current?.zoomToFit?.(600, 80);
    } catch {}
  }, [focusedId, selectedPrompt]);

  // Feature 5 — edge hover tooltip
  const handleLinkHover = useCallback(
    (link: GraphLink | null) => {
      setHoverLink(link);
      if (typeof document !== "undefined") {
        document.body.style.cursor = link || hoverNode ? "pointer" : "default";
      }
    },
    [hoverNode],
  );

  // Feature 6 — keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const isTyping =
        t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
      if (e.key === "/" && !isTyping) {
        e.preventDefault();
        searchInputRef.current?.focus();
        dismissHint();
      } else if (e.key === "Escape") {
        if (searchQuery || capabilityFilter.size > 0 || favOnly || focusedId) {
          setSearchQuery("");
          setCapabilityFilter(new Set());
          setFavOnly(false);
          setFocusedId(null);
          setSelectedPrompt(null);
          try {
            fgRef.current?.zoomToFit?.(600, 80);
          } catch {}
        }
        dismissHint();
      } else if ((e.key === "f" || e.key === "F") && !isTyping) {
        setFavOnly((v) => !v);
        dismissHint();
      } else if ((e.key === "r" || e.key === "R") && !isTyping) {
        try {
          fgRef.current?.d3ReheatSimulation?.();
        } catch {}
        dismissHint();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [searchQuery, capabilityFilter, favOnly, focusedId, dismissHint]);

  // Feature 5 helpers — precompute shared items for hover tooltip.
  const describeEdge = useCallback(
    (link: GraphLink): string => {
      const srcId = typeof link.source === "object" ? link.source.id : link.source;
      const tgtId = typeof link.target === "object" ? link.target.id : link.target;
      const a = promptById.get(srcId as string);
      const b = promptById.get(tgtId as string);
      if (link.type === "reference") return "מקור מהספרייה";
      if (link.type === "capability") return "אותה יכולת וקטגוריה";
      if (link.type === "temporal") return "נוצרו בסמיכות זמן";
      if (!a || !b) return link.type;
      if (link.type === "tag") {
        const aTags = new Set((a.tags ?? []).map((t) => t.toLowerCase()));
        const shared = (b.tags ?? [])
          .filter((t) => aTags.has(t.toLowerCase()))
          .slice(0, 4)
          .join(", ");
        return `תגיות משותפות: ${shared || "—"}`;
      }
      if (link.type === "template") {
        const aVars = new Set(a.template_variables ?? []);
        const shared = (b.template_variables ?? [])
          .filter((v) => aVars.has(v))
          .slice(0, 4)
          .map((v) => `{{${v}}}`)
          .join(", ");
        return `משתנים משותפים: ${shared || "—"}`;
      }
      if (link.type === "similarity") {
        return `דמיון תוכן · ${link.strength ?? 0} מילים משותפות`;
      }
      return link.type;
    },
    [promptById],
  );

  return (
    <div
      className="relative w-full flex-1 min-h-[500px] rounded-2xl overflow-hidden border border-white/10 backdrop-blur-sm"
      style={{
        background:
          "radial-gradient(120% 80% at 50% 0%, rgba(168,85,247,0.10) 0%, rgba(59,130,246,0.06) 35%, rgba(2,6,23,0.55) 75%), " +
          "radial-gradient(80% 60% at 100% 100%, rgba(245,158,11,0.08) 0%, transparent 70%), " +
          "linear-gradient(180deg, rgba(2,6,23,0.55), rgba(2,6,23,0.75))",
      }}
    >
      {/* Subtle dotted grid overlay for depth */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.18] mix-blend-overlay"
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.35) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />
      {/* Feature 2 — search + filter bar */}
      <div
        className="absolute top-3 inset-x-3 md:inset-x-auto md:right-3 z-30 flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-black/55 backdrop-blur-xl px-2.5 py-2 shadow-xl"
        dir="rtl"
      >
        <div className="relative flex-1 md:flex-initial">
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="חפש פרומפט… (/)"
            className="w-full md:w-60 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400/60 focus:bg-white/10"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              aria-label="נקה חיפוש"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {(Object.keys(CAPABILITY_LABELS) as CapabilityMode[]).map((cap) => {
            const active = capabilityFilter.has(cap);
            return (
              <button
                key={cap}
                onClick={() =>
                  setCapabilityFilter((prev) => {
                    const next = new Set(prev);
                    if (next.has(cap)) next.delete(cap);
                    else next.add(cap);
                    return next;
                  })
                }
                className={cn(
                  "text-[11px] px-2 py-1 rounded-md border transition-colors",
                  active
                    ? "border-transparent text-black font-semibold"
                    : "border-white/15 text-slate-300 hover:bg-white/8",
                )}
                style={active ? { backgroundColor: CAPABILITY_COLORS[cap] } : undefined}
                title={CAPABILITY_LABELS[cap]}
              >
                {CAPABILITY_LABELS[cap]}
              </button>
            );
          })}
        </div>
        <button
          onClick={() => setFavOnly((v) => !v)}
          className={cn(
            "text-[11px] px-2 py-1 rounded-md border flex items-center gap-1 transition-colors",
            favOnly
              ? "bg-amber-400/90 border-transparent text-black font-semibold"
              : "border-white/15 text-slate-300 hover:bg-white/8",
          )}
          aria-pressed={favOnly}
        >
          <Star className={cn("w-3 h-3", favOnly && "fill-black")} />
          מועדפים
        </button>
        <div className="flex items-center rounded-md border border-white/15 overflow-hidden">
          <button
            onClick={() => setViewMode("2d")}
            className={cn(
              "text-[11px] px-2 py-1 transition-colors",
              viewMode === "2d"
                ? "bg-white/15 text-white font-semibold"
                : "text-slate-300 hover:bg-white/8",
            )}
            aria-pressed={viewMode === "2d"}
            title="תצוגה דו-ממדית"
          >
            2D
          </button>
          <button
            onClick={() => setViewMode("3d")}
            className={cn(
              "text-[11px] px-2 py-1 transition-colors border-r border-white/15",
              viewMode === "3d"
                ? "bg-gradient-to-br from-cyan-400/90 to-purple-500/90 text-black font-semibold"
                : "text-slate-300 hover:bg-white/8",
            )}
            aria-pressed={viewMode === "3d"}
            title="תצוגה תלת-ממדית"
          >
            3D
          </button>
        </div>
      </div>

      {/* Feature 6 — first-visit hint */}
      {showHint && (
        <div
          onClick={dismissHint}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 rounded-full border border-white/15 bg-black/75 backdrop-blur-xl px-4 py-2 text-xs text-slate-200 shadow-xl cursor-pointer"
          dir="rtl"
        >
          טיפ: <kbd className="px-1 bg-white/10 rounded">/</kbd> חיפוש ·{" "}
          <kbd className="px-1 bg-white/10 rounded">Esc</kbd> איפוס ·{" "}
          <kbd className="px-1 bg-white/10 rounded">F</kbd> מועדפים ·{" "}
          <kbd className="px-1 bg-white/10 rounded">R</kbd> רעיון מחדש
        </div>
      )}

      {/* Loading overlay while fetching all prompts */}
      {isLoading && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-black/40 backdrop-blur-sm">
          <div className="w-10 h-10 rounded-full border-2 border-amber-500/30 border-t-amber-400 animate-spin" />
          <p className="text-sm text-slate-400">טוען את כל הפרומפטים לגרף...</p>
        </div>
      )}
      <div
        ref={containerRef}
        onPointerMove={handlePointerMove}
        className="w-full h-[calc(100vh-15rem)] min-h-[480px] md:h-[calc(100vh-13rem)] relative"
      >
        {viewMode === "2d" ? (
          /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
          <ForceGraph2D
            ref={fgRef as any}
            graphData={graphData as any}
            width={dimensions.width}
            height={dimensions.height}
            nodeId="id"
            nodeCanvasObject={nodeCanvasObject as any}
            nodeCanvasObjectMode={() => "replace"}
            onRenderFramePre={onRenderFramePre as any}
            onNodeClick={handleNodeClick as any}
            onNodeHover={handleNodeHover as any}
            onLinkHover={handleLinkHover as any}
            onBackgroundClick={handleBackgroundClick as any}
            linkColor={linkColor as any}
            linkWidth={linkWidth as any}
            linkLineDash={linkLineDash as any}
            linkDirectionalParticles={linkDirectionalParticles as any}
            linkDirectionalParticleWidth={2}
            linkDirectionalParticleColor={linkDirectionalParticleColor as any}
            linkDirectionalParticleSpeed={0.004}
            cooldownTicks={200}
            d3AlphaDecay={0.015}
            d3VelocityDecay={0.25}
            warmupTicks={60}
            backgroundColor="transparent"
            enableZoomInteraction
            enablePanInteraction
            enablePointerInteraction
            onEngineStop={handleEngineStop}
            minZoom={0.3}
            maxZoom={8}
          />
        ) : (
          /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
          <ForceGraph3D
            graphData={graphData as any}
            width={dimensions.width}
            height={dimensions.height}
            nodeId="id"
            nodeLabel={((n: GraphNode) => n.label) as any}
            nodeVal={((n: GraphNode) => (n.isFavorite ? 8 : 5)) as any}
            nodeColor={
              ((n: GraphNode) =>
                CAPABILITY_COLORS[n.capability ?? CapabilityMode.STANDARD]) as any
            }
            nodeOpacity={0.95}
            nodeResolution={16}
            linkColor={linkColor as any}
            linkWidth={linkWidth as any}
            linkOpacity={0.6}
            linkDirectionalParticles={linkDirectionalParticles as any}
            linkDirectionalParticleWidth={1.5}
            linkDirectionalParticleSpeed={0.006}
            linkDirectionalParticleColor={linkDirectionalParticleColor as any}
            onNodeClick={handleNodeClick as any}
            onNodeHover={handleNodeHover as any}
            backgroundColor="rgba(2,6,23,0)"
            showNavInfo={false}
            cooldownTicks={200}
            warmupTicks={60}
          />
        )}
      </div>

      {/* Floating hover tooltip — shows a peek card next to the cursor */}
      {hoverNode && hoverPos && hoverNode.type === "prompt" && hoverNode.prompt && (
        <div
          className="pointer-events-none absolute z-30 max-w-[240px] rounded-xl border border-white/15 bg-black/85 backdrop-blur-xl px-3 py-2 shadow-2xl text-right"
          style={{
            // Clamp into [8, width-250]. Outer max(8, ...) covers the case
            // where the container is narrower than the tooltip itself.
            left: Math.max(8, Math.min(dimensions.width - 250, hoverPos.x + 16)),
            top: Math.max(8, Math.min(dimensions.height - 120, hoverPos.y + 16)),
          }}
          dir="rtl"
        >
          <div className="flex items-center gap-1.5 mb-1">
            <span
              className="inline-block w-2 h-2 rounded-full shrink-0"
              style={{
                backgroundColor: CAPABILITY_COLORS[hoverNode.capability ?? CapabilityMode.STANDARD],
              }}
            />
            <span className="text-[10px] font-medium text-slate-400">
              {CAPABILITY_LABELS[hoverNode.capability ?? CapabilityMode.STANDARD]}
            </span>
            {hoverNode.isFavorite && <Star className="w-3 h-3 text-amber-400 fill-amber-400" />}
            {hoverNode.isTemplate && <BookTemplate className="w-3 h-3 text-cyan-400" />}
          </div>
          <div className="text-sm font-semibold text-white line-clamp-2 leading-snug">
            {hoverNode.label}
          </div>
          {hoverNode.prompt.personal_category && (
            <div className="text-[10px] text-slate-400 mt-1">
              {hoverNode.prompt.personal_category}
            </div>
          )}
          {(hoverNode.prompt.tags ?? []).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {(hoverNode.prompt.tags ?? []).slice(0, 4).map((t) => (
                <span
                  key={t}
                  className="text-[9px] px-1.5 py-0.5 rounded bg-white/8 text-slate-300 border border-white/10"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Legend — desktop: bottom-left, mobile: hidden */}
      <div className="hidden md:flex absolute bottom-4 left-4 flex-col gap-2 bg-black/65 backdrop-blur-md rounded-xl px-3 py-2.5 border border-white/10 text-[10px] text-slate-300 z-10 select-none">
        <div className="font-semibold text-slate-200 text-[11px] mb-0.5">מקרא</div>
        <div className="flex flex-col gap-1">
          {Object.entries(CAPABILITY_COLORS).map(([mode, color]) => (
            <div key={mode} className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: color }}
              />
              <span>{CAPABILITY_LABELS[mode as CapabilityMode]}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-white/10 mt-1 pt-1.5 flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <div
              className="w-5 h-[2px] rounded shrink-0"
              style={{ background: "rgba(45,212,191,0.9)" }}
            />
            <span>דמיון תוכן</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-5 h-[2px] rounded shrink-0"
              style={{ background: "rgba(245,158,11,0.9)" }}
            />
            <span>תגית משותפת</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-5 h-[2px] shrink-0"
              style={{
                background:
                  "repeating-linear-gradient(90deg,rgba(34,211,238,0.8) 0 4px,transparent 4px 7px)",
              }}
            />
            <span>משתנה משותף</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-5 h-[2px] rounded shrink-0"
              style={{ background: "rgba(168,85,247,0.8)" }}
            />
            <span>ספרייה</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-5 h-[2px] shrink-0"
              style={{
                background:
                  "repeating-linear-gradient(90deg,rgba(148,163,184,0.6) 0 2px,transparent 2px 6px)",
              }}
            />
            <span>נוצרו יחד</span>
          </div>
        </div>
        <div className="border-t border-white/10 mt-1 pt-1.5 flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full border-2 border-amber-400 shrink-0" />
            <span>מועדף / מוצמד</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-2.5 h-2.5 rounded-full border border-cyan-400 shrink-0"
              style={{ borderStyle: "dashed" }}
            />
            <span>תבנית</span>
          </div>
        </div>
      </div>

      {/* Node count hint */}
      <div className="absolute top-3 right-3 bg-black/55 backdrop-blur-sm text-slate-400 text-[10px] px-2.5 py-1.5 rounded-lg border border-white/8 z-10 select-none leading-tight">
        <div>{prompts.length} פרומפטים</div>
        <div className="text-slate-500 hidden sm:block">גלגלת להגדלה · גרור להזזה</div>
        <div className="text-slate-500 sm:hidden">צבוט להגדלה</div>
      </div>

      {/* Truncation banner — library exceeds row cap */}
      {truncatedAt && (
        <div
          role="status"
          className="absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-amber-500/15 backdrop-blur-sm text-amber-200 text-[11px] px-3 py-1.5 rounded-full border border-amber-400/30 select-none"
          dir="rtl"
        >
          מציג {truncatedAt.shown} מתוך {truncatedAt.total} פרומפטים
        </div>
      )}

      {/* Mobile legend toggle pill */}
      <button
        type="button"
        onClick={() => setMobileLegendOpen((o) => !o)}
        className="md:hidden absolute bottom-4 left-4 z-20 flex items-center gap-1.5 bg-black/75 backdrop-blur-md text-slate-200 text-[11px] px-3 py-2 rounded-full border border-white/15 shadow-lg active:scale-95 transition-transform"
        aria-label="מקרא"
        aria-expanded={mobileLegendOpen}
      >
        <span
          className="inline-block w-2 h-2 rounded-full bg-amber-400"
          style={{ boxShadow: "0 0 8px rgba(251,191,36,0.8)" }}
        />
        מקרא
      </button>

      {mobileLegendOpen && (
        <div
          className="md:hidden absolute bottom-16 left-4 right-4 z-20 bg-black/90 backdrop-blur-xl rounded-2xl border border-white/15 p-4 shadow-2xl text-slate-200 text-xs"
          dir="rtl"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold">מקרא הגרף</span>
            <button
              onClick={() => setMobileLegendOpen(false)}
              aria-label="סגור"
              className="p-1 -m-1 rounded hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(CAPABILITY_COLORS).map(([mode, color]) => (
              <div key={mode} className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span>{CAPABILITY_LABELS[mode as CapabilityMode]}</span>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full border-2 border-amber-400" />
              <span>מועדף</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full border border-cyan-400"
                style={{ borderStyle: "dashed" }}
              />
              <span>תבנית</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-white/10 text-[10px] text-slate-400 leading-relaxed">
            הקישו על צומת לפתיחת פרטים · צבטו להגדלה · גררו להזזה
          </div>
        </div>
      )}

      {/* ── Selected prompt panel ── */}
      {/* Desktop: left slide-in panel */}
      <div
        className={cn(
          "hidden md:flex absolute top-0 left-0 h-full w-72 flex-col bg-black/80 backdrop-blur-lg border-r border-white/10 shadow-2xl z-20 transition-transform duration-300",
          selectedPrompt ? "translate-x-0" : "-translate-x-full pointer-events-none",
        )}
        dir="rtl"
      >
        <SelectedPromptPanel
          prompt={selectedPrompt}
          onClose={() => setSelectedPrompt(null)}
          onUse={(p) => {
            onUsePrompt(p);
            setSelectedPrompt(null);
          }}
          onSaveTitle={async (id, title) => {
            await updatePrompt(id, { title });
            setSelectedPrompt((prev) => (prev && prev.id === id ? { ...prev, title } : prev));
          }}
          onSaveTags={async (id, tags) => {
            await updateTags(id, tags);
            setSelectedPrompt((prev) => (prev && prev.id === id ? { ...prev, tags } : prev));
          }}
        />
      </div>

      {/* Mobile: bottom sheet */}
      {selectedPrompt && (
        <div
          className="md:hidden fixed inset-x-0 bottom-0 z-[60] bg-black/90 backdrop-blur-xl border-t border-white/15 rounded-t-2xl shadow-2xl max-h-[65vh] overflow-y-auto"
          dir="rtl"
        >
          <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mt-3 mb-2" />
          <SelectedPromptPanel
            prompt={selectedPrompt}
            onClose={() => setSelectedPrompt(null)}
            onUse={(p) => {
              onUsePrompt(p);
              setSelectedPrompt(null);
            }}
            onSaveTitle={async (id, title) => {
              await updatePrompt(id, { title });
              setSelectedPrompt((prev) => (prev && prev.id === id ? { ...prev, title } : prev));
            }}
            onSaveTags={async (id, tags) => {
              await updateTags(id, tags);
              setSelectedPrompt((prev) => (prev && prev.id === id ? { ...prev, tags } : prev));
            }}
          />
        </div>
      )}

      {/* Feature 5 — edge hover tooltip */}
      {hoverLink && hoverLinkPos && !hoverNode && (
        <div
          className="pointer-events-none absolute z-30 max-w-[260px] rounded-lg border border-white/15 bg-black/85 backdrop-blur-xl px-2.5 py-1.5 shadow-xl text-[11px] text-slate-100"
          style={{
            left: Math.max(8, Math.min(dimensions.width - 270, hoverLinkPos.x + 14)),
            top: Math.max(8, Math.min(dimensions.height - 60, hoverLinkPos.y + 14)),
          }}
          dir="rtl"
        >
          {describeEdge(hoverLink)}
        </div>
      )}
    </div>
  );
}

// ── Extracted panel component ─────────────────────────────────────────────────

function SelectedPromptPanel({
  prompt,
  onClose,
  onUse,
  onSaveTitle,
  onSaveTags,
}: {
  prompt: PersonalPrompt | null;
  onClose: () => void;
  onUse: (p: PersonalPrompt) => void;
  onSaveTitle: (id: string, title: string) => Promise<void>;
  onSaveTags: (id: string, tags: string[]) => Promise<void>;
}) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [savingTitle, setSavingTitle] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [savingTags, setSavingTags] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (prompt) setTitleDraft(prompt.title);
    setEditingTitle(false);
    setTagInput("");
  }, [prompt?.id]);

  useEffect(() => {
    if (editingTitle) titleRef.current?.focus();
  }, [editingTitle]);

  if (!prompt) return null;

  const cap = prompt.capability_mode ?? CapabilityMode.STANDARD;
  const color = CAPABILITY_COLORS[cap];
  const total = (prompt.success_count ?? 0) + (prompt.fail_count ?? 0);
  const successPct = total > 0 ? Math.round(((prompt.success_count ?? 0) / total) * 100) : null;

  const handleSaveTitle = async () => {
    const trimmed = titleDraft.trim();
    if (!trimmed || trimmed === prompt.title) {
      setEditingTitle(false);
      return;
    }
    setSavingTitle(true);
    try {
      await onSaveTitle(prompt.id, trimmed);
    } finally {
      setSavingTitle(false);
      setEditingTitle(false);
    }
  };

  const handleAddTag = async () => {
    const tag = tagInput.trim().toLowerCase();
    if (!tag || prompt.tags?.includes(tag)) {
      setTagInput("");
      return;
    }
    const newTags = [...(prompt.tags ?? []), tag];
    setSavingTags(true);
    setTagInput("");
    try {
      await onSaveTags(prompt.id, newTags);
    } finally {
      setSavingTags(false);
    }
  };

  const handleRemoveTag = async (tag: string) => {
    const newTags = (prompt.tags ?? []).filter((t) => t !== tag);
    setSavingTags(true);
    try {
      await onSaveTags(prompt.id, newTags);
    } finally {
      setSavingTags(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0 gap-2">
        {editingTitle ? (
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <input
              ref={titleRef}
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveTitle();
                if (e.key === "Escape") setEditingTitle(false);
              }}
              className="flex-1 min-w-0 text-sm font-semibold text-white bg-white/10 rounded-md px-2 py-0.5 outline-none border border-white/20 focus:border-amber-400/60"
              disabled={savingTitle}
              dir="auto"
            />
            <button
              onClick={handleSaveTitle}
              disabled={savingTitle}
              className="p-1 rounded text-green-400 hover:text-green-300 hover:bg-white/10"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setEditingTitle(false)}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <h3
            className="text-sm font-semibold text-white truncate flex-1 cursor-pointer hover:text-amber-300 transition-colors"
            title="לחץ לעריכת כותרת"
            onClick={() => setEditingTitle(true)}
          >
            {prompt.title}
          </h3>
        )}
        {!editingTitle && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
            aria-label="סגור"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="px-4 py-3 flex-1 flex flex-col gap-3 overflow-y-auto">
        {/* Capability + badges row */}
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full border"
            style={{ color, borderColor: color + "55", backgroundColor: color + "18" }}
          >
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
            {CAPABILITY_LABELS[cap]}
          </span>
          {prompt.is_template && (
            <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border border-cyan-400/40 text-cyan-300 bg-cyan-400/10">
              <BookTemplate className="w-3 h-3" />
              תבנית
            </span>
          )}
          {(prompt.is_pinned || prompt.use_count > 0) && (
            <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border border-amber-400/40 text-amber-300 bg-amber-400/10">
              <Star className="w-3 h-3" />
              {prompt.is_pinned ? "מוצמד" : `${prompt.use_count} שימושים`}
            </span>
          )}
        </div>

        {/* Prompt text */}
        <p className="text-xs text-slate-300 leading-relaxed line-clamp-6 whitespace-pre-line bg-white/4 rounded-lg p-2.5">
          {prompt.prompt}
        </p>

        {/* Tags — editable */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1 flex-wrap">
            <Tag className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            {(prompt.tags ?? []).slice(0, 15).map((tag) => (
              <button
                key={tag}
                onClick={() => !savingTags && handleRemoveTag(tag)}
                disabled={savingTags}
                className="group flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-white/8 text-slate-300 text-[10px] border border-white/8 hover:bg-red-500/20 hover:border-red-500/30 hover:text-red-300 transition-colors"
                title="הסר תגית"
              >
                {tag}
                <X className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
          {/* Add tag input */}
          <div className="flex items-center gap-1">
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddTag();
              }}
              placeholder="+ תגית חדשה"
              disabled={savingTags}
              dir="auto"
              className="flex-1 text-[11px] bg-white/5 border border-white/10 rounded-md px-2 py-1 text-slate-300 placeholder-slate-600 outline-none focus:border-amber-400/40 transition-colors"
            />
            {tagInput.trim() && (
              <button
                onClick={handleAddTag}
                disabled={savingTags}
                className="p-1.5 rounded-md bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 transition-colors"
              >
                <Plus className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Template variables */}
        {prompt.template_variables && prompt.template_variables.length > 0 && (
          <div className="flex items-start gap-1.5 flex-wrap">
            <span className="text-[10px] text-cyan-400 shrink-0 mt-0.5">משתנים:</span>
            {prompt.template_variables.map((v) => (
              <span
                key={v}
                className="px-1.5 py-0.5 rounded-md bg-cyan-400/10 text-cyan-300 text-[10px] border border-cyan-400/20"
              >
                {"{{"}
                {v}
                {"}}"}
              </span>
            ))}
          </div>
        )}

        {/* Stats row */}
        <div className="flex items-center gap-4 text-[11px] text-slate-500">
          {prompt.use_count > 0 && (
            <div className="flex items-center gap-1">
              <BarChart2 className="w-3 h-3" />
              <span>{prompt.use_count} שימושים</span>
            </div>
          )}
          {successPct !== null && (
            <div
              className="flex items-center gap-1"
              style={{
                color: successPct > 70 ? "#22c55e" : successPct > 40 ? "#f59e0b" : "#ef4444",
              }}
            >
              <span>{successPct}% הצלחה</span>
            </div>
          )}
          {prompt.last_used_at && (
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{new Date(prompt.last_used_at).toLocaleDateString("he-IL")}</span>
            </div>
          )}
        </div>

        {/* Category */}
        {prompt.personal_category && (
          <div className="text-[11px] text-slate-500">
            תיקייה: <span className="text-slate-300">{prompt.personal_category}</span>
          </div>
        )}
      </div>

      {/* Use button */}
      <div className="px-4 pb-5 shrink-0">
        <button
          onClick={() => onUse(prompt)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-black transition-all shadow-lg hover:scale-[1.02] active:scale-[0.98]"
          style={{ backgroundColor: CAPABILITY_COLORS[cap] }}
        >
          <Zap className="w-4 h-4" />
          השתמש בפרומפט
        </button>
      </div>
    </>
  );
}
