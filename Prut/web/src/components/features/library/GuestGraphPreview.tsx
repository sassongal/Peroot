"use client";

import { useMemo, useRef, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { CAPABILITY_COLORS } from "./graph-utils";
import { CapabilityMode } from "@/lib/capability-mode";

const ForceGraph3D = dynamic(() => import("react-force-graph-3d").then((m) => m.default), {
  ssr: false,
});

type DemoNode = { id: string; label: string; capability: CapabilityMode; val: number };
type DemoLink = { source: string; target: string };

// Tiny curated set — enough signal to suggest the real graph without clutter.
const DEMO_NODES: DemoNode[] = [
  { id: "a", label: "Landing page", capability: CapabilityMode.STANDARD, val: 8 },
  { id: "b", label: "Hero image", capability: CapabilityMode.IMAGE_GENERATION, val: 10 },
  { id: "c", label: "Research brief", capability: CapabilityMode.DEEP_RESEARCH, val: 7 },
  { id: "d", label: "Support agent", capability: CapabilityMode.AGENT_BUILDER, val: 9 },
  { id: "e", label: "Product video", capability: CapabilityMode.VIDEO_GENERATION, val: 8 },
  { id: "f", label: "CTA copy", capability: CapabilityMode.STANDARD, val: 6 },
  { id: "g", label: "Icon set", capability: CapabilityMode.IMAGE_GENERATION, val: 7 },
  { id: "h", label: "Onboarding flow", capability: CapabilityMode.AGENT_BUILDER, val: 6 },
];

const DEMO_LINKS: DemoLink[] = [
  { source: "a", target: "b" },
  { source: "a", target: "f" },
  { source: "b", target: "g" },
  { source: "c", target: "a" },
  { source: "d", target: "h" },
  { source: "e", target: "b" },
  { source: "f", target: "h" },
  { source: "g", target: "e" },
];

export function GuestGraphPreview({ height = 220 }: { height?: number }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fgRef = useRef<any>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(320);
  const data = useMemo(() => ({ nodes: DEMO_NODES, links: DEMO_LINKS }), []);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      if (w > 0) setWidth(w);
    });
    ro.observe(el);
    const rect = el.getBoundingClientRect();
    if (rect.width > 0) setWidth(rect.width);
    return () => ro.disconnect();
  }, []);

  // Slow cinematic auto-orbit around the graph centre.
  // Pauses when tab is hidden so we don't burn GPU on a background tab.
  useEffect(() => {
    let raf = 0;
    let angle = 0;
    let paused = typeof document !== "undefined" && document.visibilityState === "hidden";
    const distance = 160;
    const tick = () => {
      if (!paused) {
        const fg = fgRef.current;
        if (fg?.cameraPosition) {
          angle += 0.0025;
          fg.cameraPosition({
            x: distance * Math.sin(angle),
            y: 20,
            z: distance * Math.cos(angle),
          });
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const onVis = () => {
      paused = document.visibilityState === "hidden";
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      className="w-full rounded-2xl overflow-hidden border border-white/10 relative"
      style={{
        height,
        background:
          "radial-gradient(120% 80% at 50% 0%, rgba(168,85,247,0.18) 0%, rgba(59,130,246,0.08) 45%, rgba(2,6,23,0.8) 80%)",
      }}
      aria-hidden="true"
    >
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <ForceGraph3D
        ref={fgRef as any}
        graphData={data as any}
        width={width}
        height={height}
        nodeId="id"
        nodeLabel={((n: DemoNode) => n.label) as any}
        nodeVal={((n: DemoNode) => n.val) as any}
        nodeColor={((n: DemoNode) => CAPABILITY_COLORS[n.capability]) as any}
        nodeOpacity={0.95}
        nodeResolution={16}
        linkColor={(() => "rgba(148,163,184,0.45)") as any}
        linkWidth={0.6}
        linkOpacity={0.7}
        linkDirectionalParticles={2}
        linkDirectionalParticleWidth={1.4}
        linkDirectionalParticleSpeed={0.006}
        linkDirectionalParticleColor={(() => "rgba(245,158,11,0.9)") as any}
        backgroundColor="rgba(2,6,23,0)"
        showNavInfo={false}
        enableNodeDrag={false}
        enableNavigationControls={false}
        cooldownTicks={Infinity}
        warmupTicks={40}
        rendererConfig={{ alpha: true, antialias: true, powerPreference: "low-power" }}
      />
    </div>
  );
}
