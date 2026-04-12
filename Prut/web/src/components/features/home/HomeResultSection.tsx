"use client";

import { memo } from "react";
import dynamic from "next/dynamic";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import type { PromptScore } from "@/lib/engines/base-engine";
import type { StreamPhase } from "@/hooks/usePromptWorkflow";
import type { Question } from "@/lib/types";
import type { CapabilityMode } from "@/lib/capability-mode";

const ResultSection = dynamic(
  () => import("@/components/features/prompt-improver/ResultSection").then(mod => mod.ResultSection),
  { ssr: false, loading: () => <div className="animate-pulse rounded-xl bg-(--glass-bg) h-64" /> }
);
const SmartRefinement = dynamic(
  () => import("@/components/features/prompt-improver/SmartRefinement").then(mod => mod.SmartRefinement),
  { ssr: false, loading: () => <div className="animate-pulse rounded-xl bg-(--glass-bg) h-32" /> }
);

export interface HomeResultSectionProps {
  // ResultSection props
  completion: string;
  isLoading: boolean;
  streamPhase: StreamPhase;
  copied: boolean;
  isPro: boolean;
  onCopy: (text: string, withWatermark?: boolean) => Promise<void>;
  completionScore: PromptScore;
  inputScore: PromptScore;
  onSave: () => void;
  onSaveAsFavorite: () => void;
  onSaveAsTemplate: () => void;
  onBack: () => void;
  placeholders: string[];
  variableValues: Record<string, string>;
  previousScore: number | null;
  iterationCount: number;
  preFilledKeys: string[];
  onVariableChange: (key: string, val: string) => void;
  onImproveAgain: () => void;
  onQuickRefine?: (instruction: string) => void;
  onRetryStream: () => void;
  onResetToOriginal: () => void;
  originalPrompt: string;
  onShare: () => void;
  onReset: () => void;
  isAuthenticated: boolean;
  capabilityMode: CapabilityMode;
  selectedPlatform?: string;

  // SmartRefinement props
  questions: Question[];
  questionAnswers: Record<string, string>;
  onAnswerChange: (id: number, val: string) => void;
  onRefine: (instruction: string) => void;
}

export const HomeResultSection = memo<HomeResultSectionProps>(({
  completion,
  isLoading,
  streamPhase,
  copied,
  isPro,
  onCopy,
  completionScore,
  inputScore,
  onSave,
  onSaveAsFavorite,
  onSaveAsTemplate,
  onBack,
  placeholders,
  variableValues,
  previousScore,
  iterationCount,
  preFilledKeys,
  onVariableChange,
  onImproveAgain,
  onQuickRefine,
  onRetryStream,
  onResetToOriginal,
  originalPrompt,
  onShare,
  onReset,
  isAuthenticated,
  capabilityMode,
  selectedPlatform,
  questions,
  questionAnswers,
  onAnswerChange,
  onRefine,
}) => {
  return (
    /* RESULT MODE */
    <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 flex flex-col gap-8">
        <ErrorBoundary name="ResultSection">
          <ResultSection
              completion={completion}
              isLoading={isLoading}
              streamPhase={streamPhase}
              copied={copied}
              isPro={isPro}
              onCopy={onCopy}
              completionScore={completionScore}
              onSave={onSave}
              onSaveAsFavorite={onSaveAsFavorite}
              onSaveAsTemplate={onSaveAsTemplate}
              onBack={onBack}
              placeholders={placeholders}
              variableValues={variableValues}
              improvementDelta={previousScore !== null && iterationCount > 0
                ? completionScore.baseScore - previousScore
                : completionScore.baseScore - inputScore.baseScore}
              preFilledKeys={preFilledKeys}
              onVariableChange={onVariableChange}
              onImproveAgain={onImproveAgain}
              onQuickRefine={onQuickRefine}
              onRetryStream={onRetryStream}
              onResetToOriginal={onResetToOriginal}
              iterationCount={iterationCount}
              originalPrompt={originalPrompt}
              onShare={onShare}
              onReset={onReset}
              isAuthenticated={isAuthenticated}
              capabilityMode={capabilityMode}
              selectedPlatform={selectedPlatform}
          />
        </ErrorBoundary>

        {(questions.length > 0 || iterationCount > 0) && (
           <ErrorBoundary name="SmartRefinement">
             <SmartRefinement
                questions={questions}
                answers={questionAnswers}
                onAnswerChange={onAnswerChange}
                onRefine={(instruction) => onRefine(instruction || "")}
                isLoading={isLoading}
             />
           </ErrorBoundary>
        )}
    </div>
  );
});

HomeResultSection.displayName = "HomeResultSection";
