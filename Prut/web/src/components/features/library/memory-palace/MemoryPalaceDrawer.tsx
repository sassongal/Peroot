"use client";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { computeNeighborhood, type GraphNode, type GraphLink } from "../graph-utils";
import type { PersonalPrompt } from "@/lib/types";
import type { PromptUsageEvent } from "@/lib/usage/usage-types";
import { USAGE_TRACKED_EVENT } from "@/lib/usage/track-usage";
import { MiniGraph2D } from "./MiniGraph2D";
import { PalaceNeighborList } from "./PalaceNeighborList";
import {
  trackPalaceDrawerOpened,
  trackPalaceNodeClicked,
  trackPalaceNodeDoubleClicked,
  trackPalaceNavigated,
} from "./palace-analytics";

interface Props {
  open: boolean;
  centerPromptId: string | null;
  prompts: PersonalPrompt[];
  onClose: () => void;
  onOpenPrompt: (id: string) => void;
}

export function MemoryPalaceDrawer({
  open,
  centerPromptId,
  prompts,
  onClose,
  onOpenPrompt,
}: Props) {
  const reduceMotion = useReducedMotion();
  const [usageEvents, setUsageEvents] = useState<PromptUsageEvent[]>([]);
  const [activeId, setActiveId] = useState<string | null>(centerPromptId);
  const [hopIndex, setHopIndex] = useState(0);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveId(centerPromptId);

    setHopIndex(0);
  }, [centerPromptId]);

  useEffect(() => {
    if (!open) return;
    if (centerPromptId) trackPalaceDrawerOpened({ promptId: centerPromptId });
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
  }, [open, centerPromptId, usageEvents.length]);

  const { nodes, links } = useMemo<{ nodes: GraphNode[]; links: GraphLink[] }>(() => {
    if (!activeId) return { nodes: [], links: [] };
    return computeNeighborhood({ centerId: activeId, prompts, usageEvents });
  }, [activeId, prompts, usageEvents]);

  const handleNodeClick = (id: string) => {
    if (id === activeId) return;
    const linkToTarget = links.find(
      (l) => (typeof l.target === "string" ? l.target : (l.target as { id: string }).id) === id,
    );
    trackPalaceNodeClicked({
      fromId: activeId ?? "",
      toId: id,
      edgeType: (linkToTarget?.type as "similarity" | "cooccurrence" | "both") ?? "similarity",
      hopIndex: hopIndex + 1,
    });
    setHopIndex((h) => h + 1);
    setActiveId(id);
  };

  const handleDoubleClick = (id: string) => {
    trackPalaceNodeDoubleClicked({ promptId: id });
    trackPalaceNavigated({ promptId: id, fromNeighbor: id !== centerPromptId });
    onOpenPrompt(id);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            dir="rtl"
            role="dialog"
            aria-label="Memory Palace"
            className="fixed bottom-0 inset-x-0 z-50 bg-(--surface-1) rounded-t-3xl border-t border-(--glass-border) md:hidden"
            style={{ height: "50vh" }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={
              reduceMotion ? { duration: 0.01 } : { type: "spring", stiffness: 360, damping: 32 }
            }
          >
            <div className="flex items-center justify-between p-3 border-b border-(--glass-border)">
              <span className="text-sm font-medium">קרבה</span>
              <button
                type="button"
                onClick={onClose}
                aria-label="סגור"
                className="p-1.5 rounded-md hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <motion.div
              className="p-4 overflow-y-auto h-[calc(100%-48px)]"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: reduceMotion ? 0 : 0.05 } },
              }}
            >
              <motion.div
                variants={{
                  hidden: { opacity: 0, scale: 0.9 },
                  visible: { opacity: 1, scale: 1 },
                }}
                transition={{ duration: 0.25 }}
              >
                <MiniGraph2D
                  nodes={nodes}
                  links={links}
                  onNodeClick={handleNodeClick}
                  onNodeDoubleClick={handleDoubleClick}
                />
              </motion.div>
              <PalaceNeighborList
                nodes={nodes}
                links={links}
                onSelect={handleNodeClick}
                onNavigate={(id) => {
                  handleNodeClick(id);
                  onOpenPrompt(id);
                  onClose();
                }}
              />
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
