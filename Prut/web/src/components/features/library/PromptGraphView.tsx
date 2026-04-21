"use client";

import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { X, Zap, Tag, Clock, BarChart2, Star, BookTemplate } from "lucide-react";
import type { PersonalPrompt } from "@/lib/types";
import { CapabilityMode } from "@/lib/capability-mode";
import {
  buildGraphData,
  CAPABILITY_COLORS,
  CAPABILITY_HIGHLIGHT,
  type GraphNode,
  type GraphLink,
} from "./graph-utils";
import { cn } from "@/lib/utils";

// SSR-safe — canvas APIs require browser
const ForceGraph2D = dynamic(() => import("react-force-graph").then((m) => m.ForceGraph2D), {
  ssr: false,
});

interface Props {
  prompts: PersonalPrompt[];
  favoriteIds: Set<string>;
  onUsePrompt: (p: PersonalPrompt) => void;
}

const CAPABILITY_LABELS: Record<CapabilityMode, string> = {
  [CapabilityMode.STANDARD]: "רגיל",
  [CapabilityMode.IMAGE_GENERATION]: "תמונות",
  [CapabilityMode.DEEP_RESEARCH]: "מחקר",
  [CapabilityMode.AGENT_BUILDER]: "סוכן",
  [CapabilityMode.VIDEO_GENERATION]: "וידאו",
};

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

