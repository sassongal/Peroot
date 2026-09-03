"use client";

import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatGPTIcon, ClaudeIcon, GeminiIcon } from "@/components/ui/AIPlatformIcons";
import { trackSentToModel } from "@/lib/analytics";
import { markFeatureUsed } from "@/hooks/useFeatureDiscovery";
import {
  HANDOFF_ORDER,
  HANDOFF_TARGETS,
  handoffMessage,
  handoffTargetForModel,
  planModelHandoff,
  type HandoffTarget,
} from "@/lib/model-handoff";

/**
 * "שגר למודל" — one row of model buttons that hands the finished prompt to
 * the chosen model with the text already in its composer.
 *
 * Used on every surface where a finished prompt is shown: the result area,
 * the public prompt pages, and the share page. Guests get it too — it costs
 * no credit and it is the moment the product proves itself.
 */

const ICONS: Partial<Record<HandoffTarget, React.ComponentType<{ className?: string }>>> = {
  chatgpt: ChatGPTIcon,
  claude: ClaudeIcon,
  gemini: GeminiIcon,
};

interface SendToModelBarProps {
  prompt: string;
  /** Which surface fired it — becomes the `from` property on the KPI event. */
  from: string;
  /** The model the prompt was tuned for; gets the "מותאם עבורך" badge. */
  targetModel?: string | null;
  /** Copy handler for the fallback path; defaults to the clipboard API. */
  onCopy?: (text: string) => void;
  className?: string;
}

export function SendToModelBar({
  prompt,
  from,
  targetModel,
  onCopy,
  className,
}: SendToModelBarProps) {
  const tuned = handoffTargetForModel(targetModel);
  // The tuned model leads the row — it is the one this prompt was written for.
  const order = tuned ? [tuned, ...HANDOFF_ORDER.filter((t) => t !== tuned)] : HANDOFF_ORDER;

  const launch = async (target: HandoffTarget) => {
    const plan = planModelHandoff(target, prompt);
    trackSentToModel(target, plan.prefilled ? "prefilled" : "copied", from);
    markFeatureUsed("peroot_used_handoff");
    if (!plan.prefilled) {
      // Copy BEFORE opening so the paste target is ready, and surface a real
      // error instead of a success toast the clipboard never earned.
      try {
        if (onCopy) onCopy(prompt);
        else await navigator.clipboard.writeText(prompt);
      } catch {
        toast.error("ההעתקה נכשלה, העתיקו ידנית מהתיבה למעלה");
        return;
      }
    }
    window.open(plan.url, "_blank", "noopener,noreferrer");
    toast.success(handoffMessage(plan));
  };

  return (
    <div className={cn("flex flex-col gap-2", className)} dir="rtl">
      <span className="text-[11px] text-(--text-muted) uppercase tracking-widest px-1">
        שגר למודל
      </span>
      <div className="flex items-center gap-2 flex-wrap">
        {order.map((target) => {
          const Icon = ICONS[target];
          const isTuned = target === tuned;
          return (
            <button
              key={target}
              type="button"
              onClick={() => launch(target)}
              aria-label={`שגר ל-${HANDOFF_TARGETS[target].name}`}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-lg border text-xs font-medium transition-colors cursor-pointer",
                isTuned
                  ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                  : "border-(--glass-border) bg-(--glass-bg) text-(--text-secondary) hover:text-(--text-primary) hover:bg-black/5 dark:hover:bg-white/5",
              )}
            >
              {Icon ? <Icon className="w-4 h-4 shrink-0" /> : null}
              <span className="whitespace-nowrap">{HANDOFF_TARGETS[target].name}</span>
              {isTuned && (
                <span className="flex items-center gap-1 text-[10px] opacity-90">
                  <Sparkles className="w-3 h-3" />
                  מותאם עבורך
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
