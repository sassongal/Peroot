"use client";

import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { X, BarChart2, Star, BookTemplate } from "lucide-react";
import type { PersonalPrompt, LibraryPrompt } from "@/lib/types";
import { CapabilityMode } from "@/lib/capability-mode";
import {
  buildGraphData,
  CAPABILITY_COLORS,
  CAPABILITY_HIGHLIGHT,
  type GraphNode,
  type GraphLink,
} from "./graph-utils";
import { cn } from "@/lib/utils";
import { scoreInput } from "@/lib/engines/scoring/input-scorer";
import { useLibraryContext } from "@/context/LibraryContext";
import { useTheme } from "@/components/providers/ThemeProvider";
import { PromptNodeCard } from "./PromptNodeCard";

// SSR-safe — `react-force-graph-3d` bundles THREE at module-eval, so it must
// be loaded client-only.
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

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function PromptGraphView({
  prompts,
  favoriteIds,
  onUsePrompt,
  isLoading = false,
  truncatedAt = null,
}: Props) {
  const { updateTags, updatePrompt, libraryPrompts, startEditingPersonalPrompt } =
    useLibraryContext();
  const libraryPromptsTyped = libraryPrompts as LibraryPrompt[] | undefined;
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const containerRef = useRef<HTMLDivElement>(null);
  const backBtnRef = useRef<HTMLButtonElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [selectedPrompt, setSelectedPrompt] = useState<PersonalPrompt | null>(null);
  const [hoverNode, setHoverNode] = useState<GraphNode | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const [mobileLegendOpen, setMobileLegendOpen] = useState(false);
  // Preserve node positions across graphData rebuilds so the simulation doesn't restart
  const positionMapRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const fg3dRef = useRef<{
    cameraPosition?: (
      pos: { x: number; y: number; z: number },
      lookAt?: { x: number; y: number; z: number },
      ms?: number,
    ) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    graphData?: () => { nodes: any[] };
    d3ReheatSimulation?: () => void;
  } | null>(null);

  // Feature 2 — search + filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [capabilityFilter, setCapabilityFilter] = useState<Set<CapabilityMode>>(new Set());
  const [favOnly, setFavOnly] = useState(false);
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

  // Info banner — shown once, dismissible
  const [bannerDismissed, setBannerDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return !!localStorage.getItem("peroot:graph-banner-seen");
    } catch {
      return false;
    }
  });
  const dismissBanner = useCallback(() => {
    setBannerDismissed(true);
    try {
      localStorage.setItem("peroot:graph-banner-seen", "1");
    } catch {}
  }, []);

  // Sync selectedPrompt with fresh library data so pin/folder/title updates
  // made inside the card are reflected without reopening it.
  useEffect(() => {
    if (!selectedPrompt) return;
    const fresh = prompts.find((p) => p.id === selectedPrompt.id);
    if (fresh) setSelectedPrompt(fresh);
    // prompts is the only dep — intentionally omit selectedPrompt to avoid loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prompts]);

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

  const scoreMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of prompts) {
      const result = scoreInput(p.prompt ?? "", p.capability_mode ?? CapabilityMode.STANDARD);
      m.set(p.id, result.total);
    }
    return m;
  }, [prompts]);

  const graphData = useMemo(() => {
    const data = buildGraphData(prompts, favoriteIds, scoreMap);
    // Restore saved positions so the simulation doesn't restart from scratch
    data.nodes.forEach((n) => {
      const saved = positionMapRef.current.get(n.id);
      if (saved) {
        n.x = saved.x;
        n.y = saved.y;
      }
    });
    return data;
  }, [prompts, favoriteIds, scoreMap]);

  // Indexed lookup — avoids O(n) .find() per edge hover on large libraries.
  const promptById = useMemo(() => {
    const m = new Map<string, PersonalPrompt>();
    for (const p of prompts) m.set(p.id, p);
    return m;
  }, [prompts]);

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

  // When filters are active, hide non-matching prompt nodes outright so the
  // 3D WebGL renderer stays clean. Category / library anchor nodes are always
  // kept so the scaffolding survives aggressive filters.
  const visibleGraphData = useMemo(() => {
    if (!matchedIds) return graphData;
    const keep = new Set<string>();
    for (const n of graphData.nodes) {
      if (n.type !== "prompt") keep.add(n.id);
      else if (matchedIds.has(n.id)) keep.add(n.id);
    }
    const nodes = graphData.nodes.filter((n) => keep.has(n.id));
    const links = graphData.links.filter((l) => {
      const src = typeof l.source === "object" ? l.source.id : l.source;
      const tgt = typeof l.target === "object" ? l.target.id : l.target;
      return keep.has(src) && keep.has(tgt);
    });
    return { nodes, links };
  }, [graphData, matchedIds]);

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
      }
    },
    [savePositions],
  );

  // Direct pointer-based click detection on the container div.
  // Captures the hovered node at pointerdown so we don't miss it if the
  // library's hover state updates asynchronously between down and up.
  const pointerDownRef = useRef<{ x: number; y: number; node: GraphNode | null } | null>(null);
  // Keep a ref to hoverNode so handlers can read it without stale closure
  const hoverNodeRef = useRef<GraphNode | null>(null);
  useEffect(() => {
    hoverNodeRef.current = hoverNode;
  }, [hoverNode]);

  const handleContainerPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    pointerDownRef.current = { x: e.clientX, y: e.clientY, node: hoverNodeRef.current };
  }, []);

  const handleContainerPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      const down = pointerDownRef.current;
      pointerDownRef.current = null;
      if (!down) return;
      const dx = e.clientX - down.x;
      const dy = e.clientY - down.y;
      // Only treat as a click if pointer moved < 8px (generous for touch)
      if (Math.sqrt(dx * dx + dy * dy) > 8) return;
      // Prefer node captured at pointerdown; fall back to current hover
      const clicked = down.node ?? hoverNodeRef.current;
      if (clicked && clicked.type === "prompt" && clicked.prompt) {
        savePositions();
        setSelectedPrompt((prev) => (prev?.id === clicked.prompt!.id ? null : clicked.prompt!));
        setFocusedId((prev) => (prev === clicked.id ? null : clicked.id));
      }
    },
    [savePositions],
  );

  // Pin the node at its dragged position so it stays put after drag.
  // The library's clickAfterDrag(false) already ensures onNodeClick won't
  // fire after a drag, so no extra guard is needed here.
  const handleNodeDragEnd = useCallback((node: GraphNode) => {
    node.fx = node.x;
    node.fy = node.y;
    node.fz = node.z;
    fg3dRef.current?.d3ReheatSimulation?.();
  }, []);

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

  // Colors kept in lockstep with the on-screen legend. If you change a value
  // here, update the legend swatches in the Legend block below to match.
  const linkColor = useCallback(
    (link: GraphLink) => {
      const src = typeof link.source === "object" ? link.source.id : link.source;
      const tgt = typeof link.target === "object" ? link.target.id : link.target;
      const isConnectedLink = !connectedIds || connectedIds.has(src) || connectedIds.has(tgt);
      const bothVisible = isNodeVisible(src) && isNodeVisible(tgt);
      const baseAlpha = !bothVisible ? 0.05 : isConnectedLink ? 1 : 0.1;
      // Light backgrounds wash out faint edges — boost alpha to compensate
      const f = isDark ? 1 : 1.4;
      const a = (v: number) => Math.min(1, v * f);

      if (link.type === "tag") return `rgba(245,158,11,${a(0.9 * baseAlpha)})`;
      if (link.type === "reference") return `rgba(168,85,247,${a(0.85 * baseAlpha)})`;
      if (link.type === "template") return `rgba(34,211,238,${a(0.8 * baseAlpha)})`;
      if (link.type === "similarity") {
        // Emerald teal — scale alpha with shared-keyword strength, min 0.65
        const s = Math.min(0.95, 0.5 + (link.strength ?? 1) * 0.15);
        return `rgba(45,212,191,${a(s * baseAlpha)})`;
      }
      if (link.type === "temporal") return `rgba(148,163,184,${a(0.55 * baseAlpha)})`;
      if (link.type === "capability") return `rgba(148,163,184,${a(0.12 * baseAlpha)})`;
      return `rgba(148,163,184,${a(0.15 * baseAlpha)})`;
    },
    [connectedIds, isNodeVisible, isDark],
  );

  const linkWidth = useCallback((link: GraphLink) => {
    if (link.type === "tag") return Math.min(4, 1.4 + (link.strength ?? 1) * 0.6);
    if (link.type === "similarity") return Math.min(3.2, 1.4 + (link.strength ?? 1) * 0.35);
    if (link.type === "template") return 1.6;
    if (link.type === "reference") return 1.8;
    if (link.type === "temporal") return 0.7;
    return 0.8;
  }, []);

  // In 3D (WebGL) we can't draw dashed lines, so template/temporal edges use
  // evenly spaced directional particles to convey the "dashed"/"dotted" rhythm
  // shown in the legend. Solid link types (tag / similarity / reference) get
  // 0–3 particles just to hint at flow direction.
  const linkDirectionalParticles = useCallback((link: GraphLink) => {
    if (link.type === "template") return 4; // dashed cyan — משתנה משותף
    if (link.type === "temporal") return 5; // dotted gray — נוצרו יחד
    if (link.type === "reference") return 3;
    if (link.type === "similarity") return (link.strength ?? 0) >= 2 ? 2 : 1;
    if (link.type === "tag") return (link.strength ?? 0) > 1 ? 2 : 1;
    return 0;
  }, []);

  const linkDirectionalParticleColor = useCallback((link: GraphLink) => {
    if (link.type === "template") return "rgba(94,234,252,0.95)";
    if (link.type === "temporal") return "rgba(203,213,225,0.9)";
    if (link.type === "reference") return "rgba(192,132,252,0.95)";
    if (link.type === "similarity") return "rgba(94,234,212,0.95)";
    if (link.type === "tag") return "rgba(251,191,36,0.95)";
    return "rgba(148,163,184,0.8)";
  }, []);

  const linkDirectionalParticleWidth = useCallback((link: GraphLink) => {
    if (link.type === "temporal") return 1.2; // small dots
    if (link.type === "template") return 1.6; // dashes
    return 2.2;
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

  // "Fit" toolbar — recomputes camera distance from the settled bounding sphere
  // so tiny and sparse graphs both fit on-screen.
  const handleFitView = useCallback(() => {
    const fg = fg3dRef.current;
    if (!fg?.cameraPosition) return;
    try {
      const nodes = (fg.graphData?.()?.nodes ?? []) as Array<{
        x?: number;
        y?: number;
        z?: number;
      }>;
      if (nodes.length === 0) return;
      let maxR = 0;
      for (const n of nodes) {
        const r = Math.hypot(n.x ?? 0, n.y ?? 0, n.z ?? 0);
        if (r > maxR) maxR = r;
      }
      const distance = Math.max(160, Math.min(900, maxR * 2.6 + 120));
      fg.cameraPosition({ x: 0, y: 0, z: distance }, { x: 0, y: 0, z: 0 }, 800);
    } catch {}
  }, []);

  // 3D: fit camera to settled node cloud after the engine cools down.
  // Small graphs would otherwise spawn inside a single sphere.
  const handle3DEngineStop = useCallback(() => {
    const fg = fg3dRef.current;
    if (!fg?.cameraPosition) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const nodes = (fg.graphData?.()?.nodes ?? []) as Array<{
        x?: number;
        y?: number;
        z?: number;
      }>;
      if (nodes.length === 0) return;
      let maxR = 0;
      for (const n of nodes) {
        const r = Math.hypot(n.x ?? 0, n.y ?? 0, n.z ?? 0);
        if (r > maxR) maxR = r;
      }
      // Camera distance: clamp to avoid either clipping inside the cluster
      // (tiny graphs) or flying out to infinity (huge graphs).
      const distance = Math.max(160, Math.min(900, maxR * 2.6 + 120));
      fg.cameraPosition({ x: 0, y: 0, z: distance }, { x: 0, y: 0, z: 0 }, 800);
    } catch {}
  }, []);

  // Feature 3 — click on empty canvas clears focus and fits the graph.
  // Guard: only reset when something is actually focused/selected, so casual
  // pan-clicks on the background don't constantly refit the camera.
  const handleBackgroundClick = useCallback(() => {
    if (!focusedId && !selectedPrompt) return;
    setFocusedId(null);
    setSelectedPrompt(null);
    handleFitView();
  }, [focusedId, selectedPrompt, handleFitView]);

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
        // Modal takes priority — close it first without clearing filters.
        if (selectedPrompt) {
          setSelectedPrompt(null);
        } else if (searchQuery || capabilityFilter.size > 0 || favOnly || focusedId) {
          setSearchQuery("");
          setCapabilityFilter(new Set());
          setFavOnly(false);
          setFocusedId(null);
          handleFitView();
        }
        dismissHint();
      } else if ((e.key === "f" || e.key === "F") && !isTyping) {
        setFavOnly((v) => !v);
        dismissHint();
      } else if ((e.key === "r" || e.key === "R") && !isTyping) {
        try {
          fg3dRef.current?.d3ReheatSimulation?.();
        } catch {}
        dismissHint();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    searchQuery,
    capabilityFilter,
    favOnly,
    focusedId,
    selectedPrompt,
    dismissHint,
    handleFitView,
  ]);

  // When the prompt modal opens, move focus to the back button so keyboard
  // users land inside the dialog instead of still on the graph canvas.
  useEffect(() => {
    if (selectedPrompt) {
      const t = setTimeout(() => backBtnRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [selectedPrompt]);

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
    <div className="relative w-full flex-1 min-h-[500px] rounded-2xl overflow-hidden border border-slate-200/50 dark:border-white/10 flex flex-col">
      {/* Graph info banner — shown once, dismissible */}
      {!bannerDismissed && (
        <div
          className="flex-shrink-0 flex items-start gap-2.5 px-4 py-2.5 border-b border-slate-200/60 dark:border-white/10 bg-amber-50/90 dark:bg-amber-500/5"
          dir="rtl"
        >
          <BarChart2 className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="flex-1 text-[12px] leading-relaxed text-slate-700 dark:text-slate-300">
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              גרף קשרי הפרומפטים —{" "}
            </span>
            כל פרומפט מיוצג כצומת צבעוני לפי סוג. קשרים מראים תגיות משותפות, משתנים, קטגוריה, וקרבה
            בזמן. לחץ על צומת לפתיחת פרטים · גרור לסידור מחדש · צבוט להגדלה.
          </p>
          <button
            onClick={dismissBanner}
            className="p-1 shrink-0 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded transition-colors"
            aria-label="סגור הסבר"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      {/* Graph area */}
      <div
        className="relative flex-1 backdrop-blur-sm"
        style={{
          background: isDark
            ? "radial-gradient(120% 80% at 50% 0%, rgba(168,85,247,0.10) 0%, rgba(59,130,246,0.06) 35%, rgba(2,6,23,0.55) 75%), " +
              "radial-gradient(80% 60% at 100% 100%, rgba(245,158,11,0.08) 0%, transparent 70%), " +
              "linear-gradient(180deg, rgba(2,6,23,0.55), rgba(2,6,23,0.75))"
            : "radial-gradient(120% 80% at 50% 0%, rgba(168,85,247,0.07) 0%, rgba(59,130,246,0.05) 35%, rgba(241,245,249,0.90) 75%), " +
              "radial-gradient(80% 60% at 100% 100%, rgba(245,158,11,0.05) 0%, transparent 70%), " +
              "linear-gradient(180deg, rgba(248,250,252,0.85), rgba(241,245,249,0.95))",
        }}
      >
        {/* Subtle dotted grid overlay for depth */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.18] mix-blend-overlay"
          style={{
            backgroundImage: isDark
              ? "radial-gradient(rgba(255,255,255,0.35) 1px, transparent 1px)"
              : "radial-gradient(rgba(0,0,0,0.10) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />
        {/* Feature 2 — search + filter bar */}
        <div
          className="absolute top-3 inset-x-3 md:inset-x-auto md:right-3 z-30 flex flex-col md:flex-row md:items-center gap-1.5 md:gap-2 rounded-xl border border-slate-200/60 dark:border-white/10 bg-white/80 dark:bg-black/55 backdrop-blur-xl px-2.5 py-2 shadow-xl"
          dir="rtl"
        >
          {/* Row 1 (mobile): search input + fit button */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 md:flex-initial">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="חפש פרומפט… (/)"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                className="w-full md:w-60 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-sm text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-amber-400/60 focus:bg-white dark:focus:bg-white/10 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                  aria-label="נקה חיפוש"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {/* Fit button in row 1 on mobile only */}
            <button
              onClick={handleFitView}
              className="md:hidden shrink-0 text-[11px] px-2 py-1 rounded-md border border-slate-300 dark:border-white/15 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/8 transition-colors"
              title="התאם לתצוגה"
              aria-label="התאם לתצוגה"
            >
              התאם
            </button>
          </div>
          {/* Row 2 (mobile): capability chips + favorites — horizontal scroll; desktop: flex-wrap continues the row */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none flex-nowrap md:flex-wrap pb-0.5 md:pb-0">
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
                    "shrink-0 text-[11px] px-2 py-1 rounded-md border transition-colors",
                    active
                      ? "border-transparent text-black font-semibold"
                      : "border-slate-300 dark:border-white/15 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/8",
                  )}
                  style={active ? { backgroundColor: CAPABILITY_COLORS[cap] } : undefined}
                  title={CAPABILITY_LABELS[cap]}
                >
                  {CAPABILITY_LABELS[cap]}
                </button>
              );
            })}
            <button
              onClick={() => setFavOnly((v) => !v)}
              className={cn(
                "shrink-0 text-[11px] px-2 py-1 rounded-md border flex items-center gap-1 transition-colors",
                favOnly
                  ? "bg-amber-400/90 border-transparent text-black font-semibold"
                  : "border-slate-300 dark:border-white/15 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/8",
              )}
              aria-pressed={favOnly}
            >
              <Star className={cn("w-3 h-3", favOnly && "fill-black")} />
              מועדפים
            </button>
          </div>
          {/* Fit button on desktop only */}
          <button
            onClick={handleFitView}
            className="hidden md:block shrink-0 text-[11px] px-2 py-1 rounded-md border border-slate-300 dark:border-white/15 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/8 transition-colors"
            title="התאם לתצוגה"
            aria-label="התאם לתצוגה"
          >
            התאם
          </button>
        </div>

        {/* Filter chips — always-visible summary of active filters with
          individual remove buttons. Easier than reading button states. */}
        {(searchQuery || capabilityFilter.size > 0 || favOnly) && (
          <div
            className="absolute top-[4.5rem] md:top-14 inset-x-3 md:inset-x-auto md:right-3 z-20 flex flex-wrap items-center gap-1.5"
            dir="rtl"
          >
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-[10px] px-2 py-1 rounded-full bg-amber-100/80 dark:bg-amber-500/20 text-amber-700 dark:text-amber-200 border border-amber-400/40 dark:border-amber-400/30 hover:bg-amber-200/80 dark:hover:bg-amber-500/30 transition-colors flex items-center gap-1"
              >
                <span>חיפוש: {searchQuery}</span>
                <X className="w-2.5 h-2.5" />
              </button>
            )}
            {Array.from(capabilityFilter).map((cap) => (
              <button
                key={cap}
                onClick={() =>
                  setCapabilityFilter((prev) => {
                    const next = new Set(prev);
                    next.delete(cap);
                    return next;
                  })
                }
                className="text-[10px] px-2 py-1 rounded-full text-black font-semibold border border-transparent hover:opacity-85 transition-opacity flex items-center gap-1"
                style={{ backgroundColor: CAPABILITY_COLORS[cap] }}
              >
                <span>{CAPABILITY_LABELS[cap]}</span>
                <X className="w-2.5 h-2.5" />
              </button>
            ))}
            {favOnly && (
              <button
                onClick={() => setFavOnly(false)}
                className="text-[10px] px-2 py-1 rounded-full bg-amber-400/90 text-black font-semibold border border-transparent hover:bg-amber-400 transition-colors flex items-center gap-1"
              >
                <Star className="w-2.5 h-2.5 fill-black" />
                <span>מועדפים</span>
                <X className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
        )}

        {/* Feature 6 — first-visit hint */}
        {showHint && (
          <div
            onClick={dismissHint}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 rounded-full border border-slate-200/60 dark:border-white/15 bg-white/85 dark:bg-black/75 backdrop-blur-xl px-4 py-2 text-xs text-slate-700 dark:text-slate-200 shadow-xl cursor-pointer"
            dir="rtl"
          >
            טיפ: <kbd className="px-1 bg-slate-100 dark:bg-white/10 rounded">/</kbd> חיפוש ·{" "}
            <kbd className="px-1 bg-slate-100 dark:bg-white/10 rounded">Esc</kbd> איפוס ·{" "}
            <kbd className="px-1 bg-slate-100 dark:bg-white/10 rounded">F</kbd> מועדפים ·{" "}
            <kbd className="px-1 bg-slate-100 dark:bg-white/10 rounded">R</kbd> רעיון מחדש
          </div>
        )}

        {/* Loading overlay while fetching all prompts */}
        {isLoading && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-white/50 dark:bg-black/40 backdrop-blur-sm">
            <div className="w-10 h-10 rounded-full border-2 border-amber-500/30 border-t-amber-400 animate-spin" />
            <p className="text-sm text-slate-500 dark:text-slate-400">
              טוען את כל הפרומפטים לגרף...
            </p>
          </div>
        )}

        {/* Stats HUD — tells the user what they're actually looking at. */}
        {!isLoading && graphData.nodes.length > 0 && (
          <div
            className="absolute bottom-3 right-3 z-20 flex items-center gap-2 rounded-full border border-slate-200/60 dark:border-white/10 bg-white/80 dark:bg-black/55 backdrop-blur-xl px-3 py-1.5 text-[11px] text-slate-600 dark:text-slate-300 shadow-lg pointer-events-none"
            dir="rtl"
          >
            <span>{visibleGraphData.nodes.filter((n) => n.type === "prompt").length} פרומפטים</span>
            <span className="text-slate-400 dark:text-slate-600">·</span>
            <span>{visibleGraphData.links.length} קשרים</span>
            {matchedIds && (
              <>
                <span className="text-slate-400 dark:text-slate-600">·</span>
                <span className="text-amber-300">מסונן</span>
              </>
            )}
          </div>
        )}

        {/* Empty-state — filters match zero prompts. Without this the canvas
          just goes blank and users think the feature broke. */}
        {!isLoading &&
          matchedIds !== null &&
          visibleGraphData.nodes.filter((n) => n.type === "prompt").length === 0 && (
            <div
              className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 pointer-events-none"
              dir="rtl"
            >
              <div className="rounded-2xl border border-slate-200/60 dark:border-white/10 bg-white/90 dark:bg-black/70 backdrop-blur-xl px-5 py-4 text-center shadow-xl pointer-events-auto">
                <p className="text-sm text-slate-800 dark:text-slate-200 font-medium">
                  אין תוצאות לסינון הנוכחי
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  נסה לנקות את הסינון או החיפוש
                </p>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setCapabilityFilter(new Set());
                    setFavOnly(false);
                  }}
                  className="mt-3 text-[11px] px-3 py-1 rounded-md bg-amber-400 text-black font-semibold hover:bg-amber-300 transition-colors cursor-pointer"
                >
                  נקה סינון
                </button>
              </div>
            </div>
          )}
        <div
          ref={containerRef}
          onPointerMove={handlePointerMove}
          onPointerDown={handleContainerPointerDown}
          onPointerUp={handleContainerPointerUp}
          className="w-full h-[calc(100vh-15rem)] min-h-[480px] md:h-[calc(100vh-13rem)] relative"
        >
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <ForceGraph3D
            key="fg-3d"
            ref={fg3dRef as any}
            graphData={visibleGraphData as any}
            width={dimensions.width}
            height={dimensions.height}
            nodeId="id"
            nodeLabel={((n: GraphNode) => n.label) as any}
            nodeVal={
              ((n: GraphNode) => {
                if (n.type === "tag") return 3;
                if (n.type === "library") return 5;
                // Size = score-driven: 0→4, 50→9, 100→18
                const s = n.score ?? 50;
                return Math.max(4, Math.min(18, 4 + (s / 100) * 14));
              }) as any
            }
            nodeColor={
              ((n: GraphNode) => {
                if (n.type === "tag") return "#f59e0b"; // amber — matches legend
                if (n.type === "library") return "#a855f7"; // purple — matches legend
                const hex = CAPABILITY_COLORS[n.capability ?? CapabilityMode.STANDARD];
                const s = n.score ?? 50;
                const alpha = s < 40 ? 0.55 : s < 70 ? 0.55 + ((s - 40) / 30) * 0.45 : 1.0;
                return alpha >= 1.0 ? hex : hexToRgba(hex, alpha);
              }) as any
            }
            nodeOpacity={0.95}
            nodeResolution={graphData.nodes.length > 80 ? 12 : 16}
            linkColor={linkColor as any}
            linkWidth={linkWidth as any}
            linkOpacity={1}
            linkDirectionalParticles={linkDirectionalParticles as any}
            linkDirectionalParticleWidth={linkDirectionalParticleWidth as any}
            linkDirectionalParticleSpeed={graphData.nodes.length < 15 ? 0.004 : 0.006}
            linkDirectionalParticleColor={linkDirectionalParticleColor as any}
            onNodeClick={handleNodeClick as any}
            onNodeDragEnd={handleNodeDragEnd as any}
            onNodeHover={handleNodeHover as any}
            onLinkHover={handleLinkHover as any}
            onBackgroundClick={handleBackgroundClick as any}
            onEngineStop={handle3DEngineStop}
            backgroundColor="rgba(2,6,23,0)"
            showNavInfo={false}
            enableNodeDrag
            enableNavigationControls
            controlType="orbit"
            cooldownTicks={200}
            warmupTicks={60}
            d3AlphaDecay={0.018}
            d3VelocityDecay={0.28}
            rendererConfig={{ alpha: true, antialias: true, powerPreference: "low-power" }}
          />
        </div>

        {/* Floating hover tooltip — shows a peek card next to the cursor */}
        {hoverNode && hoverPos && hoverNode.type === "prompt" && hoverNode.prompt && (
          <div
            className="pointer-events-none absolute z-30 max-w-[240px] rounded-xl border border-slate-200/60 dark:border-white/15 bg-white/95 dark:bg-black/85 backdrop-blur-xl px-3 py-2 shadow-2xl text-right"
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
                  backgroundColor:
                    CAPABILITY_COLORS[hoverNode.capability ?? CapabilityMode.STANDARD],
                }}
              />
              <span className="text-[10px] font-medium text-slate-400">
                {CAPABILITY_LABELS[hoverNode.capability ?? CapabilityMode.STANDARD]}
              </span>
              {hoverNode.isFavorite && <Star className="w-3 h-3 text-amber-400 fill-amber-400" />}
              {hoverNode.isTemplate && <BookTemplate className="w-3 h-3 text-cyan-400" />}
            </div>
            <div className="text-sm font-semibold text-slate-900 dark:text-white line-clamp-2 leading-snug">
              {hoverNode.label}
            </div>
            {hoverNode.prompt.personal_category && (
              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                {hoverNode.prompt.personal_category}
              </div>
            )}
            {hoverNode.successRate !== undefined && (
              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                הצלחה: {Math.round(hoverNode.successRate * 100)}%
              </div>
            )}
            {hoverNode.score !== undefined && (
              <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                ציון: {hoverNode.score}
              </div>
            )}
            {(hoverNode.prompt.tags ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {(hoverNode.prompt.tags ?? []).slice(0, 4).map((t) => (
                  <span
                    key={t}
                    className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/8 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Legend — desktop: bottom-left, mobile: hidden */}
        <div className="hidden md:flex absolute bottom-4 left-4 flex-col gap-2 bg-white/85 dark:bg-black/65 backdrop-blur-md rounded-xl px-3 py-2.5 border border-slate-200/60 dark:border-white/10 text-[10px] text-slate-700 dark:text-slate-300 z-10 select-none">
          <div className="font-semibold text-slate-800 dark:text-slate-200 text-[11px] mb-0.5">
            מקרא
          </div>
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
          <div className="border-t border-slate-200/60 dark:border-white/10 mt-1 pt-1.5 flex flex-col gap-1.5">
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
          <div className="border-t border-slate-200/60 dark:border-white/10 mt-1 pt-1.5 flex flex-col gap-1.5">
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
        <div className="hidden sm:block absolute top-3 right-3 bg-white/80 dark:bg-black/55 backdrop-blur-sm text-slate-600 dark:text-slate-400 text-[10px] px-2.5 py-1.5 rounded-lg border border-slate-200/60 dark:border-white/8 z-10 select-none leading-tight">
          <div>{prompts.length} פרומפטים</div>
          <div className="text-slate-400 dark:text-slate-500">גלגלת להגדלה · גרור להזזה</div>
        </div>

        {/* Truncation banner — library exceeds row cap */}
        {truncatedAt && (
          <div
            role="status"
            className="absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-amber-100/70 dark:bg-amber-500/15 backdrop-blur-sm text-amber-700 dark:text-amber-200 text-[11px] px-3 py-1.5 rounded-full border border-amber-400/50 dark:border-amber-400/30 select-none"
            dir="rtl"
          >
            מציג {truncatedAt.shown} מתוך {truncatedAt.total} פרומפטים
          </div>
        )}

        {/* Mobile legend toggle pill */}
        <button
          type="button"
          onClick={() => setMobileLegendOpen((o) => !o)}
          className="md:hidden absolute bottom-4 left-4 z-20 flex items-center gap-1.5 bg-white/85 dark:bg-black/75 backdrop-blur-md text-slate-700 dark:text-slate-200 text-[11px] px-3 py-2 rounded-full border border-slate-200/60 dark:border-white/15 shadow-lg active:scale-95 transition-transform"
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
            className="md:hidden absolute bottom-16 left-4 right-4 z-20 bg-white/95 dark:bg-black/90 backdrop-blur-xl rounded-2xl border border-slate-200/60 dark:border-white/15 p-4 shadow-2xl text-slate-700 dark:text-slate-200 text-xs"
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
            <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-white/10 text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
              הקישו על צומת לפתיחת פרטים · צבטו להגדלה · גררו להזזה
            </div>
          </div>
        )}

        {/* ── Selected prompt modal — fixed viewport overlay so overflow-hidden on parent doesn't clip it ── */}
        {selectedPrompt && (
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-3 md:p-6 bg-black/65 backdrop-blur-md animate-in fade-in duration-200"
            onClick={() => setSelectedPrompt(null)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="graph-modal-title"
            dir="rtl"
          >
            <div
              className="relative w-full max-w-2xl max-h-[88vh] md:max-h-[82vh] rounded-2xl border border-white/15 bg-slate-950/95 shadow-2xl [overflow:clip] flex flex-col animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <span id="graph-modal-title" className="sr-only">
                {CAPABILITY_LABELS[selectedPrompt.capability_mode ?? CapabilityMode.STANDARD]}
              </span>
              <PromptNodeCard
                prompt={selectedPrompt}
                backButtonRef={backBtnRef}
                onClose={() => setSelectedPrompt(null)}
                onUse={(p) => {
                  onUsePrompt(p);
                  setSelectedPrompt(null);
                }}
                onEdit={(p) => {
                  startEditingPersonalPrompt(p);
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
          </div>
        )}

        {/* Feature 5 — edge hover tooltip */}
        {hoverLink && hoverLinkPos && !hoverNode && (
          <div
            className="pointer-events-none absolute z-30 max-w-[260px] rounded-lg border border-slate-200/60 dark:border-white/15 bg-white/95 dark:bg-black/85 backdrop-blur-xl px-2.5 py-1.5 shadow-xl text-[11px] text-slate-800 dark:text-slate-100"
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
      {/* end graph area */}
    </div>
  );
}
