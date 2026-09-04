"use client";

import { summarizeAttachments } from "@/lib/context/attachment-summary";
import { memo, type SetStateAction } from "react";
import { Clock, ArrowRight } from "lucide-react";
import dynamic from "next/dynamic";
import { PromptInput } from "@/components/features/prompt-improver/PromptInput";
import { ContextChips } from "@/components/features/context/ContextChips";
import type { ContextAttachment } from "@/lib/context/types";
import { CapabilityMode } from "@/lib/capability-mode";
import { TargetModel } from "@/lib/engines/types";
import type { VoiceLang } from "@/hooks/useVoiceRecorder";
import type { OutputLanguage } from "@/lib/output-language";
import { ImagePlatform, ImageOutputFormat } from "@/lib/media-platforms";
import { VideoPlatform } from "@/lib/video-platforms";
import { HistoryItem } from "@/hooks/useHistory";
import { LibraryPrompt, PersonalPrompt } from "@/lib/types";
import type { InputScore } from "@/lib/engines/scoring/input-scorer";

const ReferralBanner = dynamic(
  () => import("@/components/features/referral/ReferralBanner").then((mod) => mod.ReferralBanner),
  { ssr: false },
);

interface InputSectionProps {
  // Prompt input
  inputVal: string;
  setInputVal: (action: SetStateAction<string>) => void;
  handleEnhance: () => void;
  liveInputScore: InputScore | null;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  selectedCapability: CapabilityMode;
  setSelectedCapability: (cap: CapabilityMode) => void;
  isLoading: boolean;
  onStop?: () => void;

  // Variables
  inputVariables: string[];
  variableValues: Record<string, string>;
  setVariableValues: (vals: Record<string, string>) => void;
  onApplyVariables: () => void;

  // Image/Video platform state
  imagePlatform: ImagePlatform;
  setImagePlatform: (p: ImagePlatform) => void;
  imageOutputFormat: ImageOutputFormat;
  setImageOutputFormat: (f: ImageOutputFormat) => void;
  imageAspectRatio: string;
  setImageAspectRatio: (r: string) => void;
  videoPlatform: VideoPlatform;
  setVideoPlatform: (p: VideoPlatform) => void;
  videoAspectRatio: string;
  setVideoAspectRatio: (r: string) => void;

  // History strip
  history: HistoryItem[];
  onRestore: (item: HistoryItem) => void;

  // Recent personal prompts
  recentPersonalPrompts: PersonalPrompt[];
  isPersonalLoaded: boolean;
  onUsePrompt: (prompt: LibraryPrompt | PersonalPrompt) => void;
  incrementUseCount: (id: string) => void;
  onNavToPersonalLibrary: () => void;

  // Context attachments
  contextAttachments: ContextAttachment[];
  onAddFile: (file: File) => void;
  onAddFiles?: (files: File[]) => Promise<void>;
  onAddUrl: (url: string) => void;
  onAddImage: (file: File) => void;
  onRetryAttachment?: (id: string) => void;
  onRetryFile?: (id: string) => void;
  onRetryImage?: (id: string) => void;
  onRemoveAttachment: (id: string) => void;
  contextTotalTokens: number;
  contextIsOverLimit: boolean;
  contextLimits?: { maxFiles: number; tokenLimit: number };
  contextTier?: "free" | "pro";

  // Target model
  targetModel: TargetModel;
  setTargetModel: (model: TargetModel) => void;
  tone: string;
  setTone: (tone: string) => void;

  // Voice language
  voiceLang: VoiceLang;
  outputLanguage: OutputLanguage;
  setOutputLanguage: (next: OutputLanguage, source?: "picker" | "suggestion") => void;

  // Credits
  creditsRemaining?: number | null;
  // Voice interim text callback
  onInterimChange?: (text: string) => void;

  // User context
  isNewUser: boolean;
  user: unknown;
  previousView: string | null;
  onBackToLibrary: () => void;
}

