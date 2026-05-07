"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  Check,
  ChevronRight,
  Copy,
  ExternalLink,
  HelpCircle,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCcw,
  Share2,
  RefreshCw,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PromptScore } from "@/lib/engines/base-engine";
import { ChatGPTIcon, ClaudeIcon, GeminiIcon, WhatsAppIcon } from "@/components/ui/AIPlatformIcons";
import type { StreamPhase } from "@/hooks/usePromptWorkflow";
import { ReferralShareCTA } from "@/components/features/referral/ReferralShareCTA";
import { CapabilityMode } from "@/lib/capability-mode";
import {
  getVariableLabel,
  getVariablePlaceholder,
  substituteVariables,
} from "@/lib/variable-utils";
import { renderPromptWithVariables } from "@/lib/text-utils";
import { BeforeAfterSplit } from "@/components/ui/BeforeAfterSplit";
import { ScoreDelta } from "@/components/ui/ScoreDelta";
import { ScoreBreakdownDrawer } from "@/components/ui/ScoreBreakdownDrawer";
import { EnhancedScorer, type EnhancedScore } from "@/lib/engines/scoring/enhanced-scorer";
import { QUICK_REFINE_ACTIONS } from "@/lib/constants";
import { trackFeatureUse } from "@/lib/analytics";
import styles from "./ResultSection.module.css";

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
  /**
   * Save the current completion to the personal library AND immediately
   * mark it as a favorite. Replaces the old like/dislike buttons with a
   * single "keeper" signal the user asked for.
   */
  onSaveAsFavorite?: () => void;
  onSaveAsTemplate?: () => void;
  placeholders?: string[];
  variableValues?: Record<string, string>;
  preFilledKeys?: string[];
  onVariableChange?: (key: string, value: string) => void;
  onImproveAgain?: () => void;
  /** Preset refinement instructions (דלתות מהירות) — runs true refine, not re-enhance from scratch */
  onQuickRefine?: (instruction: string) => void;
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
  /** Remaining free credits today — shown in the "שפר שוב" confirm popup */
  creditsLeft?: number;
}

import { useI18n } from "@/context/I18nContext";

