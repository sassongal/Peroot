"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3-force";
import type { GraphNode, GraphLink } from "../graph-utils";

interface Props {
  nodes: GraphNode[];
  links: GraphLink[];
  width?: number;
  height?: number;
  onNodeClick: (id: string) => void;
  onNodeDoubleClick: (id: string) => void;
}

interface Positioned {
  id: string;
  x: number;
  y: number;
  isCenter: boolean;
  title: string;
  category: string;
}

const NODE_RADIUS_CENTER = 16;
const NODE_RADIUS_NEIGHBOR = 10;

function getCategoryColor(cat: string): string {
  let h = 0;
  for (const c of cat) h = (h * 31 + c.charCodeAt(0)) % 360;
  return `hsl(${h}, 60%, 55%)`;
}

export function MiniGraph2D({
  nodes,
  links,
  width = 280,
  height = 280,
  onNodeClick,
  onNodeDoubleClick,
}: Props) {
  const [positions, setPositions] = useState<Positioned[]>([]);
  const ranOnce = useRef(false);

  useEffect(() => {
    if (nodes.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPositions([]);
      return;
    }
    type Sim = { id: string; x?: number; y?: number; fx?: number; fy?: number };
    const simNodes: Sim[] = nodes.map((n) => ({
      id: n.id,
      ...(n.isCenter ? { fx: width / 2, fy: height / 2 } : {}),
    }));
    const simLinks = links.map((l) => ({
      source: typeof l.source === "string" ? l.source : (l.source as { id: string }).id,
      target: typeof l.target === "string" ? l.target : (l.target as { id: string }).id,
    }));

    const sim = d3
      .forceSimulation(simNodes as never)
      .force("charge", d3.forceManyBody().strength(-150))
      .force(
        "link",
        d3
          .forceLink(simLinks)
          .id((d: d3.SimulationNodeDatum) => (d as unknown as Sim).id)
          .distance(80),
      )
      .force("center", d3.forceCenter(width / 2, height / 2))
      .stop();

    for (let i = 0; i < 100; i++) sim.tick();

    const metaById = new Map(nodes.map((n) => [n.id, n]));
    const result: Positioned[] = simNodes.flatMap((s) => {
      const meta = metaById.get(s.id);
      if (!meta) return [];
      return [
        {
          id: s.id,
          x: s.x ?? width / 2,
          y: s.y ?? height / 2,
          isCenter: !!meta.isCenter,
          title: meta.prompt?.title ?? "",
          category: meta.prompt?.category ?? "general",
        },
      ];
    });

    setPositions(result);
    ranOnce.current = true;
  }, [nodes, links, width, height]);

  const linkPaths = useMemo(() => {
    if (positions.length === 0) return [];
    const byId = new Map(positions.map((p) => [p.id, p]));
    return links
      .map((l) => {
        const sId = typeof l.source === "string" ? l.source : (l.source as { id: string }).id;
        const tId = typeof l.target === "string" ? l.target : (l.target as { id: string }).id;
        const s = byId.get(sId);
        const t = byId.get(tId);
        if (!s || !t) return null;
        return { sId, tId, s, t, type: l.type };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [positions, links]);

  if (nodes.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-sm text-(--text-muted)"
        style={{ width, height }}
      >
        בחר פרומפט בספרייה כדי לראות את השכונה שלו
      </div>
    );
  }

  return (
    <svg
      width={width}
      height={height}
      role="img"
      aria-label="גרף שכנים של הפרומפט הנבחר"
      className="select-none"
    >
      {linkPaths.map((l, i) => (
        <line
          key={i}
          x1={l.s.x}
          y1={l.s.y}
          x2={l.t.x}
          y2={l.t.y}
          stroke={l.type === "cooccurrence" ? "#60a5fa" : "#94a3b8"}
          strokeWidth={1.5}
          strokeDasharray={l.type === "cooccurrence" || l.type === "both" ? "4 3" : "0"}
          opacity={0.6}
        />
      ))}
      {positions.map((p) => (
        <g
          key={p.id}
          role="button"
          aria-label={p.title}
          tabIndex={0}
          transform={`translate(${p.x},${p.y})`}
          onClick={() => onNodeClick(p.id)}
          onDoubleClick={() => onNodeDoubleClick(p.id)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              if (e.shiftKey) onNodeDoubleClick(p.id);
              else onNodeClick(p.id);
            }
          }}
          style={{ cursor: "pointer", outline: "none" }}
        >
          <circle
            r={p.isCenter ? NODE_RADIUS_CENTER : NODE_RADIUS_NEIGHBOR}
            fill={p.isCenter ? "#fbbf24" : getCategoryColor(p.category)}
            stroke={p.isCenter ? "#f59e0b" : "rgba(255,255,255,0.4)"}
            strokeWidth={p.isCenter ? 3 : 1}
          />
          <title>{p.title}</title>
        </g>
      ))}
    </svg>
  );
}
