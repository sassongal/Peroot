"use client";

import { CAPABILITY_COLORS } from "./graph-utils";
import { CapabilityMode } from "@/lib/capability-mode";

/**
 * Decorative "here's what the graph looks like" preview shown on the guest
 * personal-library gate. Rendered as a static SVG (no react-force-graph / THREE.js
 * and no requestAnimationFrame loop) — it's purely decorative, so the WebGL cost
 * and never-settling physics of the real graph aren't worth it here. A tiny
 * CSS opacity pulse gives it life and is disabled under prefers-reduced-motion.
 */

type DemoNode = {
  id: string;
  capability: CapabilityMode;
  val: number;
  x: number;
  y: number;
};

// Hand-placed layout over a 320×220 canvas — enough signal to suggest the real
// graph without clutter.
const DEMO_NODES: DemoNode[] = [
  { id: "a", capability: CapabilityMode.STANDARD, val: 8, x: 60, y: 62 },
  { id: "b", capability: CapabilityMode.IMAGE_GENERATION, val: 10, x: 158, y: 40 },
  { id: "c", capability: CapabilityMode.DEEP_RESEARCH, val: 7, x: 108, y: 128 },
  { id: "d", capability: CapabilityMode.AGENT_BUILDER, val: 9, x: 250, y: 66 },
  { id: "e", capability: CapabilityMode.VIDEO_GENERATION, val: 8, x: 208, y: 150 },
  { id: "f", capability: CapabilityMode.STANDARD, val: 6, x: 84, y: 182 },
  { id: "g", capability: CapabilityMode.IMAGE_GENERATION, val: 7, x: 272, y: 158 },
  { id: "h", capability: CapabilityMode.AGENT_BUILDER, val: 6, x: 168, y: 190 },
];

const DEMO_LINKS: [string, string][] = [
  ["a", "b"],
  ["a", "f"],
  ["b", "g"],
  ["c", "a"],
  ["d", "h"],
  ["e", "b"],
  ["f", "h"],
  ["g", "e"],
];

const byId: Record<string, DemoNode> = Object.fromEntries(DEMO_NODES.map((n) => [n.id, n]));

export function GuestGraphPreview({ height = 220 }: { height?: number }) {
  return (
    <div
      className="w-full rounded-2xl overflow-hidden border border-white/10 relative"
      style={{
        height,
        background:
          "radial-gradient(120% 80% at 50% 0%, rgba(168,85,247,0.18) 0%, rgba(59,130,246,0.08) 45%, rgba(2,6,23,0.8) 80%)",
      }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 320 220"
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid slice"
        role="presentation"
      >
        <defs>
          <filter id="ggp-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {DEMO_LINKS.map(([s, t], i) => {
          const a = byId[s];
          const b = byId[t];
          return (
            <line
              key={i}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="rgba(148,163,184,0.4)"
              strokeWidth={0.8}
            />
          );
        })}

        {DEMO_NODES.map((n, i) => (
          <circle
            key={n.id}
            cx={n.x}
            cy={n.y}
            r={4 + n.val * 0.7}
            fill={CAPABILITY_COLORS[n.capability]}
            opacity={0.95}
            filter="url(#ggp-glow)"
            className="ggp-node"
            style={{ animationDelay: `${i * 0.32}s` }}
          />
        ))}
      </svg>

      <style>{`
        .ggp-node { animation: ggp-pulse 3.4s ease-in-out infinite; will-change: opacity; }
        @keyframes ggp-pulse { 0%,100% { opacity: .7 } 50% { opacity: 1 } }
        @media (prefers-reduced-motion: reduce) { .ggp-node { animation: none } }
      `}</style>
    </div>
  );
}