/** Platform URLs for image/video generation tools - opens the platform so users can paste the prompt */
const GENERATION_PLATFORM_URLS: Record<string, { name: string; url: string; color: string }> = {
  // Image platforms
  midjourney: { name: "Midjourney", url: "https://www.midjourney.com/", color: "#0A84FF" },
  dalle: { name: "GPT Image 2", url: "https://chat.openai.com/", color: "#10a37f" },
  flux: { name: "Flux", url: "https://flux.ai/", color: "#7C3AED" },
  "stable-diffusion": {
    name: "Stable Diffusion",
    url: "https://stablediffusionweb.com/",
    color: "#A855F7",
  },
  imagen: { name: "Google Imagen", url: "https://aitestkitchen.withgoogle.com/", color: "#4285f4" },
  nanobanana: { name: "Gemini Image", url: "https://gemini.google.com/", color: "#4285f4" },
  // Video platforms
  runway: { name: "Runway", url: "https://app.runwayml.com/", color: "#00D4AA" },
  kling: { name: "Kling", url: "https://klingai.com/", color: "#FF6B35" },
  sora: { name: "Sora (deprecated)", url: "https://sora.com/", color: "#10a37f" },
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
  onSaveAsFavorite,
  onSaveAsTemplate,
  placeholders = [],
  variableValues = {},
  preFilledKeys = [],
  onVariableChange,
  onImproveAgain,
  onQuickRefine,
  onRetryStream,
  onResetToOriginal,
  iterationCount,
  originalPrompt,
  onShare,
  onReset,
  isAuthenticated = false,
  capabilityMode,
  selectedPlatform,
  creditsLeft,
}: ResultSectionProps) {
  const t = useI18n();
  const isMac = useMemo(
    () => typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.platform),
    [],
  );
  const copyShortcutHint = isMac ? "⌘⇧C" : "Ctrl+⇧C";
  // Pro users can toggle the watermark off; free users always get the watermark.
  const [proWatermarkEnabled, setProWatermarkEnabled] = useState(false);
  // P3 — score breakdown drawer state. Computed lazily on click so we
  // don't run EnhancedScorer on every render (it's cheap but no reason to).
  const [breakdownScore, setBreakdownScore] = useState<EnhancedScore | null>(null);
  const [showMorePanel, setShowMorePanel] = useState(false);
  const [showRefineConfirm, setShowRefineConfirm] = useState(false);
  const [savedToLibrary, setSavedToLibrary] = useState(false);

  const openScoreBreakdown = () => {
    const textToScore = displayCompletion || "";
    if (!textToScore) return;
    const computed = EnhancedScorer.score(textToScore, capabilityMode ?? CapabilityMode.STANDARD);
    setBreakdownScore(computed);
  };

  const isInterrupted = streamPhase === "interrupted";

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
  // React Compiler handles memoization — manual useMemo would be skipped.
  const displayCompletion = substituteVariables(completion, variableValues);

  // Styled rendering for the "after" view: shows Hebrew labels in
  // sky-blue chips for unfilled tokens and emerald marks for filled
  // values. The third arg threads the hover state in so chips light up
  // when their matching input row is hovered. onHoverKey lets the chips
  // sync the highlight back to the input column.
  const displayNode = renderPromptWithVariables(completion, variableValues, {
    hoveredKey,
    onHoverKey: setHoveredKey,
  });

  // Unified copy handler used by all copy entry-points inside this component.
  // withWatermark is determined by isPro + toggle state unless explicitly overridden.
  const handleCopy = (text: string, forceWatermark?: boolean) => {
    const shouldWatermark =
      forceWatermark !== undefined ? forceWatermark : isPro ? proWatermarkEnabled : true;
    onCopy(text, shouldWatermark);
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {isLoading && <style>{blinkKeyframes}</style>}

      {/* Interrupted Stream Warning */}
      {isInterrupted && (
        <div
          className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300"
          role="alert"
          dir="rtl"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="text-sm font-medium">התגובה נקטעה באמצע. הטקסט למטה הוא חלקי.</span>
          </div>
          {onRetryStream && (
            <button
              onClick={onRetryStream}
              className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-lg bg-amber-500/20 hover:bg-amber-500/35 text-amber-200 text-xs font-medium transition-colors cursor-pointer shrink-0 focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              נסה שוב
            </button>
          )}
        </div>
      )}

      {/* Header Card */}
      <div className="glass-card p-6 rounded-xl border-(--glass-border) flex items-start justify-between group">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-serif text-(--text-primary) mb-1">
            {t.result_section.title}
          </h2>
          <div className="flex items-center gap-3 text-xs text-(--text-muted)">
            <span>{t.result_section.ready}</span>
          </div>
        </div>
        {completionScore && (
          <ScoreDelta
            before={
              improvementDelta > 0 ? Math.max(0, completionScore.score - improvementDelta) : null
            }
            after={completionScore.score}
            onDrillDown={openScoreBreakdown}
          />
        )}
      </div>

      {/* 5.6 RTL: use flex-col lg:flex-row for variable panel stacking */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main Result Area */}
        <div
          className={cn(
            "glass-card rounded-xl border-(--glass-border) bg-white/60 dark:bg-black/40 overflow-hidden group flex flex-col",
            placeholders.length > 0 ? "lg:flex-1" : "w-full",
          )}
        >
          {/* Content area - loading skeleton OR shared BeforeAfterSplit */}
          {isLoading && !completion ? (
            (() => {
              // JSON-mode platforms (stable-diffusion, nanobanana) cannot stream —
              // the full payload only arrives once generation is complete. Show a
              // platform-aware message so users understand the wait is expected.
              const isJsonPlatform =
                selectedPlatform === "stable-diffusion" || selectedPlatform === "nanobanana";
              const platformLabel =
                selectedPlatform === "stable-diffusion"
                  ? "Stable Diffusion"
                  : selectedPlatform === "nanobanana"
                    ? "Gemini Image"
                    : "";
              return (
                <div className="p-8 space-y-4" dir="rtl">
                  {isJsonPlatform && (
                    <div className="flex items-center gap-2 text-sm text-(--text-muted) mb-2">
                      <span className="inline-block w-2 h-2 rounded-full bg-(--accent-text) animate-pulse shrink-0" />
                      <span>מייצר פרמטרים עבור {platformLabel}... (ללא הצגה מתקדמת)</span>
                    </div>
                  )}
                  <div className="animate-pulse space-y-4">
                    <div className="h-4 bg-(--glass-border) rounded w-3/4" />
                    <div className="h-4 bg-(--glass-border) rounded w-full" />
                    <div className="h-4 bg-(--glass-border) rounded w-5/6" />
                    <div className="h-4 bg-(--glass-border) rounded w-2/3" />
                    <div className="h-4 bg-(--glass-border) rounded w-4/5" />
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="p-4 flex-1">
              {/* ── Top toolbar: Reset · Save to Library · Copy ── */}
              <div className="flex items-center justify-between mb-3" dir="rtl">
                {/* Stage chip */}
                <div
                  className="flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold tracking-wide"
                  style={{
                    background: "rgba(253,190,0,0.07)",
                    border: "1px solid rgba(253,190,0,0.16)",
                    color: "#FDBE00",
                    fontFamily: "var(--font-varela)",
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FDBE00] shadow-[0_0_8px_#FDBE00] animate-pulse shrink-0" />
                  פרומפט מוכן
                </div>
                <div className="flex items-center gap-1.5">
                  {/* לאפס */}
                  {onReset && (
                    <button
                      onClick={onReset}
                      className={styles.xBtn}
                      aria-label="לאפס"
                      disabled={isLoading}
                    >
                      <RotateCcw className="w-[15px] h-[15px] shrink-0" />
                      <span className={styles.xBtnLabel}>לאפס</span>
                    </button>
                  )}
                  {/* שמור בספריה */}
                  <button
                    onClick={onSave}
                    className={cn(styles.xBtn, styles.xBtnGold)}
                    aria-label="שמור בספריה"
                    disabled={isLoading}
                  >
                    <BookOpen className="w-[15px] h-[15px] shrink-0" />
                    <span className={styles.xBtnLabel}>שמור בספריה</span>
                  </button>
                  {/* העתק */}
                  <button
                    onClick={() => handleCopy(displayCompletion)}
                    className={styles.xBtn}
                    aria-label={copied ? "הועתק" : "העתק"}
                    disabled={isLoading}
                  >
                    {copied ? (
                      <Check className="w-[15px] h-[15px] shrink-0" />
                    ) : (
                      <Copy className="w-[15px] h-[15px] shrink-0" />
                    )}
                    <span className={styles.xBtnLabel}>העתק</span>
                  </button>
                </div>
              </div>
              <BeforeAfterSplit
                original={originalPrompt ?? ""}
                enhanced={displayCompletion}
                enhancedNode={displayNode}
                mode="tabs"
              />
            </div>
          )}

          {/* ── Platform row — gem-style, single flex row ── */}
          {!isLoading && (
            <div className="px-4 py-3 border-t border-(--glass-border)">
              <div className="flex items-center gap-2 mb-2">
                <span className={styles.sectionLabel}>פתח ב</span>
              </div>
              <div className={styles.platformRow} dir="rtl">
                {/* Target platform (image/video modes) */}
                {selectedPlatform &&
                  selectedPlatform !== "general" &&
                  GENERATION_PLATFORM_URLS[selectedPlatform] &&
                  (() => {
                    const plat = GENERATION_PLATFORM_URLS[selectedPlatform];
                    return (
                      <button
                        onClick={() => {
                          handleCopy(displayCompletion);
                          window.open(plat.url, "_blank");
                          toast.success(`${t.toasts.copied} - ${plat.name} נפתח!`);
                        }}
                        className={cn(styles.gemBtn)}
                        style={{
                          ["--gem-bg" as string]: `${plat.color}1a`,
                          ["--gem-border" as string]: `${plat.color}38`,
                          ["--gem-glow" as string]: `${plat.color}40`,
                          ["--gem-icon-bg" as string]: `${plat.color}2e`,
                        }}
                        aria-label={`פתח ב-${plat.name}`}
                      >
                        <div className={styles.gemIcon}>
                          <ExternalLink style={{ width: 18, height: 18, color: plat.color }} />
                        </div>
                        <span className={styles.gemName}>{plat.name}</span>
                      </button>
                    );
                  })()}

                {/* ChatGPT */}
                <button
                  onClick={() => {
                    handleCopy(displayCompletion);
                    window.open("https://chat.openai.com/", "_blank");
                    toast.success(`${t.toasts.copied} - ChatGPT נפתח!`);
                  }}
                  className={cn(styles.gemBtn, styles.gemGpt)}
                  aria-label="ChatGPT"
                >
                  <div className={styles.gemIcon}>
                    <ChatGPTIcon className="w-[18px] h-[18px]" />
                  </div>
                  <span className={styles.gemName}>ChatGPT</span>
                </button>

                {/* Claude */}
                <button
                  onClick={() => {
                    handleCopy(displayCompletion);
                    window.open("https://claude.ai/new", "_blank");
                    toast.success(`${t.toasts.copied} - Claude נפתח!`);
                  }}
                  className={cn(styles.gemBtn, styles.gemClaude)}
                  aria-label="Claude"
                >
                  <div className={styles.gemIcon}>
                    <ClaudeIcon className="w-[18px] h-[18px]" />
                  </div>
                  <span className={styles.gemName}>Claude</span>
                </button>

                {/* Gemini */}
                <button
                  onClick={() => {
                    handleCopy(displayCompletion);
                    window.open("https://gemini.google.com/", "_blank");
                    toast.success(`${t.toasts.copied} - Gemini נפתח!`);
                  }}
                  className={cn(styles.gemBtn, styles.gemGemini)}
                  aria-label="Gemini"
                >
                  <div className={styles.gemIcon}>
                    <GeminiIcon className="w-[18px] h-[18px]" />
                  </div>
                  <span className={styles.gemName}>Gemini</span>
                </button>

                {/* Separator */}
                <div className={styles.vsep} aria-hidden />

                {/* WhatsApp — icon only */}
                <button
                  onClick={() => {
                    const text = encodeURIComponent(
                      displayCompletion + "\n\n- נוצר עם Peroot | www.peroot.space",
                    );
                    window.open(`https://wa.me/?text=${text}`, "_blank");
                  }}
                  className={styles.waBtn}
                  aria-label="שתף בוואטסאפ"
                  title="שתף בוואטסאפ"
                >
                  <WhatsAppIcon className="w-[22px] h-[22px]" />
                </button>
              </div>
            </div>
          )}

          {/* ── Bottom bar ── */}
          <div className="p-3 bg-(--glass-bg) border-t border-(--glass-border) mt-auto">
            <div className="flex items-center justify-between gap-2 flex-wrap" dir="rtl">
              {/* Left: nav */}
              <div className="flex items-center gap-2">
                <button
                  onClick={onBack}
                  className={styles.btnBack}
                  aria-label={t.result_section.back_to_edit}
                >
                  <ChevronRight className="w-[14px] h-[14px]" style={{ opacity: 0.65 }} />
                  {t.result_section.back_to_edit}
                </button>
                <button
                  onClick={() => setShowMorePanel((v) => !v)}
                  className={cn(styles.moreBtn, showMorePanel && styles.moreBtnOpen)}
                  aria-expanded={showMorePanel}
                  aria-label="עוד אפשרויות"
                >
                  <MoreHorizontal className="w-[13px] h-[13px]" />
                  <span className={styles.moreBtnLabel}>&nbsp;עוד אפשרויות</span>
                </button>
              </div>
              {/* Right: actions */}
              <div className="flex items-center gap-2">
                {onImproveAgain && (
                  <button
                    onClick={() => setShowRefineConfirm(true)}
                    className={styles.btnRefine}
                    aria-label="שפר שוב"
                    disabled={isLoading}
                  >
                    <Pencil className="w-[15px] h-[15px]" />
                  </button>
                )}
                <button
                  onClick={() => handleCopy(displayCompletion)}
                  className={styles.btnCopy}
                  disabled={isLoading}
                  aria-label={copied ? t.result_section.copied : t.result_section.copy_button}
                >
                  {copied ? (
                    <Check className="w-[16px] h-[16px]" />
                  ) : (
                    <Copy className="w-[16px] h-[16px]" />
                  )}
                  {copied ? t.result_section.copied : t.result_section.copy_button}
                </button>
              </div>
            </div>

            {/* Quick refine actions */}
            {onQuickRefine && completion.trim() && !isLoading && (
              <div
                className="flex flex-col gap-2 pt-2 mt-2 border-t border-(--glass-border)"
                dir="rtl"
              >
                <span className="text-[10px] font-medium text-(--text-muted)">
                  דלתות מהירות — שיפור על בסיס התוצאה:
                </span>
                <div className="flex flex-wrap gap-2">
                  {QUICK_REFINE_ACTIONS.map((action) => (
                    <button
                      key={action.id}
                      type="button"
                      onClick={() => {
                        trackFeatureUse(`quick_refine_${action.id}`);
                        onQuickRefine(action.instruction);
                      }}
                      className="text-xs px-3 py-1.5 rounded-lg border border-amber-500/30 bg-amber-500/5 text-amber-800 dark:text-amber-200 hover:bg-amber-500/15 transition-colors cursor-pointer min-h-[36px]"
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Pro watermark toggle */}
            {isPro && (
              <div className="flex items-center justify-end gap-2 pt-1" dir="rtl">
                <label className="flex items-center gap-2 cursor-pointer select-none group min-h-[44px] px-2 -mx-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5">
                  <input
                    type="checkbox"
                    checked={proWatermarkEnabled}
                    onChange={(e) => setProWatermarkEnabled(e.target.checked)}
                    className="w-3.5 h-3.5 accent-amber-400 cursor-pointer"
                  />
                  <span className="text-[10px] text-(--text-muted) group-hover:text-(--text-secondary) transition-colors">
                    העתק עם מיתוג Peroot
                  </span>
                </label>
              </div>
            )}
          </div>

          {/* ── More panel (slides below card bottom) ── */}
          <div
            className={cn(styles.morePanel, showMorePanel && styles.morePanelOpen)}
            data-testid="more-panel"
          >
            <div className={styles.morePanelLabel}>עוד אפשרויות</div>

            {onSaveAsFavorite && (
              <button onClick={onSaveAsFavorite} className={styles.mpItem}>
                <Star className="w-[14px] h-[14px]" style={{ opacity: 0.5 }} />
                שמור במועדפים
              </button>
            )}

            <button
              onClick={() => {
                if (!savedToLibrary) {
                  onSave();
                  setSavedToLibrary(true);
                }
              }}
              className={cn(styles.mpItem, savedToLibrary && styles.mpItemDisabled)}
              data-testid="more-save-library"
              aria-disabled={savedToLibrary}
            >
              <BookOpen className="w-[14px] h-[14px]" style={{ opacity: 0.5 }} />
              {savedToLibrary ? (
                <>
                  שמור בספריה <span className={styles.savedBadge}>✓ נשמר</span>
                </>
              ) : (
                "שמור בספריה"
              )}
            </button>

            {onShare && (
              <button onClick={onShare} className={styles.mpItem}>
                <Share2 className="w-[14px] h-[14px]" style={{ opacity: 0.5 }} />
                שתף קישור
              </button>
            )}

            {onSaveAsTemplate && (
              <button onClick={onSaveAsTemplate} className={styles.mpItem}>
                <Copy className="w-[14px] h-[14px]" style={{ opacity: 0.5 }} />
                שמור כתבנית
              </button>
            )}

            {onReset && (
              <button onClick={onReset} className={cn(styles.mpItem, styles.mpItemDanger)}>
                <RotateCcw className="w-[14px] h-[14px]" style={{ opacity: 0.5 }} />
                לאפס הכל
              </button>
            )}
          </div>
        </div>

        {/* Referral Share CTA - floating popup, rendered via portal-like fixed position */}
        {!isLoading && completion && <ReferralShareCTA isAuthenticated={isAuthenticated} />}

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
          <div className="glass-card p-5 rounded-xl border-(--glass-border) bg-(--glass-bg) flex flex-col gap-4 h-fit lg:w-72">
            <div className="flex items-start gap-2 pb-3 border-b border-(--glass-border)">
              <div className="bg-sky-500/20 text-sky-700 dark:text-sky-300 p-1.5 rounded-md mt-0.5">
                <Plus className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-(--text-primary)">
                    {t.result_section.variables_title}
                  </span>
                  <span
                    className="cursor-help text-(--text-muted) hover:text-(--text-secondary) transition-colors"
                    title="כל שדה מחליף את החלון הצבוע המתאים בתוך הפרומפט. הפרומפט מתעדכן בזמן אמת. אפשר לדלג על שדות — הם יישארו כפלייסהולדר עד שתמלא אותם."
                    aria-label="הסבר על משתנים"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                  </span>
                </div>
                <p className="text-[10px] text-(--text-muted) mt-0.5 leading-relaxed">
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
                  <div key={i} className="space-y-1.5" data-var-key={ph} {...hoverHandlers}>
                    <label
                      className="text-xs font-medium ms-1 flex items-center justify-between gap-2"
                      dir="rtl"
                    >
                      <span className="text-(--text-primary) truncate" title={ph}>
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
                        "w-full border rounded-lg py-2.5 px-3 text-sm text-(--text-primary) focus:outline-none transition-all placeholder:text-(--text-muted)",
                        isFilled
                          ? "bg-emerald-500/4 dark:bg-emerald-400/4 border-emerald-500/40 dark:border-emerald-400/40 focus:border-emerald-500/60"
                          : isPreFilled
                            ? "bg-amber-500/5 dark:bg-amber-500/3 border-amber-500/20 focus:border-amber-500/50"
                            : "bg-black/5 dark:bg-black/40 border-(--glass-border) focus:border-sky-500/50",
                        isHovered &&
                          (isFilled
                            ? "ring-2 ring-emerald-500/40 dark:ring-emerald-400/40"
                            : "ring-2 ring-sky-500/40 dark:ring-sky-400/40"),
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
            <div
              className="flex items-center justify-around pt-3 mt-1 border-t border-(--glass-border) text-[10px] text-(--text-muted)"
              aria-label="מקרא מצבים"
            >
              <div
                className="flex items-center gap-1.5"
                title="משתנה שעדיין לא מולא — מופיע כתווית כחולה בפרומפט"
              >
                <span
                  className="w-2.5 h-2.5 rounded-sm bg-sky-500/15 border border-sky-500/50"
                  aria-hidden="true"
                />
                <span>ריק</span>
              </div>
              <div
                className="flex items-center gap-1.5"
                title="משתנה שמילאת — מופיע כהדגשה ירוקה בפרומפט"
              >
                <span
                  className="w-2.5 h-2.5 rounded-sm bg-emerald-500/15 border border-emerald-500/50"
                  aria-hidden="true"
                />
                <span>מלא</span>
              </div>
              <div
                className="flex items-center gap-1.5"
                title="ערך שנטען אוטומטית מפרומפט קודם שלך"
              >
                <span
                  className="w-2.5 h-2.5 rounded-sm bg-amber-500/15 border border-amber-500/50"
                  aria-hidden="true"
                />
                <span>היסטוריה</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* P3 — Score breakdown drawer. Opens on ScoreDelta click. */}
      <ScoreBreakdownDrawer
        isOpen={breakdownScore !== null}
        onClose={() => setBreakdownScore(null)}
        score={breakdownScore}
        isPostUpgrade
        title={
          capabilityMode === CapabilityMode.IMAGE_GENERATION
            ? "ציון פרומפט התמונה"
            : capabilityMode === CapabilityMode.VIDEO_GENERATION
              ? "ציון פרומפט הווידאו"
              : "ציון הפרומפט"
        }
      />

      {/* ── Credit confirmation popup ── */}
      {showRefineConfirm && (
        <div
          className={styles.popupOverlay}
          role="dialog"
          aria-modal="true"
          aria-label="אישור שיפור נוסף"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowRefineConfirm(false);
          }}
        >
          <div className={styles.popup} data-testid="credit-popup">
            <div className={styles.popupHeader}>
              <div className={styles.popupIconWrap}>
                <Pencil />
              </div>
              <div>
                <div className={styles.popupTitle}>לשפר את הפרומפט שוב?</div>
                <div className={styles.popupSub}>שיפור נוסף ישתמש בקרדיט אחד</div>
              </div>
            </div>
            <div className={styles.popupBody}>
              Peroot תריץ סבב שיפור נוסף על הפרומפט הנוכחי ותייצר גרסה משופרת חדשה.
              {creditsLeft !== undefined && (
                <div className={styles.creditRow}>
                  <div className={styles.creditIconWrap}>
                    <RotateCcw />
                  </div>
                  <div className={styles.creditText}>
                    <span>קרדיט אחד</span> יצרף לשיפור זה
                    <small>נותרו לך {creditsLeft} קרדיטים היום</small>
                  </div>
                </div>
              )}
            </div>
            <div className={styles.popupActions}>
              <button className={styles.popCancel} onClick={() => setShowRefineConfirm(false)}>
                ביטול
              </button>
              <button
                className={styles.popConfirm}
                onClick={() => {
                  setShowRefineConfirm(false);
                  onImproveAgain?.();
                }}
              >
                שפר שוב ✓
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
