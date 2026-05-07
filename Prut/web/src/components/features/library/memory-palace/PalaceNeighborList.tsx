"use client";
import type { GraphNode, GraphLink } from "../graph-utils";

interface Props {
  nodes: GraphNode[];
  links: GraphLink[];
  onSelect: (id: string) => void;
}

const REASON_LABEL: Record<string, string> = {
  similarity: "דמיון תוכן",
  cooccurrence: "שימוש משותף",
  both: "דמיון + שימוש משותף",
};

export function PalaceNeighborList({ nodes, links, onSelect }: Props) {
  const neighbors = nodes.filter((n) => !n.isCenter);
  const reasonByTarget = new Map<string, string>();
  for (const l of links) {
    const tId = typeof l.target === "string" ? l.target : (l.target as { id: string }).id;
    reasonByTarget.set(tId, REASON_LABEL[l.type as string] ?? "קשור");
  }
  if (neighbors.length === 0) return null;

  return (
    <ul className="space-y-1 mt-3" dir="rtl" aria-label="רשימת שכנים">
      {neighbors.map((n) => (
        <li key={n.id}>
          <button
            type="button"
            onClick={() => onSelect(n.id)}
            className="w-full text-right p-2 rounded-lg hover:bg-white/5 text-sm flex items-center justify-between gap-2 cursor-pointer focus:outline-none focus-visible:ring-2 ring-amber-400/50"
          >
            <span className="truncate flex-1 text-(--text-primary)">{n.prompt?.title}</span>
            <span className="text-[10px] text-(--text-muted) shrink-0">
              {reasonByTarget.get(n.id) ?? ""}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