export const InputSection = memo<InputSectionProps>(
  ({
    inputVal,
    setInputVal,
    handleEnhance,
    liveInputScore,
    selectedCategory,
    setSelectedCategory,
    selectedCapability,
    setSelectedCapability,
    isLoading,
    onStop,
    inputVariables,
    variableValues,
    setVariableValues,
    onApplyVariables,
    imagePlatform,
    setImagePlatform,
    imageOutputFormat,
    setImageOutputFormat,
    imageAspectRatio,
    setImageAspectRatio,
    videoPlatform,
    setVideoPlatform,
    videoAspectRatio,
    setVideoAspectRatio,
    history,
    onRestore,
    recentPersonalPrompts,
    isPersonalLoaded,
    onUsePrompt,
    incrementUseCount,
    onNavToPersonalLibrary,
    contextAttachments,
    onAddFile,
    onAddFiles,
    onAddUrl,
    onAddImage,
    onRetryAttachment,
    onRetryFile,
    onRetryImage,
    onRemoveAttachment,
    contextTotalTokens,
    contextIsOverLimit,
    contextLimits,
    contextTier,
    targetModel,
    setTargetModel,
    tone,
    setTone,
    voiceLang,
    outputLanguage,
    setOutputLanguage,
    creditsRemaining,
    isNewUser,
    user,
    previousView,
    onBackToLibrary,
    onInterimChange,
  }) => {
    void contextTotalTokens;
    void contextIsOverLimit;
    return (
      <>
        {/* Referral Banner - shown once for new users */}
        {user && isNewUser && (
          <div className="w-full max-w-3xl mb-2">
            <ReferralBanner isNewUser={isNewUser} />
          </div>
        )}

        {/* Back to library button when user came from library */}
        {previousView && (previousView === "personal" || previousView === "library") && (
          <div className="w-full max-w-3xl mb-2">
            <button
              onClick={onBackToLibrary}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-amber-600/80 dark:text-amber-400/80 hover:text-amber-500 dark:hover:text-amber-300 hover:bg-amber-500/10 border border-amber-500/20 transition-colors"
              dir="rtl"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              {previousView === "library" ? "חזרה לפרומפטים" : "חזרה לספרייה שלי"}
            </button>
          </div>
        )}

        <PromptInput
          inputVal={inputVal}
          setInputVal={setInputVal}
          handleEnhance={handleEnhance}
          liveInputScore={liveInputScore}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          selectedCapability={selectedCapability}
          setSelectedCapability={setSelectedCapability}
          isLoading={isLoading}
          onStop={onStop}
          variables={inputVariables}
          variableValues={variableValues}
          setVariableValues={setVariableValues}
          onApplyVariables={onApplyVariables}
          imagePlatform={imagePlatform}
          setImagePlatform={setImagePlatform}
          imageOutputFormat={imageOutputFormat}
          setImageOutputFormat={setImageOutputFormat}
          imageAspectRatio={imageAspectRatio}
          setImageAspectRatio={setImageAspectRatio}
          videoPlatform={videoPlatform}
          setVideoPlatform={setVideoPlatform}
          videoAspectRatio={videoAspectRatio}
          setVideoAspectRatio={setVideoAspectRatio}
          onAddFile={onAddFile}
          onAddFiles={onAddFiles}
          onAddUrl={onAddUrl}
          onAddImage={onAddImage}
          attachmentStatus={summarizeAttachments(contextAttachments)}
          targetModel={targetModel}
          setTargetModel={setTargetModel}
          tone={tone}
          setTone={setTone}
          voiceLang={voiceLang}
          outputLanguage={outputLanguage}
          setOutputLanguage={setOutputLanguage}
          creditsRemaining={creditsRemaining}
          onInterimChange={onInterimChange}
        />

        {/* Context attachment chips */}
        <ContextChips
          attachments={contextAttachments}
          onRemove={onRemoveAttachment}
          onRetry={onRetryAttachment}
          onRetryFile={onRetryFile}
          onRetryImage={onRetryImage}
          maxFiles={contextLimits?.maxFiles}
          tokenLimit={contextLimits?.tokenLimit}
          tier={contextTier}
        />

        {/* One continuation strip (U2.1): recent personal prompts and
            recent history merge into a single row that appears only when
            the user actually has something to continue from. */}
        {!isPersonalLoaded && history.length === 0 ? (
          <div className="mt-3 min-h-[120px]" aria-hidden="true" />
        ) : (
          (recentPersonalPrompts.length > 0 || history.length > 0) && (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-xs font-medium text-amber-600/80 dark:text-amber-400/80">
                    המשך מאיפה שהפסקת
                  </span>
                </div>
                <button
                  onClick={onNavToPersonalLibrary}
                  className="text-xs text-(--text-muted) hover:text-amber-500 transition-colors"
                >
                  לספרייה שלי &larr;
                </button>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {[
                  ...recentPersonalPrompts.slice(0, 3).map((prompt) => ({
                    key: prompt.id,
                    title: prompt.title,
                    subtitle: prompt.use_case ?? "",
                    pill: prompt.personal_category || "כללי",
                    personal: true,
                    onClick: () => {
                      onUsePrompt(prompt);
                      incrementUseCount(prompt.id);
                    },
                  })),
                  ...history.slice(0, 3).map((item, i) => ({
                    key: `h-${i}`,
                    title: item.title || item.original.slice(0, 40),
                    subtitle: item.original.slice(0, 60),
                    pill: item.category || "כללי",
                    personal: false,
                    onClick: () => onRestore(item),
                  })),
                ].map((card) => (
                  <button
                    key={card.key}
                    onClick={card.onClick}
                    className={
                      card.personal
                        ? "shrink-0 w-48 md:w-64 p-3 rounded-xl border border-amber-500/15 dark:border-amber-500/10 bg-amber-500/4 dark:bg-amber-500/2 hover:bg-amber-500/8 dark:hover:bg-amber-500/6 transition-all cursor-pointer text-start group"
                        : "shrink-0 w-48 md:w-64 p-3 rounded-xl border border-(--glass-border) bg-(--glass-bg) hover:bg-black/6 dark:hover:bg-white/6 transition-all cursor-pointer text-start group"
                    }
                    dir="rtl"
                  >
                    <p
                      className="text-sm text-(--text-secondary) font-medium truncate"
                      title={card.title}
                    >
                      {card.title}
                    </p>
                    <p className="text-xs text-(--text-muted) mt-1 truncate" title={card.subtitle}>
                      {card.subtitle}
                    </p>
                    <span
                      className={
                        card.personal
                          ? "inline-block text-xs px-2 py-0.5 mt-2 rounded-full bg-amber-500/10 text-amber-600/70 dark:text-amber-400/70 border border-amber-500/10"
                          : "inline-block text-xs px-2 py-0.5 mt-2 rounded-full bg-(--glass-bg) text-(--text-muted) border border-(--glass-border)"
                      }
                    >
                      {card.pill}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )
        )}
      </>
    );
  },
);

InputSection.displayName = "InputSection";
