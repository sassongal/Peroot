"use client";

import { useState, useEffect, useRef } from "react";
import { X, Play, ChevronLeft, Check, Copy, ArrowDown, Search, FileText, Image, Video, Bot, RotateCcw, ExternalLink, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { PromptChain } from "@/hooks/useChains";
import { buildChainShareUrl } from "@/lib/chains/share-url";
import { toast } from "sonner";
import { trackChainRun } from "@/lib/analytics";

const MODE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  text: FileText,
  research: Search,
  image: Image,
  video: Video,
  agent: Bot,
};

interface ChainRunnerProps {
  chain: PromptChain;
  onClose: () => void;
  onUseStep: (promptText: string) => void;
}

export function ChainRunner({ chain, onClose, onUseStep }: ChainRunnerProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [stepOutputs, setStepOutputs] = useState<Record<number, string>>({});
  const chainCompleteTracked = useRef(false);

  const allCompleted =
    chain.steps.length > 0 && completedSteps.size === chain.steps.length;
  useEffect(() => {
    if (allCompleted && !chainCompleteTracked.current) {
      chainCompleteTracked.current = true;
      trackChainRun(chain.id, chain.steps.length);
    }
  }, [allCompleted, chain.id, chain.steps.length]);

  const step = chain.steps[currentStep];
  if (!step) return null;

  const markCompleteAndNext = () => {
    setCompletedSteps(prev => new Set([...prev, currentStep]));
    if (currentStep < chain.steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("הועתק!");
    } catch {
      toast.error("שגיאה בהעתקה");
    }
  };

  // Reset the runner back to step 0 with clean state. Lets the user re-run
  // the same chain without closing the drawer (e.g. to try different
  // variable values or different outputs at each step).
  const handleReset = () => {
    setCurrentStep(0);
    setCompletedSteps(new Set());
    setStepOutputs({});
    chainCompleteTracked.current = false;
    toast.success("השרשרת אופסה");
  };

  // Share: encode the chain into a self-contained URL and copy it. The
  // receiver opens the link, HomeClient decodes `?chain=...` on mount,
  // and offers to import. No backend needed for the MVP — the full
  // payload lives in the URL itself (base64url).
  const handleShare = async () => {
    try {
      const url = buildChainShareUrl(chain);
      // Prefer native share sheet on mobile (iOS/Android), fall back to
      // clipboard on desktop so the user can paste into chat/email.
      if (typeof navigator !== 'undefined' && 'share' in navigator) {
        try {
          await navigator.share({
            title: `שרשרת: ${chain.title}`,
            text: chain.description || 'שרשרת פרומפטים מ-Peroot',
            url,
          });
          return;
        } catch {
          // User cancelled — fall through to clipboard copy.
        }
      }
      await navigator.clipboard.writeText(url);
      toast.success('קישור לשיתוף הועתק ללוח');
    } catch {
      toast.error('שיתוף נכשל');
    }
  };

  // Open the resolved prompt in an external LLM in a new tab. ChatGPT and
  // Claude both accept a `?q=` style deep-link but use different query
  // param names. We fall back to URL-encoded clipboard + toast when the
  // platform doesn't support a prompt deep-link (e.g. Gemini).
  const openInLLM = (target: 'chatgpt' | 'claude' | 'gemini', text: string) => {
    const encoded = encodeURIComponent(text);
    let url: string | null = null;
    if (target === 'chatgpt') {
      url = `https://chat.openai.com/?q=${encoded}`;
    } else if (target === 'claude') {
      url = `https://claude.ai/new?q=${encoded}`;
    } else if (target === 'gemini') {
      url = `https://gemini.google.com/app`;
      // Gemini doesn't accept a prefill param — copy + open
      void navigator.clipboard.writeText(text);
      toast.success("הפרומפט הועתק — הדבק ב-Gemini");
    }
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  // Bulk-launch all steps at once. We stagger window.open by 150ms per
  // tab because most browsers throttle rapid bulk popups and only open
  // the first one. For the ChatGPT/Claude URL-query case this gives the
  // user one tab per step with the resolved prompt pre-filled. For
  // Gemini we fall back to concatenating all steps into clipboard and
  // opening a single tab, since Gemini has no query param.
  const openAllStepsInLLM = (target: 'chatgpt' | 'claude' | 'gemini') => {
    if (target === 'gemini') {
      const all = chain.steps
        .map((_, i) => `## שלב ${i + 1}\n${getResolvedPrompt(i)}`)
        .join('\n\n---\n\n');
      void navigator.clipboard.writeText(all);
      window.open('https://gemini.google.com/app', '_blank', 'noopener,noreferrer');
      toast.success('כל השלבים הועתקו — הדבק ב-Gemini');
      return;
    }
    chain.steps.forEach((_, i) => {
      const encoded = encodeURIComponent(getResolvedPrompt(i));
      const url = target === 'chatgpt'
        ? `https://chat.openai.com/?q=${encoded}`
        : `https://claude.ai/new?q=${encoded}`;
      setTimeout(() => {
        window.open(url, '_blank', 'noopener,noreferrer');
      }, i * 150);
    });
    toast.success(`נפתחים ${chain.steps.length} טאבים ב-${target === 'chatgpt' ? 'ChatGPT' : 'Claude'}`);
  };

  // Build the prompt with variable substitution and previous output injection
  const getResolvedPrompt = (stepIndex: number): string => {
    const s = chain.steps[stepIndex];
    let prompt = s.prompt_text;

    // Inject previous step output if this step has input_from_step
    if (s.input_from_step && s.input_from_step > 0) {
      const sourceIdx = s.input_from_step - 1;
      const sourceOutput = stepOutputs[sourceIdx];
      if (sourceOutput) {
        prompt = `${prompt}\n\n---\nפלט שלב ${s.input_from_step}:\n${sourceOutput}`;
      }
    }

    return prompt;
  };

  const resolvedPrompt = getResolvedPrompt(currentStep);
  const ModeIcon = step.mode ? MODE_ICONS[step.mode] || FileText : FileText;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl max-h-[80vh] overflow-y-auto bg-[#0f0f0f] border border-(--glass-border) rounded-2xl p-6 mx-4"
        dir="rtl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-(--text-primary)">{chain.title}</h3>
            {chain.description && (
              <p className="text-xs text-(--text-muted) mt-1">{chain.description}</p>
            )}
          </div>
          <div className="flex items-center gap-1">
            {completedSteps.size > 0 && (
              <button
                onClick={handleReset}
                className="p-2 rounded-full hover:bg-(--glass-bg) text-(--text-muted) transition-colors"
                title="אפס שרשרת"
                aria-label="אפס שרשרת והתחל מחדש"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={handleShare}
              className="p-2 rounded-full hover:bg-(--glass-bg) text-(--text-muted) transition-colors"
              title="שתף שרשרת"
              aria-label="העתק קישור לשיתוף"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-(--glass-bg) text-(--text-muted) transition-colors"
              aria-label="סגור"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-2">
          {chain.steps.map((s, i) => (
            <div key={s.id} className="flex items-center">
              <button
                onClick={() => setCurrentStep(i)}
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors border",
                  i === currentStep
                    ? "bg-amber-500/20 border-amber-500/40 text-amber-400"
                    : completedSteps.has(i)
                    ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
                    : "bg-(--glass-bg) border-(--glass-border) text-(--text-muted)"
                )}
                title={s.title}
              >
                {completedSteps.has(i) ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </button>
              {i < chain.steps.length - 1 && (
                <ArrowDown className="w-3 h-3 text-slate-600 mx-1 -rotate-90" />
              )}
            </div>
          ))}
        </div>

        {/* Current Step Content */}
        <div className="border border-amber-500/20 rounded-xl p-5 bg-amber-500/2">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
              שלב {currentStep + 1} מתוך {chain.steps.length}
            </span>
            <ModeIcon className="w-3.5 h-3.5 text-(--text-muted)" />
            <span className="text-sm font-medium text-(--text-primary)">{step.title}</span>
          </div>

          {/* Output description */}
          {step.output_description && (
            <p className="text-[11px] text-slate-500 mb-2">
              פלט צפוי: {step.output_description}
            </p>
          )}

          {/* Variables (step 1 typically) */}
          {step.variables && step.variables.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {step.variables.map((v, vi) => (
                <span key={vi} className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400">
                  {v.label || v.name}{v.default ? `: ${v.default}` : ""}
                </span>
              ))}
            </div>
          )}

          <p className="text-sm text-(--text-secondary) leading-relaxed whitespace-pre-wrap">
            {resolvedPrompt}
          </p>
        </div>

        {/* Step Output from previous */}
        {currentStep > 0 && stepOutputs[currentStep - 1] && (
          <div className="mt-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
            <div className="text-[10px] text-emerald-400 uppercase tracking-wider mb-1">פלט שלב קודם</div>
            <p className="text-xs text-(--text-muted) line-clamp-3">{stepOutputs[currentStep - 1]}</p>
          </div>
        )}

        {completedSteps.has(currentStep) && (
          <div className="mt-3">
            <label className="text-[10px] text-(--text-muted) uppercase tracking-wider">הדבק את הפלט של שלב זה (אופציונלי — יוזרק לשלב הבא):</label>
            <textarea
              value={stepOutputs[currentStep] || ""}
              onChange={e => setStepOutputs(prev => ({ ...prev, [currentStep]: e.target.value }))}
              placeholder="הדבק כאן את התוצאה..."
              className="w-full mt-1 h-20 bg-black/5 dark:bg-black/30 border border-(--glass-border) rounded-lg px-3 py-2 text-xs text-(--text-secondary) placeholder:text-slate-600 focus:outline-none focus:border-amber-500/20 resize-none"
            />
          </div>
        )}

        {/* All completed summary */}
        {allCompleted && (
          <div className="mt-4 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Check className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-medium text-emerald-400">השרשרת הושלמה!</span>
            </div>
            {Object.keys(stepOutputs).length > 0 && (
              <button
                onClick={() => {
                  const allOutputs = chain.steps
                    .map((s, i) => stepOutputs[i] ? `## ${s.title}\n${stepOutputs[i]}` : null)
                    .filter(Boolean)
                    .join("\n\n---\n\n");
                  handleCopy(allOutputs);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs hover:bg-emerald-500/20 transition-colors mt-2"
              >
                <Copy className="w-3 h-3" />
                העתק את כל הפלטים
              </button>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-3 mt-5">
          <button
            onClick={() => {
              onUseStep(resolvedPrompt);
              onClose();
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-black text-sm font-medium hover:bg-slate-200 transition-colors"
          >
            <Play className="w-3.5 h-3.5" />
            השתמש בפרומפט
          </button>
          <button
            onClick={() => handleCopy(resolvedPrompt)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-(--glass-border) text-(--text-secondary) text-sm hover:bg-(--glass-bg) transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            העתק
          </button>
          {!allCompleted && (
            <button
              onClick={markCompleteAndNext}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-500/20 text-emerald-400 text-sm hover:bg-emerald-500/10 transition-colors me-auto"
            >
              {currentStep < chain.steps.length - 1 ? (
                <>
                  <ChevronLeft className="w-3.5 h-3.5" />
                  סיים ועבור לשלב הבא
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  סיים שרשרת
                </>
              )}
            </button>
          )}
        </div>

        {/* LLM quick-launchers — open the current step's resolved prompt
            directly in ChatGPT / Claude / Gemini in a new tab. Gemini
            lacks a deep-link prefill, so we copy and toast a hint. */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-(--glass-border)">
          <span className="text-[10px] text-(--text-muted) uppercase tracking-wider shrink-0">פתח שלב זה ב:</span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => openInLLM('chatgpt', resolvedPrompt)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-(--glass-border) text-(--text-secondary) text-xs hover:bg-(--glass-bg) transition-colors"
              title="פתח ב-ChatGPT"
            >
              <ExternalLink className="w-3 h-3" />
              ChatGPT
            </button>
            <button
              onClick={() => openInLLM('claude', resolvedPrompt)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-(--glass-border) text-(--text-secondary) text-xs hover:bg-(--glass-bg) transition-colors"
              title="פתח ב-Claude"
            >
              <ExternalLink className="w-3 h-3" />
              Claude
            </button>
            <button
              onClick={() => openInLLM('gemini', resolvedPrompt)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-(--glass-border) text-(--text-secondary) text-xs hover:bg-(--glass-bg) transition-colors"
              title="העתק ופתח Gemini"
            >
              <ExternalLink className="w-3 h-3" />
              Gemini
            </button>
          </div>
        </div>

        {/* Bulk launcher — open all resolved steps at once. For
            ChatGPT/Claude this opens one tab per step (staggered to
            avoid popup throttling). For Gemini it concatenates into
            clipboard and opens a single tab. */}
        {chain.steps.length > 1 && (
          <div className="flex items-center gap-2 mt-3">
            <span className="text-[10px] text-(--text-muted) uppercase tracking-wider shrink-0">פתח את כל השלבים ב:</span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => openAllStepsInLLM('chatgpt')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-500/20 bg-amber-500/5 text-amber-300 text-xs hover:bg-amber-500/15 transition-colors"
                title={`פתח ${chain.steps.length} טאבים ב-ChatGPT`}
              >
                <ExternalLink className="w-3 h-3" />
                ChatGPT ×{chain.steps.length}
              </button>
              <button
                onClick={() => openAllStepsInLLM('claude')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-500/20 bg-amber-500/5 text-amber-300 text-xs hover:bg-amber-500/15 transition-colors"
                title={`פתח ${chain.steps.length} טאבים ב-Claude`}
              >
                <ExternalLink className="w-3 h-3" />
                Claude ×{chain.steps.length}
              </button>
              <button
                onClick={() => openAllStepsInLLM('gemini')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-500/20 bg-amber-500/5 text-amber-300 text-xs hover:bg-amber-500/15 transition-colors"
                title="העתק הכל ופתח Gemini"
              >
                <ExternalLink className="w-3 h-3" />
                Gemini (הכל)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
