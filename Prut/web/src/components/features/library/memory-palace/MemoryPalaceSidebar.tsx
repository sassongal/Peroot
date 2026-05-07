"use client";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Network } from "lucide-react";
import { computeNeighborhood, type GraphNode, type GraphLink } from "../graph-utils";
import type { PersonalPrompt } from "@/lib/types";
import type { PromptUsageEvent } from "@/lib/usage/usage-types";
import { USAGE_TRACKED_EVENT } from "@/lib/usage/track-usage";
import { MiniGraph2D } from "./MiniGraph2D";
import { PalaceNeighborList } from "./PalaceNeighborList";
import { usePalaceState } from "./usePalaceState";
import {
  trackPalaceOpened,
  trackPalaceCollapsed,
  trackPalaceNodeClicked,
  trackPalaceNodeDoubleClicked,
  trackPalaceNavigated,
  trackPalaceEmpty,
} from "./palace-analytics";

interface Props {
  prompts: PersonalPrompt[];
  selectedPromptId: string | null;
  onSelectPrompt: (id: string) => void;
  onOpenPrompt: (id: string) => void;
}

const MIN_PROMPTS = 5;

export function MemoryPalaceSidebar({
  prompts,
  selectedPromptId,
  onSelectPrompt,
  onOpenPrompt,
}: Props) {
  const { isCollapsed, toggleCollapsed } = usePalaceState();
  const [usageEvents, setUsageEvents] = useState<PromptUsageEvent[]>([]);
  const [hopIndex, setHopIndex] = useState(0);

  useEffect(() => {
    if (isCollapsed) return;
    let cancelled = false;
    const fetchEvents = () => {
      fetch("/api/prompts/usage-events")
        .then((r) => (r.ok ? r.json() : { events: [] }))
        .then((d) => {
          if (!cancelled) setUsageEvents(d.events ?? []);
        })
        .catch(() => {
          if (!cancelled) setUsageEvents([]);
        });
    };
    if (usageEvents.length === 0) fetchEvents();
    const onUsageTracked = () => fetchEvents();
    window.addEventListener(USAGE_TRACKED_EVENT, onUsageTracked);
    return () => {
      cancelled = true;
      window.removeEventListener(USAGE_TRACKED_EVENT, onUsageTracked);
    };
  }, [isCollapsed, usageEvents.length]);

  useEffect(() => {
    if (!isCollapsed) {
      trackPalaceOpened({ viewport: "desktop", promptCount: prompts.length });
    }
  }, [isCollapsed, prompts.length]);

  const effectiveCenterId = selectedPromptId ?? prompts[0]?.id ?? null;

  const { nodes, links } = useMemo<{ nodes: GraphNode[]; links: GraphLink[] }>(() => {
    if (!effectiveCenterId) return { nodes: [], links: [] };
    return computeNeighborhood({
      centerId: effectiveCenterId,
      prompts,
      usageEvents,
    });
  }, [effectiveCenterId, prompts, usageEvents]);

  useEffect(() => {
    if (isCollapsed) return;
    if (prompts.length < MIN_PROMPTS) trackPalaceEmpty("too_few_prompts");
    else if (!selectedPromptId) trackPalaceEmpty("no_selection");
    else if (nodes.length === 1) trackPalaceEmpty("no_neighbors");
  }, [isCollapsed, prompts.length, selectedPromptId, nodes.length]);

  if (prompts.length < MIN_PROMPTS) return null;

  const handleNodeClick = (id: string) => {
    if (id === effectiveCenterId) return;
    const linkToTarget = links.find(
      (l) => (typeof l.target === "string" ? l.target : (l.target as { id: string }).id) === id,
    );
    trackPalaceNodeClicked({
      fromId: effectiveCenterId ?? "",
      toId: id,
      edgeType: (linkToTarget?.type as "similarity" | "cooccurrence" | "both") ?? "similarity",
      hopIndex: hopIndex + 1,
    });
    setHopIndex((h) => h + 1);
    onSelectPrompt(id);
  };

  const handleNodeDoubleClick = (id: string) => {
    trackPalaceNodeDoubleClicked({ promptId: id });
    trackPalaceNavigated({ promptId: id, fromNeighbor: id !== selectedPromptId });
    onOpenPrompt(id);
  };

  const handleToggle = () => {
    if (!isCollapsed) trackPalaceCollapsed();
    toggleCollapsed();
  };

  return (
    <aside
      dir="rtl"
      className="hidden md:flex flex-col border-s border-(--glass-border) bg-black/20 transition-all duration-200"
      style={{ width: isCollapsed ? 32 : 320 }}
      aria-label="Memory Palace — שכנים של הפרומפט הנבחר"
    >
      <button
        type="button"
        onClick={handleToggle}
        className="p-2 hover:bg-white/5 transition-colors flex items-center gap-2 text-(--text-muted) cursor-pointer"
        aria-expanded={!isCollapsed}
      >
        {isCollapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        {!isCollapsed && (
          <>
            <Network className="w-4 h-4" />
            <span className="text-sm font-medium">קרבה</span>
          </>
        )}
      </button>
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto p-3">
          <MiniGraph2D
            nodes={nodes}
            links={links}
            onNodeClick={handleNodeClick}
            onNodeDoubleClick={handleNodeDoubleClick}
          />
          <PalaceNeighborList nodes={nodes} links={links} onSelect={handleNodeClick} />
        </div>
      )}
    </aside>
  );
}
