"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Check, Copy, ExternalLink, HelpCircle, Plus, RotateCcw, Share2, ThumbsUp, ThumbsDown, RefreshCw } from "lucide-react";
import { trackShare } from "@/lib/analytics";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PromptScore } from "@/lib/engines/base-engine";
import { ChatGPTIcon, ClaudeIcon, GeminiIcon, WhatsAppIcon } from "@/components/ui/AIPlatformIcons";
import type { StreamPhase } from "@/hooks/usePromptWorkflow";
import { ReferralShareCTA } from "@/components/features/referral/ReferralShareCTA";
import { CapabilityMode } from "@/lib/capability-mode";
import { getVariableLabel, getVariablePlaceholder, substituteVariables } from "@/lib/variable-utils";
import { renderPromptWithVariables } from "@/lib/text-utils";
import { BeforeAfterSplit } from "@/components/ui/BeforeAfterSplit";
import { ScoreDelta } from "@/components/ui/ScoreDelta";
import { ExportPdfButton } from "@/components/ui/ExportPdfButton";

const blinkKeyframes = `
@keyframes peroot-blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}
.peroot-streaming-cursor {
  display: inline;
  color: var(--accent-text);
  animation: peroot-blink 0.8s step-start infinite;
  user-select: none;
}
`;

interface ResultSectionProps {
  completion: string;
  isLoading?: boolean;
  streamPhase?: StreamPhase;
  completionScore: PromptScore | null;
  improvementDelta: number;
  copied: boolean;
  isPro?: boolean;
  onCopy: (text: string, withWatermark?: boolean) => void;
  onBack: () => void;
  onSave: () => void;
  onSaveAsTemplate?: () => void;
  placeholders?: string[];
  variableValues?: Record<string, string>;
  preFilledKeys?: string[];
  onVariableChange?: (key: string, value: string) => void;
  onImproveAgain?: () => void;
  onRetryStream?: () => void;
  onResetToOriginal?: () => void;
  iterationCount?: number;
  originalPrompt?: string;
  onShare?: () => void;
  onReset?: () => void;
  isAuthenticated?: boolean;
  /** Current capability mode - used to show platform-specific launch links */
  capabilityMode?: CapabilityMode;
  /** Selected platform for image/video modes (e.g. 'midjourney', 'runway') */
  selectedPlatform?: string;
}

import { useI18n } from "@/context/I18nContext";

/** Platform URLs for image/video generation tools - opens the platform so users can paste the prompt */
const GENERATION_PLATFORM_URLS: Record<string, { name: string; url: string; color: string }> = {
  // Image platforms
  midjourney: { name: "Midjourney", url: "https://www.midjourney.com/", color: "#0A84FF" },
  dalle: { name: "DALL-E 3", url: "https://chat.openai.com/", color: "#10a37f" },
  flux: { name: "Flux", url: "https://flux.ai/", color: "#7C3AED" },
  'stable-diffusion': { name: "Stable Diffusion", url: "https://stablediffusionweb.com/", color: "#A855F7" },
  imagen: { name: "Google Imagen", url: "https://aitestkitchen.withgoogle.com/", color: "#4285f4" },
  nanobanana: { name: "Gemini Image", url: "https://gemini.google.com/", color: "#4285f4" },
  // Video platforms
  runway: { name: "Runway", url: "https://app.runwayml.com/", color: "#00D4AA" },
  kling: { name: "Kling", url: "https://klingai.com/", color: "#FF6B35" },
  sora: { name: "Sora", url: "https://sora.com/", color: "#10a37f" },
  veo: { name: "Google Veo", url: "https://deepmind.google/technologies/veo/", color: "#4285f4" },
  higgsfield: { name: "Higgsfield", url: "https://higgsfield.ai/", color: "#8B5CF6" },
  minimax: { name: "Minimax", url: "https://hailuoai.video/", color: "#3B82F6" },
};

