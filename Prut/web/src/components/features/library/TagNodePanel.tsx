"use client";

import { useMemo, useState } from "react";
import { X, Tag, Library, ChevronDown } from "lucide-react";
import type { PersonalPrompt } from "@/lib/types";
import { CapabilityMode } from "@/lib/capability-mode";
import { CAPABILITY_COLORS } from "./graph-utils";
import { cn } from "@/lib/utils";

const CAPABILITY_LABELS: Record<CapabilityMode, string> = {
  [CapabilityMode.STANDARD]: "רגיל",
  [CapabilityMode.IMAGE_GENERATION]: "תמונות",
  [CapabilityMode.DEEP_RESEARCH]: "מחקר",
  [CapabilityMode.AGENT_BUILDER]: "סוכן",
  [CapabilityMode.VIDEO_GENERATION]: "וידאו",
};

interface TagNodePanelProps {
  nodeId: string;
  nodeType: "tag" | "library";
  nodeLabel: string;
  prompts: PersonalPrompt[];
  onClose: () => void;
  onOpenPrompt: (p: PersonalPrompt) => void;
  onRemoveTag: (promptId: string, tag: string) => void;
  onAddTag: (promptId: string, tag: string) => void;
}

export function TagNodePanel({
  nodeId,
  nodeType,
  nodeLabel,
  prompts,
  onClose,
  onOpenPrompt,
  onRemoveTag,
  onAddTag,
}: TagNodePanelProps) {
  const [addDropdownOpen, setAddDropdownOpen] = useState(false);

  const tagKey = nodeId.replace(/^tag:/, "");
  const libKey = nodeId.replace(/^lib:/, "");

  const panelPrompts = useMemo(() => {
    if (nodeType === "tag") {
      return prompts.filter((p) =>
        (p.tags ?? []).some((t) => t.trim().toLowerCase() === tagKey),
      );
    }
    return prompts.filter(
      (p) => p.source === "library" && (p.reference || p.category || "library") === libKey,
    );
  }, [prompts, nodeType, tagKey, libKey]);

  const untaggedPrompts = useMemo(() => {
    if (nodeType !== "tag") return [];
    return prompts.filter(
      (p) => !(p.tags ?? []).some((t) => t.trim().toLowerCase() === tagKey),
    );
  }, [prompts, nodeType, tagKey]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[140] bg-black/30 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Panel */}
      <div
        className="fixed top-0 right-0 h-full w-full max-w-[340px] z-[150] flex flex-col bg-white dark:bg-slate-950 border-l border-slate-200/60 dark:border-white/10 shadow-2xl animate-in slide-in-from-right duration-200"
        dir="rtl"
        role="dialog"
        aria-label={nodeLabel}
      >
        {/* Header */}
        <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-slate-200/60 dark:border-white/10 shrink-0">
          {nodeType === "tag" ? (
            <Tag className="w-4 h-4 text-amber-500 shrink-0" />
          ) : (
            <Library className="w-4 h-4 text-violet-500 shrink-0" />
          )}
          <span className="flex-1 font-semibold text-slate-900 dark:text-white text-sm truncate">
            {nodeLabel}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
            {panelPrompts.length} פרומפטים
          </span>
          <button
            onClick={onClose}
            className="p-1 -m-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors shrink-0"
            aria-label="סגור"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Prompt list */}
        <div className="flex-1 overflow-y-auto py-2">
          {panelPrompts.length === 0 ? (
            <p className="text-center text-sm text-slate-400 dark:text-slate-500 mt-8 px-4">
              אין פרומפטים
            </p>
          ) : (
            panelPrompts.map((p) => {
              const cap = p.capability_mode ?? CapabilityMode.STANDARD;
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-2 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-white/4 group transition-colors"
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: CAPABILITY_COLORS[cap] }}
                  />
                  <button
                    onClick={() => onOpenPrompt(p)}
                    className="flex-1 text-right text-sm text-slate-800 dark:text-slate-200 truncate hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                    title={p.title}
                  >
                    {p.title}
                  </button>
                  <span className="text-[10px] text-slate-400 shrink-0">
                    {CAPABILITY_LABELS[cap]}
                  </span>
                  {nodeType === "tag" && (
                    <button
                      onClick={() => onRemoveTag(p.id, tagKey)}
                      className="opacity-0 group-hover:opacity-100 text-[10px] text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-all shrink-0"
                      title="הסר תגית"
                    >
                      הסר
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Add tag footer — tag panels only */}
        {nodeType === "tag" && untaggedPrompts.length > 0 && (
          <div className="shrink-0 border-t border-slate-200/60 dark:border-white/10 px-4 py-3">
            <button
              onClick={() => setAddDropdownOpen((o) => !o)}
              className="flex items-center gap-1.5 text-[12px] text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
            >
              <ChevronDown
                className={cn("w-3.5 h-3.5 transition-transform", addDropdownOpen && "rotate-180")}
              />
              הוסף תגית לפרומפטים אחרים
            </button>
            {addDropdownOpen && (
              <div className="mt-2 max-h-48 overflow-y-auto flex flex-col gap-0.5">
                {untaggedPrompts.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => onAddTag(p.id, tagKey)}
                    className="text-right text-[12px] px-2 py-1.5 rounded hover:bg-amber-50 dark:hover:bg-amber-500/10 text-slate-700 dark:text-slate-300 transition-colors truncate"
                    title={p.title}
                  >
                    {p.title}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
