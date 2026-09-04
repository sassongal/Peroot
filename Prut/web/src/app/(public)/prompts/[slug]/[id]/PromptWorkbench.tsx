"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { setPendingPrompt } from "@/lib/pending-prompt";
import { trackLibraryUse } from "@/lib/analytics";
import { getVariablePlaceholder, substituteVariables } from "@/lib/variable-utils";
import { PromptBodyGate } from "./PromptBodyGate";
import { sendUsageSignal, USAGE_SOURCE } from "./usage-signal";
import { countFilled, filledPhrase, splitPromptSegments } from "./prompt-detail-utils";

interface Props {
  promptId: string;
  title: string;
  slug: string;
  capabilityMode: string | null;
  fullText: string;
  /** Field names in order of first appearance. Empty for prompts without fields. */
  variables: string[];
}

const INPUT_CLASSES =
  "w-full min-h-[44px] rounded-[14px] border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:border-amber-500/40";

/**
 * The interactive half of the prompt page: one input per field, the prompt
 * body as a live preview, and the page's single gold action.
 *
 * The CTA hands the SUBSTITUTED text to the home page. When every field is
 * filled it goes in as a plain prompt (straight to enhance); when some are
 * still empty it goes in as a template so the home page's variables panel
 * picks up the rest. Mobile reads body first, then the fields; on wide
 * screens the fields sit in a sticky aside next to the body.
 */
export function PromptWorkbench({
  promptId,
  title,
  slug,
  capabilityMode,
  fullText,
  variables,
}: Props) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>({});

  const substituted = useMemo(() => substituteVariables(fullText, values), [fullText, values]);
  const segments = useMemo(() => splitPromptSegments(fullText, values), [fullText, values]);
  const hasFields = variables.length > 0;
  const filled = countFilled(variables, values);
  const allFilled = hasFields && filled === variables.length;

  const handleEnhance = () => {
    trackLibraryUse(promptId, title);
    sendUsageSignal(promptId, "enhance", substituted.length);
    setPendingPrompt({
      id: promptId,
      title,
      prompt: substituted,
      category: slug,
      // A fully filled prompt is ready to enhance; a partly filled one is
      // still a template so the home page asks for the remaining fields.
      is_template: hasFields && !allFilled,
      capability_mode: capabilityMode ?? undefined,
      source: USAGE_SOURCE,
    });
    router.push("/?utm_source=library-prompt");
  };

  const handleCopy = () => sendUsageSignal(promptId, "copy", substituted.length);

  const ctaLabel = hasFields ? "מלאו ושדרגו בפירוט" : "שדרגו בפירוט";

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-6 lg:items-start">
      <PromptBodyGate
        segments={segments}
        substitutedText={substituted}
        capabilityMode={capabilityMode}
        onCopy={handleCopy}
      />

      <aside
        className="mt-6 lg:mt-0 lg:sticky lg:top-24 rounded-2xl border border-border bg-card p-5"
        aria-labelledby="workbench-heading"
        id="workbench"
      >
        {hasFields ? (
          <>
            <h2 id="workbench-heading" className="text-base font-semibold text-foreground">
              מלאו את השדות
            </h2>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              כל ערך שתקלידו נכנס לפרומפט מיד. שדות שנשארו ריקים מסומנים בכתום ואפשר להשלים אותם גם
              אחרי השדרוג.
            </p>

            <div className="mt-4 space-y-3">
              {variables.map((name, i) => {
                const inputId = `prompt-field-${i}`;
                return (
                  <div key={name}>
                    <label
                      htmlFor={inputId}
                      className="block text-xs font-medium text-secondary-foreground mb-1"
                      dir="auto"
                    >
                      {name}
                    </label>
                    <input
                      id={inputId}
                      type="text"
                      dir="auto"
                      autoComplete="off"
                      value={values[name] ?? ""}
                      placeholder={getVariablePlaceholder(name)}
                      onChange={(e) => setValues((prev) => ({ ...prev, [name]: e.target.value }))}
                      className={INPUT_CLASSES}
                    />
                  </div>
                );
              })}
            </div>

            <p
              className="mt-3 text-xs text-muted-foreground tabular-nums"
              aria-live="polite"
              data-testid="filled-count"
            >
              {filledPhrase(filled, variables.length)}
            </p>
          </>
        ) : (
          <>
            <h2 id="workbench-heading" className="text-base font-semibold text-foreground">
              שדרגו את הפרומפט הזה
            </h2>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              הפרומפט עובר לדף הבית ומקבל מבנה מקצועי, הקשר מדויק ודירוג איכות, מותאם למודל שתבחרו.
            </p>
          </>
        )}

        <Button size="lg" onClick={handleEnhance} className="mt-4 w-full text-sm">
          <Zap className="w-4 h-4" aria-hidden="true" />
          {ctaLabel}
        </Button>
        <p className="mt-2 text-[11px] text-muted-foreground text-center">
          חינם, בלי הרשמה, ב-ChatGPT, Claude ו-Gemini
        </p>
      </aside>
    </div>
  );
}