export function ResultSection({
  completion,
  isLoading = false,
  streamPhase,
  completionScore,
  improvementDelta,
  copied,
  isPro = false,
  onCopy,
  onBack,
  onSave,
  onSaveAsTemplate,
  placeholders = [],
  variableValues = {},
  preFilledKeys = [],
  onVariableChange,
  onImproveAgain,
  onRetryStream,
  onResetToOriginal,
  iterationCount,
  originalPrompt,
  onShare,
  onReset,
  isAuthenticated = false,
  capabilityMode,
  selectedPlatform,
}: ResultSectionProps) {
    const t = useI18n();
  const isMac = useMemo(() => typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.platform), []);
  const copyShortcutHint = isMac ? "⌘⇧C" : "Ctrl+⇧C";
  // Pro users can toggle the watermark off; free users always get the watermark.
  const [proWatermarkEnabled, setProWatermarkEnabled] = useState(false);
  // Anchor 2 — toggle to show word-level diff between original and enhanced.
  const [showDiff, setShowDiff] = useState(false);

  const isInterrupted = streamPhase === 'interrupted';

  // Hover sync: when the user hovers an input row in the Variables
  // Panel, the matching chip in the rendered prompt picks up a stronger
  // ring (and vice-versa). Cleared on mouse leave / blur. Cheap because
  // typical prompts have <50 chips and React diffing is fast at that
  // scale.
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  // Plain-text substitution: keeps copy, export, share, and WhatsApp
  // handoffs semantically identical to the string the LLM returned,
  // with user-filled variable values inlined. Missing values leave the
  // `{token}` in place so the user gets an obvious hint on paste.
  const displayCompletion = useMemo(
    () => substituteVariables(completion, variableValues),
    [completion, variableValues]
  );

  // Styled rendering for the "after" view: shows Hebrew labels in
  // sky-blue chips for unfilled tokens and emerald marks for filled
  // values. The third arg threads the hover state in so chips light up
  // when their matching input row is hovered. onHoverKey lets the chips
  // sync the highlight back to the input column.
  const displayNode = useMemo(
    () => renderPromptWithVariables(completion, variableValues, {
      hoveredKey,
      onHoverKey: setHoveredKey,
    }),
    [completion, variableValues, hoveredKey]
  );

  // Unified copy handler used by all copy entry-points inside this component.
  // withWatermark is determined by isPro + toggle state unless explicitly overridden.
  const handleCopy = (text: string, forceWatermark?: boolean) => {
    const shouldWatermark = forceWatermark !== undefined
      ? forceWatermark
      : isPro ? proWatermarkEnabled : true;
    onCopy(text, shouldWatermark);
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {isLoading && <style>{blinkKeyframes}</style>}

      {/* Interrupted Stream Warning */}
      {isInterrupted && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300" role="alert" dir="rtl">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="text-sm font-medium">התגובה נקטעה באמצע. הטקסט למטה הוא חלקי.</span>
          </div>
          {onRetryStream && (
            <button
              onClick={onRetryStream}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/35 text-amber-200 text-xs font-medium transition-colors cursor-pointer shrink-0 focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              נסה שוב
            </button>
          )}
        </div>
      )}

      {/* Header Card */}
      <div className="glass-card p-6 rounded-xl border-[var(--glass-border)] flex items-start justify-between group">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-serif text-[var(--text-primary)] mb-1">{t.result_section.title}</h2>
          <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
            <span>{t.result_section.ready}</span>
          </div>
        </div>
        {completionScore && (
          <ScoreDelta
            before={improvementDelta > 0 ? Math.max(0, completionScore.score - improvementDelta) : null}
            after={completionScore.score}
          />
        )}
      </div>

      {/* 5.6 RTL: use flex-col lg:flex-row for variable panel stacking */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main Result Area */}
        <div className={cn("glass-card rounded-xl border-[var(--glass-border)] bg-white/60 dark:bg-black/40 overflow-hidden relative group flex flex-col", placeholders.length > 0 ? "lg:flex-1" : "w-full")}>

          {/* Floating copy + export buttons */}
          <div className="absolute top-4 end-4 flex items-center gap-2 opacity-50 hover:opacity-100 transition-opacity z-10">
            <ExportPdfButton
              title={displayCompletion.slice(0, 60)}
              original={originalPrompt ?? ''}
              enhanced={displayCompletion}
              score={
                completionScore
                  ? {
                      before:
                        improvementDelta > 0
                          ? Math.max(0, completionScore.score - improvementDelta)
                          : null,
                      after: completionScore.score,
                    }
                  : null
              }
              disabled={isLoading || !completion}
            />
            <button
              onClick={() => handleCopy(displayCompletion)}
              className="p-2 rounded-lg bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-[var(--text-primary)] transition-colors min-h-11 min-w-11 flex items-center justify-center focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
              title={t.result_section.copy_tooltip}
              aria-label="העתק פרומפט"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          {/* Content area - loading skeleton OR shared BeforeAfterSplit */}
          {isLoading && !completion ? (
            <div className="p-8 space-y-4 animate-pulse" dir="rtl">
              <div className="h-4 bg-[var(--glass-border)] rounded w-3/4" />
              <div className="h-4 bg-[var(--glass-border)] rounded w-full" />
              <div className="h-4 bg-[var(--glass-border)] rounded w-5/6" />
              <div className="h-4 bg-[var(--glass-border)] rounded w-2/3" />
              <div className="h-4 bg-[var(--glass-border)] rounded w-4/5" />
            </div>
          ) : (
            <div className="p-4 flex-1">
              {/* Anchor 2 — Diff toggle: tabs (default) ↔ visual diff.
                  Only shown when the original prompt exists (refinement
                  flows reuse this component without an "original"). */}
              {(originalPrompt ?? '').trim().length > 0 && (
                <div className="flex items-center justify-end mb-2" dir="rtl">
                  <button
                    type="button"
                    onClick={() => setShowDiff(v => !v)}
                    aria-pressed={showDiff}
                    className={cn(
                      'px-3 py-1 rounded-full text-[11px] font-semibold border transition-colors',
                      showDiff
                        ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40'
                        : 'text-[var(--text-muted)] border-[var(--glass-border)] hover:text-[var(--text-primary)]'
                    )}
                  >
                    {showDiff ? '↩ חזור לתצוגה רגילה' : 'הצג שינויים'}
                  </button>
                </div>
              )}
              <BeforeAfterSplit
                original={originalPrompt ?? ''}
                enhanced={displayCompletion}
                enhancedNode={displayNode}
                mode={showDiff ? 'diff' : 'tabs'}
                score={
                  completionScore
                    ? {
                        before: improvementDelta > 0 ? Math.max(0, completionScore.score - improvementDelta) : null,
                        after: completionScore.score,
                      }
                    : undefined
                }
              />
            </div>
          )}

          {/* AI Platform Quick-Launch Bar */}
          {/* 5.2 Mobile: grid-cols-2 on mobile, flex on sm+ */}
          {!isLoading && (
            <div className="px-4 py-4 border-t border-[var(--glass-border)] bg-linear-to-r from-black/[0.02] dark:from-white/2 to-transparent">
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-3 justify-center" dir="rtl">
                <span className="hidden sm:inline text-xs text-slate-500 ms-2">פתח ב:</span>

                {/* Target platform link - shown for image/video modes with a specific platform selected */}
                {selectedPlatform && selectedPlatform !== 'general' && GENERATION_PLATFORM_URLS[selectedPlatform] && (() => {
                  const plat = GENERATION_PLATFORM_URLS[selectedPlatform];
                  return (
                    <button
                      onClick={() => {
                        handleCopy(displayCompletion);
                        window.open(plat.url, "_blank");
                        toast.success(`${t.toasts.copied} - ${plat.name} נפתח!`);
                      }}
                      className="flex items-center justify-center gap-2 px-3 py-2.5 sm:px-4 sm:py-2 rounded-lg border-2 text-sm transition-all group cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none col-span-2 sm:col-span-1 font-medium"
                      style={{
                        borderColor: `${plat.color}40`,
                        backgroundColor: `${plat.color}15`,
                        color: plat.color,
                      }}
                      title={`העתק ופתח ב-${plat.name}`}
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>פתח ב-{plat.name}</span>
                    </button>
                  );
                })()}

                <button
                  onClick={() => {
                    handleCopy(displayCompletion);
                    window.open("https://chat.openai.com/", "_blank");
                    toast.success(`${t.toasts.copied} - ChatGPT נפתח!`);
                  }}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 sm:px-4 sm:py-2 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] hover:bg-[#10a37f]/10 hover:border-[#10a37f]/30 text-[var(--text-secondary)] hover:text-[#10a37f] text-sm transition-all group cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
                  title="העתק והפתח ב-ChatGPT"
                >
                  <ChatGPTIcon className="w-4 h-4" />
                  <span>ChatGPT</span>
                  <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block" />
                </button>
                <button
                  onClick={() => {
                    handleCopy(displayCompletion);
                    window.open("https://claude.ai/new", "_blank");
                    toast.success(`${t.toasts.copied} - Claude נפתח!`);
                  }}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 sm:px-4 sm:py-2 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] hover:bg-[#d97706]/10 hover:border-[#d97706]/30 text-[var(--text-secondary)] hover:text-[#d97706] text-sm transition-all group cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
                  title="העתק והפתח ב-Claude"
                >
                  <ClaudeIcon className="w-4 h-4" />
                  <span>Claude</span>
                  <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block" />
                </button>
                <button
                  onClick={() => {
                    handleCopy(displayCompletion);
                    window.open("https://gemini.google.com/", "_blank");
                    toast.success(`${t.toasts.copied} - Gemini נפתח!`);
                  }}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 sm:px-4 sm:py-2 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] hover:bg-[#4285f4]/10 hover:border-[#4285f4]/30 text-[var(--text-secondary)] hover:text-[#4285f4] text-sm transition-all group cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
                  title="העתק והפתח ב-Gemini"
                >
                  <GeminiIcon className="w-4 h-4" />
                  <span>Gemini</span>
                  <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block" />
                </button>
                <button
                  onClick={() => {
                    const text = encodeURIComponent(displayCompletion + "\n\n- נוצר עם Peroot | www.peroot.space");
                    window.open(`https://wa.me/?text=${text}`, "_blank");
                  }}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 sm:px-4 sm:py-2 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] hover:bg-[#25d366]/10 hover:border-[#25d366]/30 text-[var(--text-secondary)] hover:text-[#25d366] text-sm transition-all group cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
                  title="שתף בוואטסאפ"
                >
                  <WhatsAppIcon className="w-4 h-4" />
                  <span>WhatsApp</span>
                  <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block" />
                </button>
              </div>
            </div>
          )}

          <div className="p-4 bg-[var(--glass-bg)] border-t border-[var(--glass-border)] mt-auto space-y-3">
            {/* Primary actions row */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={onBack}
                  className="px-4 py-2.5 rounded-lg text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg)] transition-colors focus-visible:ring-2 focus-visible:ring-amber-400/50 focus-visible:outline-none"
                >
                  {t.result_section.back_to_edit}
                </button>
                {/* Reset - start fresh with a new prompt */}
                {onReset && (
                  <button
                    onClick={onReset}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs text-[var(--text-muted)] hover:text-amber-600 dark:hover:text-amber-300 hover:bg-amber-500/10 border border-[var(--glass-border)] transition-colors cursor-pointer min-h-[44px] focus-visible:ring-2 focus-visible:ring-amber-400/50 focus-visible:outline-none"
                    title="לאפס ולהתחיל מחדש"
                    dir="rtl"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    לאפס
                  </button>
                )}
                {/* Back to Original - only shown after at least one refinement */}
                {onResetToOriginal && (iterationCount ?? 0) > 0 && (
                  <button
                    onClick={onResetToOriginal}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs text-[var(--text-muted)] hover:text-amber-600 dark:hover:text-amber-300 hover:bg-amber-500/10 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-400/50 focus-visible:outline-none"
                    title="חזור לפרומפט המקורי שלך"
                    dir="rtl"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    חזור למקור
                  </button>
                )}
              </div>
              {/*
                Mobile-first action bar — two-tier on mobile, single row on sm+.
                Primary actions (Improve Again + Copy) get their own row at the
                top of the bar on mobile so the main CTA never gets wrapped or
                hidden behind secondary buttons. Secondary actions (Share /
                WhatsApp / Save / Template) collapse to icon-only on mobile and
                wrap if needed. On sm+ we use `contents` to unwrap both groups
                into the parent flex row, recovering the original single-row
                desktop layout without duplicating markup.
              */}
              <div className="flex flex-col-reverse items-stretch gap-2 w-full sm:w-auto sm:flex-row sm:items-center">
                {/* Secondary actions — icon-only on mobile, labeled on sm+ */}
                <div className="flex items-center justify-end gap-2 flex-wrap sm:contents">
                  {onShare && (
                    <button
                      onClick={onShare}
                      className="flex items-center gap-1.5 px-2.5 sm:px-4 py-2.5 rounded-lg border border-[var(--glass-border)] text-[var(--text-secondary)] text-xs hover:bg-[var(--glass-bg)] transition-colors cursor-pointer min-h-11 min-w-11 justify-center focus-visible:ring-2 focus-visible:ring-amber-400/50 focus-visible:outline-none"
                      title="שתף"
                      aria-label="שתף"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">שתף</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      const shareText = encodeURIComponent("שדרגתי פרומפט עם Peroot! \u{1F680} נסו גם: https://www.peroot.space");
                      window.open(`https://api.whatsapp.com/send?text=${shareText}`, "_blank");
                      trackShare("whatsapp_result", "https://www.peroot.space");
                    }}
                    className="flex items-center justify-center p-2.5 rounded-lg border border-[#25D366]/30 text-[#25D366] hover:bg-[#25D366]/10 transition-colors cursor-pointer min-h-11 min-w-11 focus-visible:ring-2 focus-visible:ring-[#25D366]/50 focus-visible:outline-none"
                    title="שתף בוואטסאפ"
                    aria-label="שתף בוואטסאפ"
                  >
                    <WhatsAppIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={onSave}
                    className="flex items-center gap-1.5 px-2.5 sm:px-4 py-2.5 rounded-lg border border-[var(--glass-border)] text-[var(--text-secondary)] text-xs hover:bg-[var(--glass-bg)] transition-colors cursor-pointer min-h-11 min-w-11 justify-center focus-visible:ring-2 focus-visible:ring-amber-400/50 focus-visible:outline-none"
                    title={t.result_section.save}
                    aria-label={t.result_section.save}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{t.result_section.save}</span>
                  </button>
                  {onSaveAsTemplate && placeholders.length > 0 && (
                    <button
                      onClick={onSaveAsTemplate}
                      className="flex items-center gap-1.5 px-2.5 sm:px-4 py-2.5 rounded-lg border border-purple-500/30 text-purple-600 dark:text-purple-400 text-xs hover:bg-purple-500/10 transition-colors cursor-pointer min-h-11 min-w-11 justify-center focus-visible:ring-2 focus-visible:ring-purple-400/50 focus-visible:outline-none"
                      title="שמור כתבנית לשימוש חוזר"
                      aria-label="שמור כתבנית"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">שמור כתבנית</span>
                    </button>
                  )}
                </div>
                {/* Primary actions — full-width row on mobile, inline on sm+ */}
                <div className="flex items-center justify-end gap-2 sm:contents">
                  {onImproveAgain && (
                    <button
                      onClick={onImproveAgain}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 text-xs font-medium transition-colors cursor-pointer min-h-11 focus-visible:ring-2 focus-visible:ring-amber-400/50 focus-visible:outline-none"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      {t.result?.improve_again || 'שפר שוב'}
                      {(iterationCount ?? 0) > 0 && (
                        <span className="bg-amber-500/30 text-amber-200 text-[10px] px-1.5 py-0.5 rounded-full">
                          #{iterationCount}
                        </span>
                      )}
                    </button>
                  )}
                  <button
                    onClick={() => handleCopy(displayCompletion)}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg accent-gradient text-black font-medium text-xs hover:shadow-[0_0_20px_rgba(245,158,11,0.25)] transition-all cursor-pointer min-h-11 focus-visible:ring-2 focus-visible:ring-amber-400/50 focus-visible:outline-none"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? t.result_section.copied : t.result_section.copy_button}
                    {!copied && <kbd className="hidden sm:inline text-[10px] opacity-50 font-normal font-mono bg-black/10 px-1.5 py-0.5 rounded">{copyShortcutHint}</kbd>}
                  </button>
                </div>
              </div>
            </div>

            {/* Pro watermark toggle - only visible to Pro users */}
            {isPro && (
              <div className="flex items-center justify-end gap-2 pt-1" dir="rtl">
                <label className="flex items-center gap-2 cursor-pointer select-none group">
                  <input
                    type="checkbox"
                    checked={proWatermarkEnabled}
                    onChange={(e) => setProWatermarkEnabled(e.target.checked)}
                    className="w-3.5 h-3.5 accent-amber-400 cursor-pointer"
                  />
                  <span className="text-[10px] text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] transition-colors">
                    העתק עם מיתוג Peroot
                  </span>
                </label>
              </div>
            )}

            {/* Feedback row - subtle */}
            <div className="flex items-center justify-center gap-4 pt-2 border-t border-[var(--glass-border)]">
              <span className="text-[10px] text-[var(--text-muted)]">מה דעתך על התוצאה?</span>
              <div className="flex items-center gap-1">
                <button disabled aria-label="Like" className="p-1.5 rounded-md text-slate-500 hover:text-emerald-400 hover:bg-emerald-400/10 transition-colors disabled:opacity-60 disabled:cursor-default">
                  <ThumbsUp className="w-3.5 h-3.5" />
                </button>
                <button disabled aria-label="Dislike" className="p-1.5 rounded-md text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-60 disabled:cursor-default">
                  <ThumbsDown className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Referral Share CTA - floating popup, rendered via portal-like fixed position */}
        {!isLoading && completion && (
          <ReferralShareCTA isAuthenticated={isAuthenticated} />
        )}

        {/* Variables Panel — shows Hebrew labels from the canonical
            variable registry. Each input is bound to a `{token}` slot in
            the prompt; typed values are inlined live via the displayNode
            memo above, so the user sees the result update as they type.
            Color scheme: sky-blue accent matches the unfilled-chip color
            in the rendered prompt; emerald border appears when the
            current input has a non-empty value, echoing the filled-mark
            color. Pre-filled hints from prior prompts use the brand
            amber so they stand out as "history, not mandatory". */}
        {placeholders.length > 0 && (
          <div className="glass-card p-5 rounded-xl border-[var(--glass-border)] bg-[var(--glass-bg)] flex flex-col gap-4 h-fit lg:w-72">
            <div className="flex items-start gap-2 pb-3 border-b border-[var(--glass-border)]">
               <div className="bg-sky-500/20 text-sky-700 dark:text-sky-300 p-1.5 rounded-md mt-0.5">
                 <Plus className="w-4 h-4" />
               </div>
               <div className="flex-1 min-w-0">
                 <div className="flex items-center gap-1.5">
                   <span className="text-sm font-semibold text-[var(--text-primary)]">
                     {t.result_section.variables_title}
                   </span>
                   <span
                     className="cursor-help text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                     title="כל שדה מחליף את החלון הצבוע המתאים בתוך הפרומפט. הפרומפט מתעדכן בזמן אמת. אפשר לדלג על שדות — הם יישארו כפלייסהולדר עד שתמלא אותם."
                     aria-label="הסבר על משתנים"
                   >
                     <HelpCircle className="w-3.5 h-3.5" />
                   </span>
                 </div>
                 <p className="text-[10px] text-[var(--text-muted)] mt-0.5 leading-relaxed">
                   מלא את השדות והפרומפט יתעדכן בזמן אמת
                 </p>
               </div>
            </div>
            <div className="flex flex-col gap-3">
               {placeholders.map((ph, i) => {
                 const label = getVariableLabel(ph);
                 const exampleHint = getVariablePlaceholder(ph);
                 const currentValue = variableValues[ph] || "";
                 const isFilled = currentValue.trim().length > 0;
                 const isPreFilled = preFilledKeys.includes(ph) && isFilled;
                 const isHovered = hoveredKey === ph;
                 // Sync hover state with the matching chip/mark in the
                 // rendered prompt. We attach to the row wrapper so both
                 // the label and the input itself trigger highlight, and
                 // we mirror onFocus/onBlur for keyboard navigation.
                 const hoverHandlers = {
                   onMouseEnter: () => setHoveredKey(ph),
                   onMouseLeave: () => setHoveredKey(null),
                 };
                 return (
                 <div
                   key={i}
                   className="space-y-1.5"
                   data-var-key={ph}
                   {...hoverHandlers}
                 >
                    <label className="text-xs font-medium ms-1 flex items-center justify-between gap-2" dir="rtl">
                      <span
                        className="text-[var(--text-primary)] truncate"
                        title={ph}
                      >
                        {label}
                      </span>
                      {isPreFilled && (
                        <span className="text-[10px] text-amber-500 dark:text-amber-400 font-normal shrink-0">
                          נטען מפרומפט קודם
                        </span>
                      )}
                    </label>
                    <input
                      dir="rtl"
                      value={currentValue}
                      onChange={(e) => onVariableChange?.(ph, e.target.value)}
                      onFocus={() => setHoveredKey(ph)}
                      onBlur={() => setHoveredKey(null)}
                      placeholder={exampleHint}
                      aria-label={label}
                      className={cn(
                        "w-full border rounded-lg py-2.5 px-3 text-sm text-[var(--text-primary)] focus:outline-none transition-all placeholder:text-[var(--text-muted)]",
                        isFilled
                          ? "bg-emerald-500/[0.04] dark:bg-emerald-400/[0.04] border-emerald-500/40 dark:border-emerald-400/40 focus:border-emerald-500/60"
                          : isPreFilled
                            ? "bg-amber-500/5 dark:bg-amber-500/[0.03] border-amber-500/20 focus:border-amber-500/50"
                            : "bg-black/5 dark:bg-black/40 border-[var(--glass-border)] focus:border-sky-500/50",
                        isHovered && (isFilled
                          ? "ring-2 ring-emerald-500/40 dark:ring-emerald-400/40"
                          : "ring-2 ring-sky-500/40 dark:ring-sky-400/40")
                      )}
                    />
                 </div>
                 );
               })}
            </div>
            {/* Color legend — explains the three input/chip states the
                user will encounter. Mirrors the same tokens used in the
                rendered prompt so the legend doubles as a key for
                reading the highlighted output. */}
            <div className="flex items-center justify-around pt-3 mt-1 border-t border-[var(--glass-border)] text-[10px] text-[var(--text-muted)]" aria-label="מקרא מצבים">
              <div className="flex items-center gap-1.5" title="משתנה שעדיין לא מולא — מופיע כתווית כחולה בפרומפט">
                <span className="w-2.5 h-2.5 rounded-sm bg-sky-500/15 border border-sky-500/50" aria-hidden="true" />
                <span>ריק</span>
              </div>
              <div className="flex items-center gap-1.5" title="משתנה שמילאת — מופיע כהדגשה ירוקה בפרומפט">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/15 border border-emerald-500/50" aria-hidden="true" />
                <span>מלא</span>
              </div>
              <div className="flex items-center gap-1.5" title="ערך שנטען אוטומטית מפרומפט קודם שלך">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-500/15 border border-amber-500/50" aria-hidden="true" />
                <span>היסטוריה</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
