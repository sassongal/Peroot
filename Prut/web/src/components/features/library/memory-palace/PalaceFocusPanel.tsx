"use client";
import { useEffect, useMemo, useState } from "react";
import { Network } from "lucide-react";
import { computeNeighborhood, type GraphNode, type GraphLink } from "../graph-utils";
import type { PersonalPrompt } from "@/lib/types";
import type { PromptUsageEvent } from "@/lib/usage/usage-types";
import { USAGE_TRACKED_EVENT } from "@/lib/usage/track-usage";
import { MiniGraph2D } from "./MiniGraph2D";
import { PalaceNeighborList } from "./PalaceNeighborList";
import {
  trackPalaceOpened,
  trackPalaceNodeClicked,
  trackPalaceNodeDoubleClicked,
  trackPalaceNavigated,
  trackPalaceEmpty,
} from "./palace-analytics";

/**
 * "מיקוד": what sits next to ONE prompt.
 *
 * This is the body that used to live inside MemoryPalaceSidebar, a permanent
 * 320px third column on desktop that had no equivalent on mobile and vanished
 * entirely below five prompts. It is now a mode of the single Relations
 * screen, so the same view is reachable at every width and the grid gets its
 * width back.
 *
 * The neighbourhood scoring itself is unchanged (computeNeighborhood: Jaccard
 * similarity 60% + 24h co-occurrence 40%).
 */
export const PALACE_MIN_PROMPTS = 5;

interface Props {
  prompts: PersonalPrompt[];
  promptCount: number;
  selectedPromptId: string | null;
  lastOpenedPromptId?: string | null;
  onSelectPrompt: (id: string) => void;
  onOpenPrompt: (id: string) => void;
}

export function PalaceFocusPanel({
  prompts,
  promptCount,
  selectedPromptId,
  lastOpenedPromptId,
  onSelectPrompt,
  onOpenPrompt,
}: Props) {
  const [usageEvents, setUsageEvents] = useState<PromptUsageEvent[]>([]);
  const [hopIndex, setHopIndex] = useState(0);

  useEffect(() => {
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
    fetchEvents();
    const onUsageTracked = () => fetchEvents();
    window.addEventListener(USAGE_TRACKED_EVENT, onUsageTracked);
    return () => {
      cancelled = true;
      window.removeEventListener(USAGE_TRACKED_EVENT, onUsageTracked);
    };
  }, []);

  // palace_opened is the denominator for the Memory Palace success metric
  // (palace_navigated_to_prompt, target >=25% of opens). The sidebar used to
  // fire it; now that focus is a mode rather than a permanent column, the mode
  // becoming visible is the equivalent event.
  useEffect(() => {
    trackPalaceOpened({
      viewport: typeof window !== "undefined" && window.innerWidth < 768 ? "mobile" : "desktop",
      promptCount,
    });
  }, [promptCount]);

  const effectiveCenterId = lastOpenedPromptId ?? selectedPromptId ?? prompts[0]?.id ?? null;

  const { nodes, links } = useMemo<{ nodes: GraphNode[]; links: GraphLink[] }>(() => {
    if (!effectiveCenterId) return { nodes: [], links: [] };
    return computeNeighborhood({ centerId: effectiveCenterId, corpus: prompts, usageEvents });
  }, [effectiveCenterId, prompts, usageEvents]);

  useEffect(() => {
    if (promptCount < PALACE_MIN_PROMPTS) trackPalaceEmpty("too_few_prompts");
    else if (!selectedPromptId) trackPalaceEmpty("no_selection");
    else if (nodes.length === 1) trackPalaceEmpty("no_neighbors");
  }, [promptCount, selectedPromptId, nodes.length]);

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

  // Below the threshold the neighbourhood is noise, but disappearing taught the
  // user nothing. Say what unlocks it (master plan 3.7).
  if (promptCount < PALACE_MIN_PROMPTS) {
    const remaining = PALACE_MIN_PROMPTS - promptCount;
    return (
      <div
        dir="rtl"
        className="flex flex-col items-center justify-center gap-3 py-16 px-6 text-center"
      >
        <Network className="w-8 h-8 text-(--text-muted)" aria-hidden />
        <p className="text-sm text-(--text-secondary)">
          עוד {remaining} פרומפטים ומצב המיקוד ייפתח
        </p>
        <p className="text-xs text-(--text-muted) max-w-xs leading-relaxed">
          המיקוד מראה מה קרוב לפרומפט אחד, לפי נושא ולפי שימוש באותו יום. הוא צריך כמה פרומפטים כדי
          שהקרבה תהיה משמעותית.
        </p>
        <div
          className="w-40 h-1 rounded-full bg-(--glass-bg) overflow-hidden"
          role="progressbar"
          aria-valuenow={promptCount}
          aria-valuemin={0}
          aria-valuemax={PALACE_MIN_PROMPTS}
        >
          <div
            className="h-full bg-amber-500 transition-all duration-500"
            style={{ width: `${(promptCount / PALACE_MIN_PROMPTS) * 100}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="p-3 md:p-4 max-w-3xl mx-auto">
      <MiniGraph2D
        nodes={nodes}
        links={links}
        onNodeClick={handleNodeClick}
        onNodeDoubleClick={handleNodeDoubleClick}
      />
      <PalaceNeighborList
        nodes={nodes}
        links={links}
        onSelect={handleNodeClick}
        onNavigate={(id) => {
          handleNodeClick(id);
          onOpenPrompt(id);
        }}
      />
    </div>
  );
}