export function PromptGraphView({ prompts, favoriteIds, onUsePrompt }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [selectedPrompt, setSelectedPrompt] = useState<PersonalPrompt | null>(null);
  const [hoverNode, setHoverNode] = useState<GraphNode | null>(null);
  const tickRef = useRef(0);
  const rafRef = useRef<number>(0);
  const fgRef = useRef<{
    d3Force?: (
      name: string,
    ) => { strength?: (v: number) => unknown; distance?: (v: number) => unknown } | undefined;
  } | null>(null);

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

  const graphData = useMemo(() => buildGraphData(prompts, favoriteIds), [prompts, favoriteIds]);

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

  const handleNodeClick = useCallback((node: GraphNode) => {
    if (node.type === "prompt" && node.prompt) {
      setSelectedPrompt((prev) => (prev?.id === node.prompt!.id ? null : node.prompt!));
    }
  }, []);

  const handleNodeHover = useCallback((node: GraphNode | null) => {
    setHoverNode(node);
    if (typeof document !== "undefined") {
      document.body.style.cursor = node ? "pointer" : "default";
    }
  }, []);

  const nodeCanvasObject = useCallback(
    (node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const nx = node.x ?? 0;
      const ny = node.y ?? 0;
      const isHovered = hoverNode?.id === node.id;
      const isSelected = selectedPrompt?.id === node.id;
      const isConnected = connectedIds ? connectedIds.has(node.id) : true;
      const dimAlpha = connectedIds && !isConnected ? 0.18 : 1;

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

      // Outer glow (selected or hovered)
      if (isSelected || isHovered) {
        ctx.shadowColor = isSelected ? "#f59e0b" : color;
        ctx.shadowBlur = isSelected ? 18 : 12;
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

      // Success rate ring
      if (node.successRate !== undefined) {
        const ringColor =
          node.successRate > 0.7 ? "#22c55e" : node.successRate > 0.4 ? "#f59e0b" : "#ef4444";
        const innerR = radius - 1;
        ctx.beginPath();
        ctx.arc(nx, ny - innerR + 1.5, 1.5, 0, 2 * Math.PI);
        ctx.fillStyle = ringColor;
        ctx.fill();
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

      // Capability icon inside the node (only at sufficient size)
      if (radius > 9) {
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
    [hoverNode, selectedPrompt, connectedIds],
  );

  const linkColor = useCallback(
    (link: GraphLink) => {
      const src = typeof link.source === "object" ? link.source.id : link.source;
      const tgt = typeof link.target === "object" ? link.target.id : link.target;
      const isConnectedLink = !connectedIds || connectedIds.has(src) || connectedIds.has(tgt);
      const baseAlpha = isConnectedLink ? 1 : 0.08;

      if (link.type === "category") return `rgba(148,163,184,${0.25 * baseAlpha})`;
      if (link.type === "tag") return `rgba(245,158,11,${0.6 * baseAlpha})`;
      if (link.type === "reference") return `rgba(168,85,247,${0.6 * baseAlpha})`;
      if (link.type === "template") return `rgba(34,211,238,${0.5 * baseAlpha})`;
      return `rgba(148,163,184,${0.15 * baseAlpha})`;
    },
    [connectedIds],
  );

  const linkWidth = useCallback((link: GraphLink) => {
    if (link.type === "tag") return Math.min(3.5, 1 + (link.strength ?? 1) * 0.6);
    if (link.type === "template") return 1.5;
    if (link.type === "reference") return 1.5;
    return 0.8;
  }, []);

  const linkLineDash = useCallback((link: GraphLink) => {
    if (link.type === "template") return [4, 3];
    return null;
  }, []);

  const linkDirectionalParticles = useCallback((link: GraphLink) => {
    if (link.type === "reference") return 3;
    if (link.type === "tag" && (link.strength ?? 0) > 1) return 2;
    return 0;
  }, []);

  const linkDirectionalParticleColor = useCallback((link: GraphLink) => {
    if (link.type === "reference") return "rgba(192,132,252,0.9)";
    return "rgba(251,191,36,0.9)";
  }, []);

  // D3 force engine config after mount
  const handleEngineStop = useCallback(() => {
    // Nothing needed — forces are configured via props
  }, []);

  return (
    <div className="relative w-full flex-1 min-h-[500px] rounded-2xl overflow-hidden border border-white/8 bg-black/15 backdrop-blur-sm">
      <div
        ref={containerRef}
        className="w-full h-[calc(100vh-15rem)] min-h-[480px] md:h-[calc(100vh-13rem)]"
      >
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <ForceGraph2D
          ref={fgRef as any}
          graphData={graphData as any}
          width={dimensions.width}
          height={dimensions.height}
          nodeId="id"
          nodeCanvasObject={nodeCanvasObject as any}
          nodeCanvasObjectMode={() => "replace"}
          onNodeClick={handleNodeClick as any}
          onNodeHover={handleNodeHover as any}
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
      </div>

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
              style={{ background: "rgba(148,163,184,0.5)" }}
            />
            <span>קטגוריה</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-5 h-[2px] rounded shrink-0"
              style={{ background: "rgba(245,158,11,0.8)" }}
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
        <div className="text-slate-500">גלגלת להגדלה · גרור להזזה</div>
      </div>

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
        />
      </div>

      {/* Mobile: bottom sheet */}
      {selectedPrompt && (
        <div
          className="md:hidden fixed inset-x-0 bottom-0 z-50 bg-black/90 backdrop-blur-xl border-t border-white/15 rounded-t-2xl shadow-2xl max-h-[65vh] overflow-y-auto"
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
          />
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
}: {
  prompt: PersonalPrompt | null;
  onClose: () => void;
  onUse: (p: PersonalPrompt) => void;
}) {
  if (!prompt) return null;

  const cap = prompt.capability_mode ?? CapabilityMode.STANDARD;
  const color = CAPABILITY_COLORS[cap];
  const total = (prompt.success_count ?? 0) + (prompt.fail_count ?? 0);
  const successPct = total > 0 ? Math.round(((prompt.success_count ?? 0) / total) * 100) : null;

  return (
    <>
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
        <h3 className="text-sm font-semibold text-white truncate flex-1">{prompt.title}</h3>
        <button
          onClick={onClose}
          className="ml-2 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
          aria-label="סגור"
        >
          <X className="w-4 h-4" />
        </button>
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

        {/* Tags */}
        {prompt.tags && prompt.tags.length > 0 && (
          <div className="flex items-start gap-1.5 flex-wrap">
            <Tag className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
            {prompt.tags.slice(0, 10).map((tag) => (
              <span
                key={tag}
                className="px-1.5 py-0.5 rounded-md bg-white/8 text-slate-300 text-[10px] border border-white/8"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

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
