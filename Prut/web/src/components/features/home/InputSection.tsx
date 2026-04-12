"use client";

import { memo, useMemo, type SetStateAction } from "react";
import { Clock, BookOpen, Shuffle, Lightbulb, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import { PromptInput } from "@/components/features/prompt-improver/PromptInput";
import { ContextChips } from "@/components/features/context/ContextChips";
import { SupportedPlatforms } from "@/components/features/landing/SupportedPlatforms";
import type { ContextAttachment } from "@/lib/context/types";
import { CapabilityMode } from "@/lib/capability-mode";
import { TargetModel } from "@/lib/engines/types";
import { ImagePlatform, ImageOutputFormat } from "@/lib/media-platforms";
import { VideoPlatform } from "@/lib/video-platforms";
import { HistoryItem } from "@/hooks/useHistory";
import { LibraryPrompt, PersonalPrompt } from "@/lib/types";
import type { InputScore } from "@/lib/engines/scoring/input-scorer";
import { PromptAction } from "@/hooks/usePromptWorkflow";

const ReferralBanner = dynamic(
  () => import("@/components/features/referral/ReferralBanner").then(mod => mod.ReferralBanner),
  { ssr: false }
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
  onUsePrompt: (prompt: LibraryPrompt | PersonalPrompt) => void;
  incrementUseCount: (id: string) => void;
  onNavToPersonalLibrary: () => void;

  // Library features
  filteredLibrary: LibraryPrompt[];
  libraryPrompts: LibraryPrompt[];
  onSurpriseMe: () => void;
  onNavLibrary: () => void;
  dispatch: (action: PromptAction) => void;

  // Context attachments
  contextAttachments: ContextAttachment[];
  onAddFile: (file: File) => void;
  onAddFiles?: (files: File[]) => Promise<void>;
  onAddUrl: (url: string) => void;
  onAddImage: (file: File) => void;
  onRetryAttachment?: (id: string) => void;
  onRemoveAttachment: (id: string) => void;
  contextTotalTokens: number;
  contextIsOverLimit: boolean;
  contextLimits?: { maxFiles: number; tokenLimit: number };

  // Target model
  targetModel: TargetModel;
  setTargetModel: (model: TargetModel) => void;

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

export const InputSection = memo<InputSectionProps>(({
  inputVal,
  setInputVal,
  handleEnhance,
  liveInputScore,
  selectedCategory,
  setSelectedCategory,
  selectedCapability,
  setSelectedCapability,
  isLoading,
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
  onUsePrompt,
  incrementUseCount,
  onNavToPersonalLibrary,
  filteredLibrary,
  libraryPrompts,
  onSurpriseMe,
  onNavLibrary,
  dispatch,
  contextAttachments,
  onAddFile,
  onAddFiles,
  onAddUrl,
  onAddImage,
  onRetryAttachment,
  onRemoveAttachment,
  contextTotalTokens,
  contextIsOverLimit,
  contextLimits,
  targetModel,
  setTargetModel,
  creditsRemaining,
  isNewUser,
  user,
  previousView,
  onBackToLibrary,
  onInterimChange,
}) => {
  // Prompt of the Day - deterministic daily pick
  const promptOfTheDay = useMemo(() => {
    if (!libraryPrompts || libraryPrompts.length === 0) return null;
    const today = new Date();
    const dayIndex = (today.getFullYear() * 366 + today.getMonth() * 31 + today.getDate()) % libraryPrompts.length;
    return libraryPrompts[dayIndex];
  }, [libraryPrompts]);

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
            חזרה לספרייה
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
        hasAttachments={contextAttachments.length > 0}
        targetModel={targetModel}
        setTargetModel={setTargetModel}
        creditsRemaining={creditsRemaining}
        onInterimChange={onInterimChange}
      />

      {/* Context attachment chips */}
      <ContextChips
        attachments={contextAttachments}
        onRemove={onRemoveAttachment}
        onRetry={onRetryAttachment}
        maxFiles={contextLimits?.maxFiles}
        tokenLimit={contextLimits?.tokenLimit}
      />

      {/* Supported Platforms marquee — showcases every engine Peroot optimizes for */}
      <SupportedPlatforms />

      {/* Recently Used Prompts Strip */}
      {history.length > 0 && (
        <div className="mt-3">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-xs font-medium text-slate-500">השתמשת לאחרונה</span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {history.slice(0, 5).map((item, i) => (
              <button
                key={i}
                onClick={() => { onRestore(item); }}
                className="shrink-0 w-48 md:w-64 p-3 rounded-xl border border-(--glass-border) bg-(--glass-bg) hover:bg-black/6 dark:hover:bg-white/6 transition-all cursor-pointer text-start group"
                dir="rtl"
              >
                <p className="text-sm text-(--text-secondary) font-medium truncate" title={item.title || item.original}>{item.title || item.original.slice(0, 40)}</p>
                <p className="text-xs text-(--text-muted) mt-1 truncate" title={item.original}>{item.original.slice(0, 60)}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-(--glass-bg) text-(--text-muted) border border-(--glass-border)">{item.category || 'כללי'}</span>
                  <span className="text-xs text-(--text-muted)">{item.tone || ''}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recent Personal Prompts Widget */}
      {recentPersonalPrompts.length > 0 && (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-medium text-amber-600/80 dark:text-amber-400/80">פרומפטים אחרונים מהספרייה</span>
            </div>
            <button
              onClick={onNavToPersonalLibrary}
              className="text-xs text-slate-500 hover:text-amber-400 transition-colors"
            >
              לכל הספרייה &larr;
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {recentPersonalPrompts.map((prompt) => (
              <button
                key={prompt.id}
                onClick={() => {
                  onUsePrompt(prompt);
                  incrementUseCount(prompt.id);
                }}
                className="shrink-0 w-48 md:w-64 p-3 rounded-xl border border-amber-500/15 dark:border-amber-500/10 bg-amber-500/4 dark:bg-amber-500/2 hover:bg-amber-500/8 dark:hover:bg-amber-500/6 transition-all cursor-pointer text-start group"
                dir="rtl"
              >
                <div className="flex items-center gap-2 mb-1">
                  {prompt.is_pinned && (
                    <span className="text-amber-400 text-[10px]">&#128204;</span>
                  )}
                  <p className="text-sm text-(--text-secondary) font-medium truncate flex-1" title={prompt.title}>{prompt.title}</p>
                </div>
                <p className="text-xs text-(--text-muted) mt-1 truncate" title={prompt.use_case}>{prompt.use_case}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600/70 dark:text-amber-400/70 border border-amber-500/10">{prompt.personal_category || 'כללי'}</span>
                  {prompt.use_count > 0 && (
                    <span className="text-xs text-(--text-muted)">x{prompt.use_count}</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Prompt of the Day + Surprise Me */}
      {filteredLibrary.length > 0 && (
        <div className="flex flex-col gap-4 mt-2">
          {/* Surprise Me Button */}
          <button
            onClick={onSurpriseMe}
            className="flex items-center gap-2 justify-center px-4 py-3 rounded-xl border border-(--glass-border) bg-(--glass-bg) hover:bg-black/6 dark:hover:bg-white/6 text-(--text-muted) hover:text-(--text-primary) text-sm transition-all cursor-pointer group"
          >
            <Shuffle className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
            <span>הפתע אותי - פרומפט אקראי מהספריה</span>
          </button>

          {/* Prompt of the Day */}
          {promptOfTheDay && (
            <div className="glass-card rounded-xl border-(--glass-border) bg-linear-to-l from-amber-500/6 dark:from-amber-500/4 to-transparent overflow-hidden">
              <div className="px-5 py-3 border-b border-(--glass-border) flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                <span className="text-xs font-bold text-amber-600/80 dark:text-amber-400/80 uppercase tracking-wider">פרומפט היום</span>
              </div>
              <div className="p-5 flex flex-col gap-3">
                <h3 className="text-base font-semibold text-(--text-primary)" dir="rtl">{promptOfTheDay.title}</h3>
                <p className="text-sm text-(--text-muted) leading-relaxed line-clamp-2" dir="rtl">{promptOfTheDay.use_case}</p>
                <div className="flex items-center gap-2 mt-1">
                  <button
                    onClick={() => {
                      dispatch({ type: 'SET_INPUT', payload: promptOfTheDay.prompt });
                      toast.success('פרומפט היום נטען!');
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 text-xs font-medium transition-colors cursor-pointer"
                  >
                    השתמש בפרומפט
                  </button>
                  <button
                    onClick={onNavLibrary}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-(--glass-border) text-(--text-muted) hover:text-(--text-primary) hover:bg-(--glass-bg) text-xs transition-colors cursor-pointer"
                  >
                    עוד פרומפטים מהספריה
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
});

InputSection.displayName = "InputSection";
