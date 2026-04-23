"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { BaseEngine } from "@/lib/engines/base-engine";
import { EnhancedScorer } from "@/lib/engines/scoring/enhanced-scorer";
import { scoreInput } from "@/lib/engines/scoring/input-scorer";
import { extractPlaceholders } from "@/lib/text-utils";
import { CapabilityMode } from "@/lib/capability-mode";

export function useHomeScoring({
  input,
  completion,
  selectedCapability,
}: {
  input: string;
  completion: string;
  selectedCapability: CapabilityMode;
}) {
  const [interimText, setInterimText] = useState("");
  const handleInterimChange = useCallback((text: string) => setInterimText(text), []);

  const scoringText = interimText
    ? input + (input && !input.endsWith(' ') ? ' ' : '') + interimText
    : input;

  const debouncedInput = useDebouncedValue(scoringText, 300);
  const debouncedCompletion = useDebouncedValue(completion, 200);

  const inputScore = useMemo(
    () => BaseEngine.scorePrompt(debouncedInput, selectedCapability),
    [debouncedInput, selectedCapability]
  );

  const rawInputScore = useMemo(
    () => scoreInput(debouncedInput, selectedCapability),
    [debouncedInput, selectedCapability]
  );

  // EMA smoothing: prevents jumpy scores during rapid typing.
  // Weighted toward new value (0.7) so it converges fast but avoids spikes.
  // Stored in state (not ref) so the smoothed total is always derived from a
  // value written outside render — safe under React 19's refs-during-render rule.
  const [liveInputScore, setLiveInputScore] = useState(rawInputScore);
  useEffect(() => {
    queueMicrotask(() => {
      setLiveInputScore((prev) => {
        if (!rawInputScore || rawInputScore.level === 'empty') return rawInputScore;
        const prevTotal = prev?.total ?? 0;
        const smoothed = Math.round(prevTotal * 0.3 + rawInputScore.total * 0.7);
        return { ...rawInputScore, total: smoothed };
      });
    });
  }, [rawInputScore]);

  // IMPORTANT: header score must match the breakdown drawer and PDF export.
  // Both use EnhancedScorer — computing from the same source avoids silent mismatches.
  const completionScore = useMemo(() => {
    const trimmed = debouncedCompletion.trim();
    if (!trimmed) {
      return { score: 0, baseScore: 0, level: 'empty' as const, label: 'חסר', tips: [], usageBoost: 0 };
    }
    const enhanced = EnhancedScorer.score(debouncedCompletion, selectedCapability);
    const level: 'low' | 'medium' | 'high' = enhanced.total >= 70
      ? 'high'
      : enhanced.total >= 40
        ? 'medium'
        : 'low';
    return {
      score: enhanced.total,
      baseScore: enhanced.total,
      level,
      label: enhanced.label,
      tips: enhanced.topWeaknesses.slice(0, 3),
      usageBoost: 0,
    };
  }, [debouncedCompletion, selectedCapability]);

  const placeholders = useMemo(() => extractPlaceholders(debouncedCompletion), [debouncedCompletion]);
  const inputVariables = useMemo(() => extractPlaceholders(debouncedInput), [debouncedInput]);

  return {
    inputScore,
    liveInputScore,
    completionScore,
    placeholders,
    inputVariables,
    handleInterimChange,
  };
}
