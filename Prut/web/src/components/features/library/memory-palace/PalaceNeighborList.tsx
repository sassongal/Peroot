"use client";
import { useState } from "react";
import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GraphNode, GraphLink } from "../graph-utils";

interface Props {
  nodes: GraphNode[];
  links: GraphLink[];
  onSelect: (id: string) => void;
  onNavigate?: (id: string) => void;
}

const REASON_LABEL: Record<string, string> = {
  similarity: "דמיון תוכן",
  cooccurrence: "שימוש משותף",
  both: "דמיון + שימוש משותף",
};

const BODY_PREVIEW_CHARS = 120;

export function PalaceNeighborList({ nodes, links, onSelect, onNavigate }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [bodyExpanded, setBodyExpanded] = useState<Set<string>>(new Set());

  const neighbors = nodes.filter((n) => !n.isCenter);
  const reasonByTarget = new Map<string, string>();
  for (const l of links) {
    const tId = typeof l.target === "string" ? l.target : (l.target as { id: string }).id;
    reasonByTarget.set(tId, REASON_LABEL[l.type as string] ?? "קשור");
  }

  if (neighbors.length === 0) return null;

  const toggleBodyExpanded = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setBodyExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleNavigate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onNavigate?.(id);
    window.dispatchEvent(new CustomEvent("peroot:scroll-to-prompt", { detail: { id } }));
  };

  return (
    <ul className="space-y-1 mt-3" dir="rtl" aria-label="רשימת שכנים">
      {neighbors.map((n) => {
        const isOpen = expandedId === n.id;
        const body = n.prompt?.prompt ?? "";
        const isBodyLong = body.length > BODY_PREVIEW_CHARS;
        const isBodyExpanded = bodyExpanded.has(n.id);
        const displayBody =
          isBodyLong && !isBodyExpanded ? body.slice(0, BODY_PREVIEW_CHARS) + "…" : body;

        return (
          <li key={n.id}>
            <button
              type="button"
              onClick={() => {
                if (isOpen) {
                  setExpandedId(null);
                } else {
                  setExpandedId(n.id);
                  onSelect(n.id);
                }
              }}
              className="w-full text-right p-2 rounded-lg hover:bg-white/5 text-sm flex items-center justify-between gap-2 cursor-pointer focus:outline-none focus-visible:ring-2 ring-amber-400/50"
            >
              <span className="truncate flex-1 text-(--text-primary)">{n.prompt?.title}</span>
              <span className="text-[10px] text-(--text-muted) shrink-0">
                {reasonByTarget.get(n.id) ?? ""}
              </span>
              {isOpen ? (
                <ChevronUp className="w-3 h-3 text-(--text-muted) shrink-0" />
              ) : (
                <ChevronDown className="w-3 h-3 text-(--text-muted) shrink-0" />
              )}
            </button>

            {isOpen && (
              <div
                className={cn(
                  "mx-1 mb-1 p-2.5 rounded-lg bg-white/4 border border-white/8",
                  "text-xs text-(--text-secondary) space-y-2",
                )}
              >
                {body ? (
                  <div dir="ltr" className="text-right">
                    <p className="leading-relaxed whitespace-pre-wrap break-words">{displayBody}</p>
                    {isBodyLong && (
                      <button
                        type="button"
                        onClick={(e) => toggleBodyExpanded(n.id, e)}
                        className="mt-1 text-(--text-muted) hover:text-(--text-primary) text-[10px] cursor-pointer"
                      >
                        {isBodyExpanded ? "הצג פחות" : "הצג עוד"}
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="text-(--text-muted) italic">אין תוכן</p>
                )}

                {onNavigate && (
                  <button
                    type="button"
                    onClick={(e) => handleNavigate(n.id, e)}
                    className="flex items-center gap-1.5 w-full justify-center py-1.5 px-3 rounded-md bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 text-[11px] font-medium transition-colors cursor-pointer"
                  >
                    <ExternalLink className="w-3 h-3" />
                    קח אותי לשם
                  </button>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
