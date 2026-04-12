"use client";

import { useState } from "react";
import { Bookmark, ChevronDown, ChevronUp } from "lucide-react";
import { CHAIN_PRESETS } from "@/lib/chain-presets";
import type { GeneratedChain } from "@/lib/chain-types";
import type { ChainStep } from "@/hooks/useChains";
import { ChainPreview } from "./ChainPreview";

interface ChainPresetsGalleryProps {
  onSaveChain: (title: string, description: string, steps: ChainStep[]) => Promise<string>;
}

export function ChainPresetsGallery({ onSaveChain }: ChainPresetsGalleryProps) {
  const [selectedPreset, setSelectedPreset] = useState<GeneratedChain | null>(null);
  const [expanded, setExpanded] = useState(false);

  const handleSave = async (chain: GeneratedChain) => {
    const steps: ChainStep[] = chain.steps.map((s, i) => ({
      id: crypto.randomUUID(),
      prompt_text: s.prompt,
      title: s.title,
      order: i,
      mode: s.mode,
      variables: s.variables,
      input_from_step: s.input_from_step,
      output_description: s.output_description,
    }));
    await onSaveChain(chain.title, chain.description, steps);
    setSelectedPreset(null);
  };

  const visiblePresets = expanded ? CHAIN_PRESETS : CHAIN_PRESETS.slice(0, 4);

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Bookmark className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-xs font-medium text-slate-400">תבניות מוכנות</span>
        </div>
        {CHAIN_PRESETS.length > 4 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-[11px] text-slate-500 hover:text-amber-400 transition-colors flex items-center gap-1"
          >
            {expanded ? "הצג פחות" : `עוד ${CHAIN_PRESETS.length - 4}`}
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {visiblePresets.map((preset) => (
          <button
            key={preset.chain_id}
            onClick={() => setSelectedPreset({ ...preset })}
            className="text-start p-3 rounded-xl border border-white/5 bg-white/2 hover:bg-white/5 hover:border-amber-500/20 transition-all group"
            dir="rtl"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h4 className="text-sm font-medium text-slate-300 group-hover:text-amber-300 transition-colors truncate">
                  {preset.title}
                </h4>
                <p className="text-[11px] text-slate-600 mt-0.5 truncate">{preset.description}</p>
              </div>
              <span className="text-[10px] text-slate-600 bg-white/5 px-1.5 py-0.5 rounded-full shrink-0">
                {preset.steps.length} שלבים
              </span>
            </div>

            {/* Mini step chain */}
            <div className="flex items-center gap-1 mt-2 flex-wrap">
              {preset.steps.map((step, i) => (
                <div key={i} className="flex items-center gap-1">
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-slate-500 truncate max-w-[80px]">
                    {step.title}
                  </span>
                  {i < preset.steps.length - 1 && (
                    <span className="text-slate-700 text-[8px]">&larr;</span>
                  )}
                </div>
              ))}
            </div>
          </button>
        ))}
      </div>

      {/* Preset Preview Modal */}
      {selectedPreset && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setSelectedPreset(null)}
        >
          <div
            className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-[#0f0f0f] border border-white/10 rounded-2xl mx-4"
            onClick={e => e.stopPropagation()}
          >
            <ChainPreview
              chain={selectedPreset}
              onSave={handleSave}
              onBack={() => setSelectedPreset(null)}
              onClose={() => setSelectedPreset(null)}
              onUpdateChain={setSelectedPreset}
            />
          </div>
        </div>
      )}
    </div>
  );
}
